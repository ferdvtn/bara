import { NextRequest, NextResponse } from "next/server";
import { getValidatedToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  calculateIntensity,
  evaluateStreak,
  type UserState,
} from "@/lib/streak";
import { isValidDateString } from "@/utils/dates";

const VALID_ACTIVITY_TYPES = ["Push Up", "Dumbbell", "Lari", "Jalan", "Senam", "Bulutangkis"] as const;
const VALID_DURATIONS = [5, 10, 15, 30, 45, 60] as const;

export async function POST(req: NextRequest) {
  // 1. Validate token
  const token = await getValidatedToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate request body
  let body: { activity_type?: string; duration?: number; today_local?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const { activity_type, duration, today_local } = body;

  if (
    !activity_type ||
    !(VALID_ACTIVITY_TYPES as readonly string[]).includes(activity_type)
  ) {
    return NextResponse.json(
      {
        error:
          "Input tidak valid: activity_type harus 'Push Up', 'Dumbbell', 'Lari', 'Jalan', 'Senam', atau 'Bulutangkis'",
      },
      { status: 400 },
    );
  }

  if (!duration || !(VALID_DURATIONS as readonly number[]).includes(duration)) {
    return NextResponse.json(
      { error: "Input tidak valid: duration harus 5, 10, 15, 30, 45, atau 60" },
      { status: 400 },
    );
  }

  if (!today_local || !isValidDateString(today_local)) {
    return NextResponse.json(
      { error: "Input tidak valid: today_local harus format YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const db = getDb();

  // 3. Calculate intensity (server-side only per §5.1)
  const intensity = calculateIntensity(duration);

  // 4. Insert activity log
  const logId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO activity_logs (id, activity_type, duration, intensity, logged_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      logId,
      activity_type,
      duration,
      intensity,
      today_local,
      new Date().toISOString(),
    ],
  });

  // 5. Ensure user_state row id=1 exists (idempotent — safe on every request)
  //    Handles case where migration INSERT was not run manually.
  await db.execute("INSERT OR IGNORE INTO user_state (id) VALUES (1)");

  // 6. Fetch current user_state
  const stateResult = await db.execute(
    "SELECT current_streak, longest_streak, freeze_credits, last_active_date FROM user_state WHERE id = 1",
  );

  const row = stateResult.rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "Gagal membaca user_state. Cek koneksi database." },
      { status: 500 },
    );
  }

  const userState: UserState = {
    current_streak: Number(row.current_streak),
    longest_streak: Number(row.longest_streak),
    freeze_credits: Number(row.freeze_credits),
    last_active_date: row.last_active_date as string | null,
  };

  // 6. Evaluate streak logic (§5.2 + §5.3)
  const newState = evaluateStreak(userState, today_local);

  // 7. Persist updated user_state in a single UPDATE
  await db.execute({
    sql: `UPDATE user_state
          SET current_streak = ?, longest_streak = ?, freeze_credits = ?, last_active_date = ?
          WHERE id = 1`,
    args: [
      newState.current_streak,
      newState.longest_streak,
      newState.freeze_credits,
      newState.last_active_date,
    ],
  });

  // 8. Count sessions today
  const countResult = await db.execute({
    sql: "SELECT COUNT(*) AS cnt FROM activity_logs WHERE logged_date = ?",
    args: [today_local],
  });
  const sesi_hari_ini = Number(countResult.rows[0].cnt);

  // 9. Return response
  return NextResponse.json({
    success: true,
    streak_reset: newState.streak_reset,
    state: {
      current_streak: newState.current_streak,
      longest_streak: newState.longest_streak,
      freeze_credits: newState.freeze_credits,
      sesi_hari_ini,
    },
  });
}
