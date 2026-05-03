import { NextRequest, NextResponse } from "next/server";
import { getValidatedToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getDaysAgo, isValidDateString } from "@/utils/dates";
import { calculateIntensity } from "@/lib/streak";

export async function GET(req: NextRequest) {
  const token = await getValidatedToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const today_local = searchParams.get("today_local");

  if (!today_local || !isValidDateString(today_local)) {
    return NextResponse.json(
      { error: "Query param today_local (YYYY-MM-DD) wajib ada" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Run 3 queries in parallel per vercel-react-best-practices async-parallel
  const thirtyDaysAgo = getDaysAgo(30);
  const ninetyEightDaysAgo = getDaysAgo(98);

  const [totalResult, activeDaysResult, heatmapResult, todayLogsResult] = await Promise.all([
    // Total minutes lifetime
    db.execute("SELECT COALESCE(SUM(duration), 0) AS total_menit FROM activity_logs"),

    // Active days in last 30 days (for discipline score)
    db.execute({
      sql: `SELECT COUNT(DISTINCT logged_date) AS hari_aktif
            FROM activity_logs
            WHERE logged_date >= ? AND logged_date <= ?`,
      args: [thirtyDaysAgo, today_local],
    }),

    // Heatmap data (98 days) per §5.5
    db.execute({
      sql: `SELECT logged_date,
                   SUM(duration)    AS total_menit,
                   COUNT(*)         AS jumlah_sesi
            FROM activity_logs
            WHERE logged_date >= ?
            GROUP BY logged_date
            ORDER BY logged_date ASC`,
      args: [ninetyEightDaysAgo],
    }),

    // Today's logs
    db.execute({
      sql: `SELECT id, activity_type, duration, created_at
            FROM activity_logs
            WHERE logged_date = ?
            ORDER BY created_at DESC`,
      args: [today_local],
    }),
  ]);

  const total_menit = Number(totalResult.rows[0].total_menit);
  const hari_aktif = Number(activeDaysResult.rows[0].hari_aktif);
  const skor_disiplin = Math.round((hari_aktif / 30.0) * 100 * 10) / 10; // 1 decimal

  const heatmap = heatmapResult.rows.map((row) => {
    const total_menit = Number(row.total_menit);
    return {
      date: row.logged_date as string,
      intensity: calculateIntensity(total_menit),
      total_menit,
      jumlah_sesi: Number(row.jumlah_sesi),
    };
  });

  const today_logs = todayLogsResult.rows.map((row) => ({
    id: row.id as string,
    activity_type: row.activity_type as string,
    duration: Number(row.duration),
    created_at: row.created_at as string,
  }));

  return NextResponse.json({ total_menit, skor_disiplin, heatmap, today_logs });
}
