import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/push/subscribe — Fase 2
 * Saves push notification subscription to user_state.
 * Infrastructure is ready; feature is not yet active in MVP.
 */
export async function POST(req: NextRequest) {
  // Fase 2 stub — returns success without doing anything
  void req;
  return NextResponse.json(
    { message: "Push notification akan aktif di Fase 2." },
    { status: 200 }
  );
}
