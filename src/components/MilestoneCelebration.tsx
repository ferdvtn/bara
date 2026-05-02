"use client";

import { useEffect, useRef } from "react";
import { getMilestoneMessage } from "@/utils/milestones";

interface MilestoneCelebrationProps {
  streak: number;
  onDismiss: () => void;
}

// Simple CSS confetti
function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#f59e0b", "#fbbf24", "#f97316", "#fef3c7", "#ef4444", "#22c55e"];
  const color = colors[index % colors.length];
  const left = `${(index * 7.3 + 5) % 95}%`;
  const delay = `${(index * 0.15) % 1.2}s`;
  const size = index % 3 === 0 ? 8 : index % 3 === 1 ? 6 : 10;

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: index % 2 === 0 ? "50%" : "2px",
        animation: `confetti-fall ${1.5 + (index % 5) * 0.3}s ease-in forwards`,
        animationDelay: delay,
        transform: `rotate(${index * 37}deg)`,
      }}
    />
  );
}

export default function MilestoneCelebration({
  streak,
  onDismiss,
}: MilestoneCelebrationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  const message = getMilestoneMessage(streak);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f0f]/95 cursor-pointer overflow-hidden"
      onClick={onDismiss}
      role="dialog"
      aria-label="Perayaan milestone"
    >
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 25 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      {/* Content */}
      <div className="text-center px-8 animate-fade-scale relative z-10">
        {/* Glow ring */}
        <div className="relative inline-block mb-6">
          <div className="text-7xl animate-glow rounded-full">🔥</div>
        </div>

        <div className="font-mono text-6xl font-bold text-[#f59e0b] mb-3 animate-streak-glow">
          {streak}
        </div>
        <div className="text-lg text-[#fcd34d] font-semibold mb-4">hari</div>

        <p className="text-[#f3f4f6] text-base leading-relaxed max-w-xs">
          {message}
        </p>

        <p className="text-[#6b7280] text-xs mt-6">Ketuk untuk melanjutkan</p>
      </div>
    </div>
  );
}
