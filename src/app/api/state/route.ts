import { NextRequest, NextResponse } from "next/server";
import { getValidatedToken } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = await getValidatedToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Ensure user_state row id=1 exists (idempotent — safe on every request)
  // Handles case where migration INSERT OR IGNORE was not run manually.
  await db.execute("INSERT OR IGNORE INTO user_state (id) VALUES (1)");

  const result = await db.execute(
    "SELECT current_streak, longest_streak, freeze_credits, last_active_date FROM user_state WHERE id = 1"
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "Gagal membaca user_state. Cek koneksi database." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    current_streak: Number(row.current_streak),
    longest_streak: Number(row.longest_streak),
    freeze_credits: Number(row.freeze_credits),
    last_active_date: row.last_active_date ?? null,
  });
}
