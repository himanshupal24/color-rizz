import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkIdempotency, completeIdempotency } from "@/lib/idempotency";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { calculateUserBalances } from "@/lib/referral-engine";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: max 10 withdrawal requests per minute
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `withdraw:${decoded.uid}:${ip}`,
    limit: 10,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before submitting another withdrawal." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { amount?: number; idempotencyKey?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 300 || amount > 100000) {
    return NextResponse.json(
      { error: "Withdrawal amount must be an integer between ₹300 and ₹100,000" },
      { status: 400 },
    );
  }

  const idempotencyKey = body.idempotencyKey;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const userRef = db.doc(`users/${decoded.uid}`);

  try {
    await db.runTransaction(async (tx) => {
      if (idempotencyKey) {
        const idempCheck = await checkIdempotency(idempotencyKey, decoded.uid, "/api/wallet/withdraw", tx);
        if (idempCheck.exists && idempCheck.record?.status === "completed") {
          return;
        }
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("User not found");
      const user = userSnap.data()!;
      if (!user.bankDetails) throw new Error("Add bank details first");
      
      const balances = calculateUserBalances(user);
      if (balances.withdrawableBalance < amount) {
        throw new Error(
          `Insufficient withdrawable balance. Available: ₹${balances.withdrawableBalance.toFixed(2)}` +
          (balances.bonusBalance > 0 ? ` (Locked promotional bonus: ₹${balances.bonusBalance.toFixed(2)})` : "")
        );
      }

      let rem = amount;
      let newUnlocked = balances.unlockedBonusBalance;
      let newCash = balances.cashBalance;

      // Deduct from cash first, then unlocked bonus
      if (newCash >= rem) {
        newCash = Number((newCash - rem).toFixed(2));
        rem = 0;
      } else {
        rem = Number((rem - newCash).toFixed(2));
        newCash = 0;
        newUnlocked = Number((newUnlocked - rem).toFixed(2));
      }

      const newTotal = Number((newCash + balances.bonusBalance + newUnlocked).toFixed(2));

      tx.update(userRef, {
        cashBalance: newCash,
        unlockedBonusBalance: newUnlocked,
        balance: newTotal,
      });
      tx.set(db.collection("withdrawals").doc(), {
        uid: decoded.uid,
        amount,
        bankSnapshot: user.bankDetails,
        status: "pending",
        createdAt: Date.now(),
      });
      tx.set(db.collection("transactions").doc(), {
        uid: decoded.uid,
        type: "withdraw",
        amount,
        status: "pending",
        note: "Withdrawal request",
        createdAt: Date.now(),
      });

      if (idempotencyKey) {
        await completeIdempotency(idempotencyKey, decoded.uid, "/api/wallet/withdraw", 200, { ok: true }, tx);
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Withdrawal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

