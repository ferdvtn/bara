"use client";

import { useEffect, useRef } from "react";
import { isMilestone, getMilestoneMessage } from "@/utils/milestones";
import { CheckCircle2 } from "lucide-react";

interface ConfirmationToastProps {
  activityType: string;
  duration: number;
  newStreak: number;
  streakReset: boolean;
  onDismiss: () => void;
  onMilestone: (streak: number) => void;
}

const IDENTITY_MESSAGES = [
  "Selesai. Ini yang membedakan kamu.",
  "Streak aman. Badan berterima kasih.",
  "Satu langkah lagi membentuk siapa kamu.",
  "Dilakukan. Lebih baik dari sempurna tapi tidak jadi.",
];

export default function ConfirmationToast({
  activityType,
  duration,
  newStreak,
  streakReset,
  onDismiss,
  onMilestone,
}: ConfirmationToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const randomMessage =
    IDENTITY_MESSAGES[Math.floor(Math.random() * IDENTITY_MESSAGES.length)];

  useEffect(() => {
    if (isMilestone(newStreak)) {
      // If milestone — dismiss quickly and trigger celebration
      timerRef.current = setTimeout(() => {
        onDismiss();
        onMilestone(newStreak);
      }, 1000);
    } else {
      timerRef.current = setTimeout(onDismiss, 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [newStreak, onDismiss, onMilestone]);

  return (
    <div className="fixed bottom-28 left-4 right-4 z-50 animate-slide-up">
      <div className="card p-4 border-[#f59e0b]/30 bg-[#1a1a1a]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <CheckCircle2
            size={22}
            className="text-[#22c55e] flex-shrink-0 mt-0.5"
            strokeWidth={2}
          />

          <div className="flex-1 min-w-0">
            {/* Activity + duration */}
            <p className="font-semibold text-[#f3f4f6] text-sm">
              {activityType} · {duration} menit
            </p>

            {/* Identity message */}
            <p className="text-xs text-[#9ca3af] mt-0.5">{randomMessage}</p>

            {/* Streak info */}
            {streakReset ? (
              <p className="text-xs text-[#f59e0b] mt-2 font-medium">
                Nyawa habis. Streak baru dimulai dari 1.
              </p>
            ) : (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-[#9ca3af]">Streak:</span>
                <span className="font-mono font-bold text-[#f59e0b] text-sm animate-count-up">
                  {newStreak} hari 🔥
                </span>
                {isMilestone(newStreak) && (
                  <span className="text-xs text-[#fcd34d]">
                    ✨ {getMilestoneMessage(newStreak).split(".")[0]}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
