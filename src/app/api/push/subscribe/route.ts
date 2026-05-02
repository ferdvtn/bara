import { NextRequest, NextResponse } from "next/server";
import { getValidatedToken } from "@/lib/auth";
import { getDb } from "@/lib/db";

/**
 * POST /api/push/subscribe
 * Menyimpan Web Push subscription ke user_state.
 * Dipanggil oleh client setelah user grant permission + pushManager.subscribe().
 */
export async function POST(req: NextRequest) {
  const token = await getValidatedToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subscription?: { endpoint: string; keys: { p256dh: string; auth: string } } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const { subscription } = body;
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Subscription tidak lengkap" }, { status: 400 });
  }

  const db = getDb();
  await db.execute({
    sql: `UPDATE user_state
          SET push_endpoint = ?, push_p256dh = ?, push_auth = ?, push_enabled = 1
          WHERE id = 1`,
    args: [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/push/subscribe
 * Menonaktifkan push notification dan menghapus subscription dari DB.
 */
export async function DELETE(req: NextRequest) {
  const token = await getValidatedToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await db.execute(`
    UPDATE user_state
    SET push_endpoint = NULL, push_p256dh = NULL, push_auth = NULL, push_enabled = 0
    WHERE id = 1
  `);

  return NextResponse.json({ success: true });
}
