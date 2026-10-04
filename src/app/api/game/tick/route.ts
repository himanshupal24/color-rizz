import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { advanceGameRound } from "@/lib/game-engine";

async function handleTick(request: Request) {
  const secret = process.env.GAME_TICK_SECRET;
  if (secret) {
    const header = request.headers.get("x-game-tick-secret");
    const authHeader = request.headers.get("authorization");
    const isCronAuthorized =
      header === secret ||
      authHeader === `Bearer ${secret}` ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCronAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  await advanceGameRound(db);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return handleTick(request);
}

export async function GET(request: Request) {
  return handleTick(request);
}
