import { NextRequest, NextResponse } from "next/server";
import { getValidatedToken } from "@/lib/auth";
import { getDb } from "@/lib/db";

/**
 * POST /api/reset
 * Resets all user data to zero. Requires both:
 *   1. Valid Bearer token (user must be authenticated)
 *   2. PIN confirmation in request body
 *
 * Use case: early-phase testing, fresh start.
 */
export async function POST(req: NextRequest) {
  // 1. Validate auth token
  const token = await getValidatedToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  // 3. Verify PIN as second factor
  if (!body.pin || body.pin !== process.env.APP_PASSCODE) {
    return NextResponse.json(
      { error: "PIN salah. Reset dibatalkan." },
      { status: 401 }
    );
  }

  const db = getDb();

  // 4. Execute reset in sequence
  // Delete all activity logs
  await db.execute("DELETE FROM activity_logs");

  // Reset user_state to defaults (keep row id=1, just zero everything)
  await db.execute(`
    UPDATE user_state
    SET
      current_streak   = 0,
      longest_streak   = 0,
      freeze_credits   = 1,
      last_active_date = NULL,
      push_endpoint    = NULL,
      push_p256dh      = NULL,
      push_auth        = NULL,
      push_enabled     = 0
    WHERE id = 1
  `);

  // Ensure row exists if it was somehow missing
  await db.execute("INSERT OR IGNORE INTO user_state (id) VALUES (1)");

  return NextResponse.json({
    success: true,
    message: "Semua data berhasil direset. Mulai dari awal.",
  });
}
