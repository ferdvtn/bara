"use client";

import { useEffect, useState } from "react";
import { getNextMilestone } from "@/utils/milestones";
import { getDayOfYear, getTodayLocal } from "@/utils/dates";
import DurationOverlay from "./DurationOverlay";
import ConfirmationToast from "./ConfirmationToast";
import MilestoneCelebration from "./MilestoneCelebration";
import SettingsOverlay from "./SettingsOverlay";
import {
  Dumbbell,
  PersonStanding,
  Activity,
  Footprints,
  Zap,
  Flame,
  CheckCircle2,
  AlertCircle,
  Heart,
  HeartCrack,
  HeartOff,
  Settings,
  Trophy,
} from "lucide-react";

interface HomeScreenProps {
  getAuthHeaders: () => Record<string, string>;
  onLogout: () => void;
  onStateChange?: () => void;
}

interface HomeState {
  current_streak: number;
  longest_streak: number;
  freeze_credits: number;
  last_active_date: string | null;
  sesi_hari_ini: number;
  streak_was_reset: boolean;
}

const IDENTITY_TEXTS = [
  "Orang yang bergerak tiap hari tidak menunggu mood.",
  "Kamu bukan orang yang skip. Buktikan hari ini.",
  "Konsistensi mengalahkan intensitas. Selalu.",
  "5 menit tetap terhitung. Mulai saja.",
  "Tubuh tidak peduli kamu lelah. Mulai 5 menit.",
  "Kebiasaan dibangun dari hari-hari biasa, bukan hari istimewa.",
];

