import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkIdempotency, completeIdempotency } from "@/lib/idempotency";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: max 10 recharges per minute
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `recharge:${decoded.uid}:${ip}`,
    limit: 10,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before submitting another recharge." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { amount?: number; utr?: string; idempotencyKey?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 10 || amount > 500000) {
    return NextResponse.json(
      { error: "Recharge amount must be an integer between ₹10 and ₹500,000" },
      { status: 400 },
    );
  }

  const utr = typeof body.utr === "string" ? body.utr.trim().slice(0, 50) : "";
  const idempotencyKey = body.idempotencyKey;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  if (idempotencyKey) {
    const check = await checkIdempotency(idempotencyKey, decoded.uid, "/api/wallet/recharge");
    if (check.exists && check.record?.status === "completed") {
      return NextResponse.json({ ok: true, cached: true });
    }
  }

  const rechargeRef = await db.collection("recharges").add({
    uid: decoded.uid,
    amount,
    utr,
    status: "pending",
    createdAt: Date.now(),
  });

  await db.collection("notifications").add({
    uid: decoded.uid,
    title: "Recharge submitted",
    body: `Your recharge of ₹${amount} is pending manual UPI verification.`,
    read: false,
    createdAt: Date.now(),
  });

  if (idempotencyKey) {
    await completeIdempotency(idempotencyKey, decoded.uid, "/api/wallet/recharge", 200, {
      ok: true,
      rechargeId: rechargeRef.id,
    });
  }

  return NextResponse.json({ ok: true });
}

