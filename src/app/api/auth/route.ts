import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

// In-memory rate limiter per IP (PIN brute-force protection)
// Acceptable for single-user app — resets on cold start (very rare event)
const failedAttempts = new Map<string, { count: number; cooldownUntil: number }>();

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const attempt = failedAttempts.get(ip);

  // Check cooldown
  if (attempt && attempt.cooldownUntil > now) {
    const remainingSeconds = Math.ceil((attempt.cooldownUntil - now) / 1000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${remainingSeconds} detik.` },
      { status: 429 }
    );
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const { pin } = body;

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN wajib diisi" }, { status: 400 });
  }

  if (pin !== process.env.APP_PASSCODE) {
    // Track failed attempt
    const current = failedAttempts.get(ip) ?? { count: 0, cooldownUntil: 0 };
    current.count += 1;

    if (current.count >= 5) {
      current.cooldownUntil = now + 30_000; // 30 second cooldown
      current.count = 0; // reset after cooldown starts
    }

    failedAttempts.set(ip, current);
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

  // PIN correct — clear failed attempts and create session
  failedAttempts.delete(ip);
  const token = await createSession();

  return NextResponse.json({ token }, { status: 200 });
}