export default function HomeScreen({
  getAuthHeaders,
  onLogout,
  onStateChange,
}: HomeScreenProps) {
  const [state, setState] = useState<HomeState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<
    "Push Up" | "Dumbbell" | "Lari" | "Jalan" | "Senam" | "Bulutangkis" | null
  >(null);
  const [isLogging, setIsLogging] = useState(false);
  const [toast, setToast] = useState<{
    activityType: string;
    duration: number;
    newStreak: number;
    streakReset: boolean;
  } | null>(null);
  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const today = getTodayLocal();
  const identityText = IDENTITY_TEXTS[getDayOfYear() % IDENTITY_TEXTS.length];

  useEffect(() => {
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchState() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/state", { headers: getAuthHeaders() });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as {
        current_streak: number;
        longest_streak: number;
        freeze_credits: number;
        last_active_date: string | null;
      };

      // Count today's sessions
      const statsRes = await fetch(`/api/stats?today_local=${today}`, {
        headers: getAuthHeaders(),
      });
      let sesi_hari_ini = 0;
      if (statsRes.ok) {
        // We infer from heatmap data
        const statsData = (await statsRes.json()) as {
          heatmap: { date: string; jumlah_sesi: number }[];
        };
        const todayData = statsData.heatmap.find((h) => h.date === today);
        sesi_hari_ini = todayData?.jumlah_sesi ?? 0;
      }

      setState({
        ...data,
        sesi_hari_ini,
        streak_was_reset: false,
      });
    } catch {
      // handle silently
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLog(duration: number) {
    if (!selectedActivity || isLogging) return;
    setIsLogging(true);
    setSelectedActivity(null);

    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          activity_type: selectedActivity,
          duration,
          today_local: today,
        }),
      });

      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as {
        success: boolean;
        streak_reset: boolean;
        state: {
          current_streak: number;
          longest_streak: number;
          freeze_credits: number;
          sesi_hari_ini: number;
        };
      };

      if (data.success) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                current_streak: data.state.current_streak,
                longest_streak: data.state.longest_streak,
                freeze_credits: data.state.freeze_credits,
                sesi_hari_ini: data.state.sesi_hari_ini,
                streak_was_reset: data.streak_reset,
              }
            : null,
        );

        setToast({
          activityType: selectedActivity,
          duration,
          newStreak: data.state.current_streak,
          streakReset: data.streak_reset,
        });
        
        if (onStateChange) onStateChange();
      }
    } catch {
      // handle silently
    } finally {
      setIsLogging(false);
    }
  }

  const nextMilestone = state ? getNextMilestone(state.current_streak) : null;
  const hasLoggedToday = (state?.sesi_hari_ini ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20 px-5 pt-4">
        <div className="max-w-md mx-auto space-y-5 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-6 w-24 bg-[#1a1a1a] rounded-md" />
              <div className="h-3 w-48 bg-[#1a1a1a] rounded-md" />
            </div>
            <div className="w-8 h-8 bg-[#1a1a1a] rounded-xl" />
          </div>
          <div className="h-32 bg-[#1a1a1a] rounded-3xl" />
          <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-md mx-auto px-5 pt-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 animate-fade-in">
          <div>
            <h2 className="font-mono text-lg font-bold text-[#f3f4f6]">
              Bara 🔥
            </h2>
            <p className="text-xs text-[#6b7280] mt-0.5 italic leading-relaxed">
              {identityText}
            </p>
          </div>
          <button
            id="btn-settings"
            onClick={() => setShowSettings(true)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#4b5563] hover:text-[#9ca3af] hover:border-[#3a3a3a] transition-all active:scale-95"
            aria-label="Pengaturan"
          >
            <Settings size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Recovery message after reset */}
        {state?.streak_was_reset && state.longest_streak > 1 && (
          <div className="card p-3 border-[#f59e0b]/20 bg-[#1a0f00]">
            <p className="text-xs text-[#f59e0b]">
              Rekormu: {state.longest_streak} hari. Streak baru dimulai.
            </p>
          </div>
        )}

        {/* B. Streak display */}
        <div className="card p-4 text-center animate-fade-in">
          <div className="font-mono text-6xl font-bold text-amber-glow animate-streak-glow leading-none">
            {state?.current_streak ?? 0}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[#9ca3af] text-sm mt-1.5">
            <Flame size={13} className="text-[#f59e0b]" />
            <span>hari beruntun</span>
          </div>
          {(state?.longest_streak ?? 0) > 0 && (
            <div className="text-[#6b7280] text-xs mt-1">
              Rekor: {state?.longest_streak} hari
            </div>
          )}
        </div>

        {/* C. Freeze credits */}
        <div className="card p-3 flex items-center gap-3">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => {
              const credits = state?.freeze_credits ?? 0;
              const filled = i < credits;
              const isLastHeart = credits === 1 && i === 0;
              const isEmpty = credits === 0;
              return (
                <span
                  key={i}
                  className={`transition-all ${
                    filled
                      ? isLastHeart
                        ? "text-[#ef4444] animate-pulse-heart"
                        : "text-[#ef4444]"
                      : "text-[#3a3a3a]"
                  }`}
                  aria-label={
                    filled ? "Freeze credit tersedia" : "Freeze credit habis"
                  }
                >
                  {isEmpty && i === 0 ? (
                    <HeartCrack size={24} strokeWidth={1.5} />
                  ) : filled ? (
                    <Heart size={24} strokeWidth={0} fill="currentColor" />
                  ) : (
                    <HeartOff size={24} strokeWidth={1.5} />
                  )}
                </span>
              );
            })}
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#9ca3af]">
              {state?.freeze_credits === 0
                ? "Nyawa habis — jangan skip!"
                : state?.freeze_credits === 1
                  ? "Sisa 1 nyawa — hati-hati!"
                  : `${state?.freeze_credits} freeze credit tersedia`}
            </p>
          </div>
        </div>

        {/* D. Milestone progress */}
        {nextMilestone && (state?.current_streak ?? 0) > 0 && (
          <div className="px-1">
            <p className="text-xs text-[#9ca3af] text-center">
              <span className="text-[#f59e0b] font-semibold">
                {nextMilestone - (state?.current_streak ?? 0)}
              </span>{" "}
              hari lagi menuju {nextMilestone}
              <Flame size={12} className="inline ml-0.5 text-[#f59e0b]" />
            </p>
            <div className="mt-2 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#b45309] to-[#f59e0b] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((state?.current_streak ?? 0) / nextMilestone) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* E. Status hari ini */}
        {hasLoggedToday ? (
          <div className="flex items-center gap-2 bg-[#0d1a0e] border border-[#22c55e]/30 rounded-2xl px-3 py-2">
            <CheckCircle2 size={15} className="text-[#22c55e] flex-shrink-0" />
            <span className="text-[#22c55e] text-sm font-medium">
              {state?.sesi_hari_ini} sesi hari ini
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#1a1500] border border-[#f59e0b]/30 rounded-2xl px-3 py-2">
            <AlertCircle size={16} className="text-[#fbbf24] flex-shrink-0" />
            <span className="text-[#fbbf24] text-sm">
              Belum ada aktivitas hari ini. 5 menit cukup.
            </span>
          </div>
        )}

        {/* F. Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="btn-push-up"
            onClick={() => setSelectedActivity("Push Up")}
            disabled={isLogging}
            className="btn-amber py-4 flex flex-col items-center gap-1.5 disabled:opacity-50"
          >
            <PersonStanding size={24} strokeWidth={2} />
            <span className="text-sm font-bold">Push Up</span>
          </button>
          <button
            id="btn-dumbbell"
            onClick={() => setSelectedActivity("Dumbbell")}
            disabled={isLogging}
            className="btn-amber py-4 flex flex-col items-center gap-1.5 disabled:opacity-50"
          >
            <Dumbbell size={24} strokeWidth={2} />
            <span className="text-sm font-bold">Dumbbell</span>
          </button>
          <button
            id="btn-lari"
            onClick={() => setSelectedActivity("Lari")}
            disabled={isLogging}
            className="btn-amber py-4 flex flex-col items-center gap-1.5 disabled:opacity-50"
          >
            <Activity size={24} strokeWidth={2} />
            <span className="text-sm font-bold">Lari</span>
          </button>
          <button
            id="btn-jalan"
            onClick={() => setSelectedActivity("Jalan")}
            disabled={isLogging}
            className="btn-amber py-4 flex flex-col items-center gap-1.5 disabled:opacity-50"
          >
            <Footprints size={24} strokeWidth={2} />
            <span className="text-sm font-bold">Jalan</span>
          </button>
          <button
            id="btn-senam"
            onClick={() => setSelectedActivity("Senam")}
            disabled={isLogging}
            className="btn-amber py-4 flex flex-col items-center gap-1.5 disabled:opacity-50"
          >
            <Zap size={24} strokeWidth={2} />
            <span className="text-sm font-bold">Senam</span>
          </button>
          <button
            id="btn-bulutangkis"
            onClick={() => setSelectedActivity("Bulutangkis")}
            disabled={isLogging}
            className="btn-amber py-4 flex flex-col items-center gap-1.5 disabled:opacity-50"
          >
            <Trophy size={24} strokeWidth={2} />
            <span className="text-sm font-bold">Bulutangkis</span>
          </button>
        </div>
      </div>

      {/* G. Duration overlay */}
      {selectedActivity && (
        <DurationOverlay
          activityType={selectedActivity}
          onSelect={handleLog}
          onClose={() => setSelectedActivity(null)}
          isLoading={isLogging}
        />
      )}

      {/* Toast */}
      {toast && (
        <ConfirmationToast
          activityType={toast.activityType}
          duration={toast.duration}
          newStreak={toast.newStreak}
          streakReset={toast.streakReset}
          onDismiss={() => setToast(null)}
          onMilestone={(streak) => {
            setToast(null);
            setMilestoneStreak(streak);
          }}
        />
      )}

      {/* Milestone celebration */}
      {milestoneStreak !== null && (
        <MilestoneCelebration
          streak={milestoneStreak}
          onDismiss={() => setMilestoneStreak(null)}
        />
      )}

      {/* Settings overlay */}
      {showSettings && (
        <SettingsOverlay
          getAuthHeaders={getAuthHeaders}
          onClose={() => setShowSettings(false)}
          onResetComplete={() => {
            // Refetch state to show zeroed data
            fetchState();
            if (onStateChange) onStateChange();
          }}
        />
      )}
    </div>
  );
}
