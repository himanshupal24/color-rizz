import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_GAME_SETTINGS, normalizeTelegramUrl } from "@/lib/constants";
import { logAdminAction } from "@/lib/audit-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
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

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `admin:${admin.uid}:${ip}`,
    limit: 60,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as Partial<GameSettings> & { reason?: string };
  const db = getAdminDb()!;

  const updateData: Partial<GameSettings> = {};

  if (body.roundDurationSec !== undefined) {
    const sec = Number(body.roundDurationSec);
    if (!Number.isInteger(sec) || sec < 10 || sec > 3600) {
      return NextResponse.json({ error: "Round duration must be between 10 and 3600 seconds" }, { status: 400 });
    }
    updateData.roundDurationSec = sec;
  }

  if (body.minBet !== undefined) {
    const mb = Number(body.minBet);
    if (!Number.isInteger(mb) || mb < 1 || mb > 100000) {
      return NextResponse.json({ error: "Min bet must be between ₹1 and ₹100,000" }, { status: 400 });
    }
    updateData.minBet = mb;
  }

  if (body.maxBet !== undefined) {
    const mb = Number(body.maxBet);
    if (!Number.isInteger(mb) || mb < 10 || mb > 10000000) {
      return NextResponse.json({ error: "Max bet must be between ₹10 and ₹10,000,000" }, { status: 400 });
    }
    updateData.maxBet = mb;
  }

  if (body.referralBonusPercent !== undefined) {
    const pct = Number(body.referralBonusPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: "Referral bonus percent must be between 0 and 100" }, { status: 400 });
    }
    updateData.referralBonusPercent = pct;
  }

  if (typeof body.upiId === "string") {
    updateData.upiId = body.upiId.trim().slice(0, 100);
  }

  if (typeof body.telegramSupportUrl === "string") {
    updateData.telegramSupportUrl = normalizeTelegramUrl(body.telegramSupportUrl).slice(0, 200);
  }

  if (Array.isArray(body.betAmounts)) {
    const sanitized = body.betAmounts
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0 && n <= 1000000);
    if (sanitized.length > 0) {
      updateData.betAmounts = sanitized;
    }
  }

  const oldSnap = await db.doc("settings/game").get();
  const oldValue = oldSnap.exists ? oldSnap.data() : DEFAULT_GAME_SETTINGS;

  await db.doc("settings/game").set(
    {
      ...updateData,
      updatedAt: Date.now(),
      updatedBy: admin.uid,
    },
    { merge: true },
  );

  // Record audit log
  await logAdminAction({
    adminUid: admin.uid,
    action: "settings_updated",
    targetType: "settings",
    targetId: "game",
    reason: body.reason,
    oldValue,
    newValue: updateData,
    ip,
  });

  return NextResponse.json({ ok: true });
}

