import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { advanceGameRound } from "@/lib/game-engine";
import { logAdminAction } from "@/lib/audit-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
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

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `admin:${admin.uid}:${ip}`,
    limit: 60,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as {
    roundId?: string;
    plannedColor?: GameColor;
    plannedNumber?: number;
    reason?: string;
  };

  const validColors: GameColor[] = ["green", "red", "violet"];
  const db = getAdminDb()!;

  if (body.roundId && typeof body.roundId === "string") {
    if (body.plannedColor && !validColors.includes(body.plannedColor)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
    if (
      body.plannedNumber !== undefined &&
      (!Number.isInteger(body.plannedNumber) || body.plannedNumber < 0 || body.plannedNumber > 9)
    ) {
      return NextResponse.json({ error: "Number must be an integer between 0-9" }, { status: 400 });
    }

    if (body.plannedColor && body.plannedNumber !== undefined) {
      const planRef = db.doc(`round_plans/${body.roundId}`);
      const oldPlan = await planRef.get();

      // Store in private admin collection so clients listening to public rounds cannot inspect it
      await planRef.set({
        plannedColor: body.plannedColor,
        plannedNumber: body.plannedNumber,
        plannedBy: admin.uid,
        plannedAt: Date.now(),
        reason: body.reason ?? "",
      });

      // Record immutable audit log
      await logAdminAction({
        adminUid: admin.uid,
        action: "round_result_planned",
        targetType: "round",
        targetId: body.roundId,
        reason: body.reason,
        oldValue: oldPlan.exists ? oldPlan.data() : null,
        newValue: { color: body.plannedColor, number: body.plannedNumber },
        ip,
      });
    }
  }

  await advanceGameRound(db);
  return NextResponse.json({ ok: true });
}

