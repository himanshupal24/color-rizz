import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { advanceGameRound } from "@/lib/game-engine";
import type { GameColor } from "@/lib/types";

async function assertAdmin(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) return null;
  const db = getAdminDb();
  if (!db) return null;
  const user = await db.doc(`users/${decoded.uid}`).get();
  if (!user.exists || user.data()?.role !== "admin") return null;
  return decoded;
}

export async function PATCH(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    roundId?: string;
    plannedColor?: GameColor;
    plannedNumber?: number;
  };

  const db = getAdminDb()!;
  if (body.roundId && body.plannedColor && body.plannedNumber !== undefined) {
    if (body.plannedNumber < 0 || body.plannedNumber > 9) {
      return NextResponse.json({ error: "Number must be 0-9" }, { status: 400 });
    }
    await db.doc(`rounds/${body.roundId}`).update({
      plannedColor: body.plannedColor,
      plannedNumber: body.plannedNumber,
      plannedBy: admin.uid,
      plannedAt: Date.now(),
    });
  }

  await advanceGameRound(db);
  return NextResponse.json({ ok: true });
}
