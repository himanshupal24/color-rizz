import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { advanceGameRound } from "@/lib/game-engine";

export async function POST(request: Request) {
  const secret = process.env.GAME_TICK_SECRET;
  if (secret) {
    const header = request.headers.get("x-game-tick-secret");
    if (header !== secret) {
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
