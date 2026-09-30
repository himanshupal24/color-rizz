import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_GAME_SETTINGS } from "@/lib/constants";
import type { GameSettings } from "@/lib/types";

async function assertAdmin(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) return null;
  const db = getAdminDb();
  if (!db) return null;
  const user = await db.doc(`users/${decoded.uid}`).get();
  if (!user.exists || user.data()?.role !== "admin") return null;
  return decoded;
}

export async function GET() {
  const db = getAdminDb();
  if (!db) return NextResponse.json(DEFAULT_GAME_SETTINGS);
  const snap = await db.doc("settings/game").get();
  return NextResponse.json(
    snap.exists ? { ...DEFAULT_GAME_SETTINGS, ...snap.data() } : DEFAULT_GAME_SETTINGS,
  );
}

export async function PUT(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as Partial<GameSettings>;
  const db = getAdminDb()!;
  await db.doc("settings/game").set(
    {
      ...body,
      updatedAt: Date.now(),
      updatedBy: admin.uid,
    },
    { merge: true },
  );
  return NextResponse.json({ ok: true });
}
