import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getDb } from "@/lib/db";

// VAPID setup — hanya perlu dipanggil sekali
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/**
 * GET /api/cron/remind
 * Mengirim push notification jika user belum log aktivitas hari ini.
 *
 * Jadwal: 0 12 * * * (12:00 UTC = 19:00 WIB)
 * Proteksi: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  // Validasi CRON_SECRET
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Ambil state push notification
  await db.execute("INSERT OR IGNORE INTO user_state (id) VALUES (1)");
  const stateResult = await db.execute(
    "SELECT push_enabled, push_endpoint, push_p256dh, push_auth FROM user_state WHERE id = 1"
  );

  const row = stateResult.rows[0];
  if (!row || !Number(row.push_enabled) || !row.push_endpoint) {
    return NextResponse.json({ skipped: true, reason: "Push notification tidak aktif" });
  }

  // Cek apakah sudah log hari ini (pakai WIB = UTC+7)
  const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayWIB = nowWIB.toISOString().split("T")[0]; // YYYY-MM-DD

  const logResult = await db.execute({
    sql: "SELECT COUNT(*) AS cnt FROM activity_logs WHERE logged_date = ?",
    args: [todayWIB],
  });

  const hasLogged = Number(logResult.rows[0].cnt) > 0;
  if (hasLogged) {
    return NextResponse.json({ skipped: true, reason: "Sudah log hari ini" });
  }

  // Kirim push notification
  const subscription = {
    endpoint: row.push_endpoint as string,
    keys: {
      p256dh: row.push_p256dh as string,
      auth: row.push_auth as string,
    },
  };

  const payload = JSON.stringify({
    title: "Bara 🔥",
    body: "Target hari ini belum aman. 5 menit cukup.",
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ success: true, sentTo: todayWIB });
  } catch (err: unknown) {
    // Subscription expired/invalid — nonaktifkan di DB
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      await db.execute(`
        UPDATE user_state
        SET push_endpoint = NULL, push_p256dh = NULL, push_auth = NULL, push_enabled = 0
        WHERE id = 1
      `);
      return NextResponse.json({ skipped: true, reason: "Subscription expired, sudah dinonaktifkan" });
    }

    console.error("Push notification error:", err);
    return NextResponse.json({ error: "Gagal mengirim notifikasi" }, { status: 500 });
  }
}
