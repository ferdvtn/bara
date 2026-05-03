"use client";

import { Timer } from "lucide-react";

interface DurationOverlayProps {
  activityType: "Push Up" | "Dumbbell" | "Lari" | "Jalan" | "Senam" | "Bulutangkis";
  onSelect: (duration: number) => void;
  onClose: () => void;
  isLoading: boolean;
}

const DURATIONS = [5, 10, 15, 30, 45, 60] as const;

export default function DurationOverlay({
  activityType,
  onSelect,
  onClose,
  isLoading,
}: DurationOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-[#161616] rounded-t-3xl border-t border-[#2a2a2a] p-6 pb-safe animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Timer size={16} className="text-[#6b7280]" />
          <h2 className="text-center text-[#f3f4f6] font-semibold text-base">
            {activityType}
          </h2>
        </div>
        <p className="text-center text-[#6b7280] text-xs mb-6">
          Pilih durasi latihan
        </p>

        {/* Duration buttons — none pre-selected */}
        <div className="flex flex-col gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d}
              id={`duration-${d}`}
              onClick={() => onSelect(d)}
              disabled={isLoading}
              className="relative w-full py-4 rounded-2xl font-semibold text-base transition-all duration-150 active:scale-[0.98] disabled:opacity-50 bg-[#1a1a1a] border border-[#2a2a2a] text-[#f3f4f6] hover:border-[#f59e0b]/40 hover:bg-[#1e1a12]"
            >
              {d} menit
              {d === 5 && (
                <span className="ml-2 text-[11px] font-normal text-[#6b7280]">
                  · minimum aman
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-[#6b7280] text-sm font-medium hover:text-[#9ca3af] transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
