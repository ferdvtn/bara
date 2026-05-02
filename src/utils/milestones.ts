/**
 * §7.2 — Milestone definition and next-milestone calculation.
 */
export const MILESTONES = [7, 14, 21, 30, 60, 100, 365] as const;

export type Milestone = (typeof MILESTONES)[number];

/**
 * Returns the next milestone above the current streak, or null if streak > 365.
 */
export function getNextMilestone(currentStreak: number): number | null {
  return MILESTONES.find((m) => m > currentStreak) ?? null;
}

/**
 * Returns the milestone message for a celebration overlay.
 * Called when current_streak === a milestone value.
 */
export function getMilestoneMessage(milestone: number): string {
  const messages: Record<number, string> = {
    7: "7 hari. Kamu sudah lebih konsisten dari kebanyakan orang.",
    14: "14 hari. Dua minggu tanpa henti. Luar biasa.",
    21: "21 hari. Ilmu psikologi bilang ini sudah jadi kebiasaan.",
    30: "30 hari. Ini sudah jadi bagian dari dirimu.",
    60: "60 hari. Dua bulan penuh. Levelmu berbeda.",
    100: "100 hari. Berbeda level.",
    365: "365 hari. Setahun penuh. Kamu bukan orang biasa.",
  };
  return messages[milestone] ?? `${milestone} hari. Pencapaian luar biasa.`;
}

/**
 * Returns true if the given streak value is exactly a milestone.
 */
export function isMilestone(streak: number): boolean {
  return (MILESTONES as readonly number[]).includes(streak);
}
