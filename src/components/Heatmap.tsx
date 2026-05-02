"use client";

import { useState, useEffect } from "react";
import { formatDateShort } from "@/utils/dates";

export interface HeatmapDay {
  date: string;
  intensity: 0 | 1 | 2 | 3;
  total_menit: number;
  jumlah_sesi: number;
}

interface HeatmapProps {
  data: HeatmapDay[];
  /** today in YYYY-MM-DD to anchor the grid */
  today: string;
}

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const WEEKS = 14;

/** Get 0=Mon ... 6=Sun index for a date */
function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getDay() + 6) % 7; // Mon=0, Sun=6
}

/** Build a 14-week grid ending on today, filled with day data */
function buildGrid(today: string, data: HeatmapDay[]): (HeatmapDay | null)[][] {
  const dataMap = new Map(data.map((d) => [d.date, d]));
  const todayDate = new Date(today + "T00:00:00");

  // Find start of week containing today (Mon)
  const todayDow = getDayOfWeek(today);
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() - todayDow);

  // Go back 13 more weeks
  const gridStart = new Date(weekStart);
  gridStart.setDate(gridStart.getDate() - (WEEKS - 1) * 7);

  // Build weeks array
  const weeks: (HeatmapDay | null)[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: (HeatmapDay | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const dateStr = date.toLocaleDateString("sv-SE");
      if (date > todayDate) {
        week.push(null); // future dates
      } else {
        week.push(
          dataMap.get(dateStr) ?? {
            date: dateStr,
            intensity: 0,
            total_menit: 0,
            jumlah_sesi: 0,
          }
        );
      }
    }
    weeks.push(week);
  }

  return weeks;
}

export default function Heatmap({ data, today }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null);
  const grid = buildGrid(today, data);

  // Close tooltip on outside tap
  useEffect(() => {
    const handler = () => setTooltip(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const levelClass = (intensity: 0 | 1 | 2 | 3, isFuture: boolean) => {
    if (isFuture) return "bg-[#111]";
    return [`heat-level-0`, `heat-level-1`, `heat-level-2`, `heat-level-3`][intensity];
  };

  return (
    <div className="overflow-x-auto">
      {/* Day labels */}
      <div className="flex gap-1 mb-1 pl-[2px]">
        <div className="flex flex-col gap-1 mr-1">
          {DAYS.map((day) => (
            <div
              key={day}
              className="h-[10px] flex items-center text-[8px] text-[#4b5563] w-6"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-1">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => {
                const isFuture = day === null;
                const cellDay = day ?? { date: "", intensity: 0 as const, total_menit: 0, jumlah_sesi: 0 };

                return (
                  <button
                    key={di}
                    className={`w-[10px] h-[10px] rounded-[2px] transition-all duration-100 ${
                      isFuture ? "bg-[#111] cursor-default" : `${levelClass(cellDay.intensity, false)} hover:ring-1 hover:ring-[#f59e0b]/50 cursor-pointer`
                    }`}
                    onClick={(e) => {
                      if (isFuture || cellDay.intensity === 0) return;
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ day: cellDay, x: rect.left, y: rect.top });
                    }}
                    aria-label={
                      isFuture
                        ? "Belum tersedia"
                        : `${cellDay.date}: ${cellDay.total_menit} menit`
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend — labeled with duration ranges per calculateIntensity() */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {[
          { level: 0, label: "Tidak ada" },
          { level: 1, label: "5–14 mnt" },
          { level: 2, label: "15–29 mnt" },
          { level: 3, label: "≥ 30 mnt" },
        ].map(({ level, label }) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className={`w-[10px] h-[10px] rounded-[2px] flex-shrink-0 heat-level-${level}`} />
            <span className="text-[10px] text-[#4b5563]">{label}</span>
          </div>
        ))}
      </div>


      {/* Tooltip */}
      {tooltip && tooltip.day.intensity > 0 && (
        <div
          className="fixed z-50 bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{
            top: Math.max(8, tooltip.y - 70),
            left: Math.min(
              tooltip.x - 60,
              (typeof window !== "undefined" ? window.innerWidth : 300) - 150
            ),
          }}
        >
          <p className="font-semibold text-[#f3f4f6]">
            {formatDateShort(tooltip.day.date)}
          </p>
          <p className="text-[#9ca3af]">
            {tooltip.day.total_menit} menit · {tooltip.day.jumlah_sesi} sesi
          </p>
        </div>
      )}
    </div>
  );
}
