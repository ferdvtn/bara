"use client";

import { useState, useEffect, useRef } from "react";
import { getTodayLocal, addDays, formatDateFull } from "@/utils/dates";
import Heatmap, { type HeatmapDay } from "./Heatmap";
import { Info, X, ChevronLeft, ChevronRight } from "lucide-react";

interface StatsScreenProps {
  getAuthHeaders: () => Record<string, string>;
  onLogout: () => void;
  currentStreak: number;
  longestStreak: number;
  isActive: boolean;
}

interface TodayLog {
  id: string;
  activity_type: string;
  duration: number;
  created_at: string;
}

interface StatsData {
  total_menit: number;
  today_menit: number;
  skor_disiplin: number;
  heatmap: HeatmapDay[];
  today_logs: TodayLog[];
  oldest_log_date: string;
}

function getDisciplineLabel(score: number): string {
  if (score >= 80) return "Konsistensi luar biasa";
  if (score >= 50) return "Di jalur yang benar";
  return "Masih ada ruang untuk tumbuh";
}

function getDisciplineColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#9ca3af";
}

interface MetricCardProps {
  label: string;
  value: string;
  tooltip: string;
  color?: string;
  sublabel?: string;
  sublabelColor?: string;
}

function MetricCard({ label, value, tooltip, color, sublabel, sublabelColor }: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="card p-4 relative">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider leading-tight">
          {label}
        </span>
        <button
          onClick={() => setShowTooltip((s) => !s)}
          className="text-[#4b5563] hover:text-[#9ca3af] flex-shrink-0 transition-colors"
          aria-label={`Info: ${label}`}
        >
          <Info size={13} strokeWidth={1.75} />
        </button>
      </div>

      <div
        className="font-mono text-3xl font-bold mt-2 leading-none"
        style={{ color: color ?? "#f3f4f6" }}
      >
        {value}
      </div>

      {sublabel && (
        <p className="text-[10px] mt-1" style={{ color: sublabelColor ?? "#9ca3af" }}>
          {sublabel}
        </p>
      )}

      {showTooltip && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-[#242424] border border-[#3a3a3a] rounded-2xl p-3 shadow-xl">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-[#f3f4f6]">{label}</span>
            <button
              onClick={() => setShowTooltip(false)}
              className="text-[#6b7280] hover:text-[#9ca3af]"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
          <p className="text-xs text-[#9ca3af] leading-relaxed">{tooltip}</p>
        </div>
      )}
    </div>
  );
}

export default function StatsScreen({ getAuthHeaders, onLogout, currentStreak, longestStreak, isActive }: StatsScreenProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [viewDate, setViewDate] = useState(getTodayLocal());
  const today = getTodayLocal();
  const lastFetchedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (isActive) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, viewDate]);

  async function fetchStats() {
    const isFirstLoad = !stats;
    const isDateChange = stats && viewDate !== lastFetchedDateRef.current;

    if (isFirstLoad) setIsLoading(true);
    else if (isDateChange) setIsNavigating(true);

    try {
      const res = await fetch(`/api/stats?today_local=${today}&view_date=${viewDate}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json() as StatsData;
      setStats(data);
      lastFetchedDateRef.current = viewDate;
    } catch {
      // handle silently
    } finally {
      setIsLoading(false);
      setIsNavigating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-24 px-5 pt-8">
        <div className="max-w-md mx-auto space-y-5 animate-pulse">
          <div className="space-y-2 mb-6">
            <div className="h-6 w-24 bg-[#1a1a1a] rounded-md" />
            <div className="h-3 w-48 bg-[#1a1a1a] rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
            <div className="h-24 bg-[#1a1a1a] rounded-3xl" />
          </div>
          <div className="h-64 bg-[#1a1a1a] rounded-3xl" />
        </div>
      </div>
    );
  }

  const disciplineLabel = getDisciplineLabel(stats?.skor_disiplin ?? 0);
  const disciplineColor = getDisciplineColor(stats?.skor_disiplin ?? 0);

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">

        {/* Header */}
        <div className="animate-fade-in">
          <h2 className="font-mono text-lg font-bold text-[#f3f4f6]">Statistik</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">Saat ini: {currentStreak} hari · Rekor: {longestStreak} hari</p>
        </div>

        {/* A. Metric cards grid */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <MetricCard
            label="Menit Hari Ini"
            value={String(stats?.today_menit ?? 0)}
            tooltip="Total durasi olahraga khusus untuk hari ini."
            color="#f59e0b"
          />
          <MetricCard
            label="Skor Disiplin"
            value={`${stats?.skor_disiplin ?? 0}%`}
            tooltip="Persentase hari aktif dalam 30 hari terakhir. Semakin tinggi, semakin konsisten."
            color={disciplineColor}
            sublabel={disciplineLabel}
            sublabelColor={disciplineColor}
          />
          <MetricCard
            label="Streak Saat Ini"
            value={String(currentStreak)}
            tooltip="Jumlah hari berturut-turut kamu aktif berolahraga."
            color="#f59e0b"
          />
          <MetricCard
            label="Rekor Terpanjang"
            value={String(longestStreak)}
            tooltip="Streak terpanjang yang pernah kamu capai sepanjang masa."
            color="#fbbf24"
          />
        </div>

        {/* B. Heatmap */}
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#f3f4f6]">
              Aktivitas 14 Minggu
            </h3>
          </div>
          {stats?.heatmap ? (
            <Heatmap data={stats.heatmap} today={today} />
          ) : (
            <p className="text-xs text-[#6b7280] text-center py-4">Belum ada data.</p>
          )}
        </div>

        {/* Discipline progress bar */}
        <div className="card p-4 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#6b7280]">Skor Disiplin (30 hari)</span>
            <span className="text-xs font-mono font-bold" style={{ color: disciplineColor }}>
              {stats?.skor_disiplin ?? 0}%
            </span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${stats?.skor_disiplin ?? 0}%`,
                background: `linear-gradient(90deg, #b45309, ${disciplineColor})`,
              }}
            />
          </div>
          <p className="text-[10px] mt-2" style={{ color: disciplineColor }}>
            {disciplineLabel}
          </p>
        </div>

        {/* C. Aktivitas */}
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#f3f4f6]">
              {viewDate === today ? "Aktivitas Hari Ini" : `Aktivitas ${formatDateFull(viewDate)}`}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewDate(prev => addDays(prev, -1))}
                disabled={stats?.oldest_log_date ? viewDate <= stats.oldest_log_date : false}
                className="p-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#6b7280] hover:text-[#f3f4f6] disabled:opacity-30 disabled:hover:text-[#6b7280] transition-colors"
                aria-label="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setViewDate(prev => addDays(prev, 1))}
                disabled={viewDate >= today}
                className="p-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#6b7280] hover:text-[#f3f4f6] disabled:opacity-30 disabled:hover:text-[#6b7280] transition-colors"
                aria-label="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {isNavigating ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-12 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]" />
              <div className="h-12 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]" />
            </div>
          ) : stats?.today_logs && stats.today_logs.length > 0 ? (
            <div className="space-y-2">
              {stats.today_logs.map((log) => (
                <div key={log.id} className="flex justify-between items-center bg-[#1a1a1a] rounded-xl px-3 py-2.5 border border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#f3f4f6] font-medium">{log.activity_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#f59e0b] font-bold">{log.duration} mnt</span>
                    <span className="text-[10px] text-[#6b7280]">
                      {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b7280] text-center py-2">Belum ada aktivitas pada hari ini.</p>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
