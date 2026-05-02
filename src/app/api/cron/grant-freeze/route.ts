import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/cron/grant-freeze
 * Schedule: 0 17 * * 0 (UTC) = Senin 00:00 WIB (Jakarta)
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Fetch current credits
  const result = await db.execute(
    "SELECT freeze_credits FROM user_state WHERE id = 1",
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "User state tidak ditemukan" },
      { status: 404 },
    );
  }

  const current = Number(result.rows[0].freeze_credits);
  const newCredits = Math.min(current + 1, 3); // cap at 3

  await db.execute({
    sql: "UPDATE user_state SET freeze_credits = ? WHERE id = 1",
    args: [newCredits],
  });

  return NextResponse.json({
    success: true,
    previous_credits: current,
    new_credits: newCredits,
    message:
      current >= 3
        ? "Kredit sudah maksimal (3). Tidak ada perubahan."
        : `Freeze credit bertambah: ${current} → ${newCredits}`,
  });
}
