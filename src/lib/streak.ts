export interface UserState {
  current_streak: number;
  longest_streak: number;
  freeze_credits: number;
  last_active_date: string | null;
}

export interface StreakResult {
  current_streak: number;
  longest_streak: number;
  freeze_credits: number;
  last_active_date: string;
  streak_reset: boolean;
}

/**
 * §5.1 — Intensity calculation (server-side only)
 * duration <= 10        → 1 (Rendah)
 * duration 11–20        → 2 (Sedang)
 * duration > 20         → 3 (Tinggi)
 */
export function calculateIntensity(duration: number): 1 | 2 | 3 {
  if (duration <= 10) return 1;
  if (duration <= 20) return 2;
  return 3;
}

/**
 * §5.2 helper — Calculate difference in days between two YYYY-MM-DD strings.
 * diffDays("2024-01-03", "2024-01-01") = 2
 */
export function diffDays(dateStrA: string, dateStrB: string): number {
  const a = new Date(dateStrA + "T00:00:00");
  const b = new Date(dateStrB + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * §5.2 + §5.3 — Full streak evaluation.
 * Pure function — does not touch DB. Caller is responsible for persisting result.
 *
 * Returns the new user state after evaluating the streak,
 * including whether a reset occurred.
 */
export function evaluateStreak(
  state: UserState,
  today_local: string
): StreakResult {
  // Step 2 — First ever use
  if (state.last_active_date === null) {
    return {
      current_streak: 1,
      longest_streak: Math.max(1, state.longest_streak),
      freeze_credits: state.freeze_credits,
      last_active_date: today_local,
      streak_reset: false,
    };
  }

  // Step 3 — Guard: same day duplicate log
  if (today_local === state.last_active_date) {
    return {
      current_streak: state.current_streak,
      longest_streak: state.longest_streak,
      freeze_credits: state.freeze_credits,
      last_active_date: state.last_active_date,
      streak_reset: false,
    };
  }

  // Step 4 — Calculate gap
  const days_missed =
    diffDays(today_local, state.last_active_date) - 1;

  // Step 5a — Consecutive day (no gap)
  if (days_missed === 0) {
    const new_streak = state.current_streak + 1;
    return {
      current_streak: new_streak,
      longest_streak: Math.max(new_streak, state.longest_streak),
      freeze_credits: state.freeze_credits,
      last_active_date: today_local,
      streak_reset: false,
    };
  }

  // Step 5b — §5.3 Freeze credit logic
  const days_to_cover = days_missed;

  if (state.freeze_credits >= days_to_cover) {
    // Streak SAVED by freeze
    return {
      current_streak: state.current_streak + 1,
      longest_streak: state.longest_streak, // longest_streak NOT updated during freeze
      freeze_credits: state.freeze_credits - days_to_cover,
      last_active_date: today_local,
      streak_reset: false,
    };
  } else {
    // Streak RESET — start from 1, not 0
    return {
      current_streak: 1,
      longest_streak: state.longest_streak, // historical record preserved
      freeze_credits: Math.max(0, state.freeze_credits - days_to_cover),
      last_active_date: today_local,
      streak_reset: true,
    };
  }
}
