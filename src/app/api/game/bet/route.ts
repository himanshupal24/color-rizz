import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getGameSettings } from "@/lib/game-engine";
import { checkIdempotency, completeIdempotency } from "@/lib/idempotency";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { recordLatency, recordMetric } from "@/lib/metrics";
import { processBetDeductionAndWagering, calculateUserBalances } from "@/lib/referral-engine";
import type { GameColor, UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  const start = Date.now();
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Rate limiting: 20 bets per minute per user
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `bet:${decoded.uid}:${ip}`,
    limit: 20,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    recordMetric("rateLimitBlocks");
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before placing another bet." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    roundId?: string;
    color?: GameColor;
    amount?: number;
    quantity?: number;
    idempotencyKey?: string;
  };

  const { roundId, color, amount = 0, quantity = 1, idempotencyKey } = body;
  const validColors: GameColor[] = ["green", "red", "violet"];

  if (
    !roundId ||
    typeof roundId !== "string" ||
    roundId.length > 64 ||
    !color ||
    !validColors.includes(color) ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > 1000
  ) {
    return NextResponse.json({ error: "Invalid bet parameters" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    recordMetric("firestoreErrors");
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const settings = await getGameSettings(db);
  const totalStake = amount * quantity;
  if (totalStake < settings.minBet || totalStake > settings.maxBet) {
    return NextResponse.json(
      { error: `Bet amount must be between ₹${settings.minBet} and ₹${settings.maxBet}` },
      { status: 400 },
    );
  }

  const roundRef = db.doc(`rounds/${roundId}`);
  const userRef = db.doc(`users/${decoded.uid}`);
  const statsRef = db.doc(`round_stats/${roundId}`);

  try {
    await db.runTransaction(async (tx) => {
      // 2. Idempotency Check inside transaction
      if (idempotencyKey) {
        const idempCheck = await checkIdempotency(idempotencyKey, decoded.uid, "/api/game/bet", tx);
        if (idempCheck.exists && idempCheck.record?.status === "completed") {
          recordMetric("duplicateRequestsPrevented");
          return; // Handled idempotently
        }
      }

      const [roundSnap, userSnap, statsSnap] = await Promise.all([
        tx.get(roundRef),
        tx.get(userRef),
        tx.get(statsRef),
      ]);
      if (!roundSnap.exists) throw new Error("Round not found");
      const round = roundSnap.data()!;
      const closesAt = round.bettingClosesAt ?? round.endsAt;
      if (round.status !== "betting" || Date.now() >= closesAt) {
        throw new Error("Betting closed for this round");
      }
      if (!userSnap.exists) throw new Error("User not found");

      const userData = userSnap.data() as UserProfile;

      // Read referrer snapshot if user was referred by someone and referral commission > 0
      let referrerSnap: import("firebase-admin/firestore").DocumentSnapshot | null = null;
      let referrerRef: import("firebase-admin/firestore").DocumentReference | null = null;
      if (userData.referredBy && userData.referredBy !== decoded.uid && (settings.referralBonusPercent ?? 0) > 0) {
        referrerRef = db.doc(`users/${userData.referredBy}`);
        referrerSnap = await tx.get(referrerRef);
      }

      await processBetDeductionAndWagering(db, tx, userRef, userSnap, totalStake);

      // Credit referral bet commission to referrer's bonus balance (playable, non-withdrawable)
      if (referrerSnap && referrerSnap.exists && referrerRef) {
        const referrerData = referrerSnap.data() as UserProfile;
        const commissionPct = settings.referralBonusPercent ?? 5;
        const commission = Number(((totalStake * commissionPct) / 100).toFixed(2));
        if (commission > 0) {
          const balances = calculateUserBalances(referrerData);
          const newBonusBalance = Number((balances.bonusBalance + commission).toFixed(2));
          const newPlayableBalance = Number((balances.playableBalance + commission).toFixed(2));

          tx.update(referrerRef, {
            bonusBalance: newBonusBalance,
            balance: newPlayableBalance,
          });

          const identifier = userData.email || userData.phone || "downline";
          tx.set(db.collection("transactions").doc(), {
            uid: userData.referredBy,
            type: "referral",
            amount: commission,
            status: "success",
            note: `₹${commission} Bet Commission (${commissionPct}%) from ${identifier}'s bet`,
            createdAt: Date.now(),
          });

          tx.set(db.collection("notifications").doc(), {
            uid: userData.referredBy,
            title: "🎁 Bet Commission Earned!",
            body: `You received a ₹${commission} bonus commission (${commissionPct}%) from a referred player's bet! Available to play!`,
            read: false,
            createdAt: Date.now(),
          });
        }
      }

      const betRef = db.collection("bets").doc();
      tx.set(betRef, {
        uid: decoded.uid,
        roundId,
        period: round.period,
        color,
        amount,
        quantity,
        totalStake,
        status: "open",
        createdAt: Date.now(),
      });
      tx.set(db.collection("transactions").doc(), {
        uid: decoded.uid,
        type: "bet",
        amount: totalStake,
        status: "success",
        note: `Bet on ${color} · ${round.period}`,
        createdAt: Date.now(),
      });

      // Atomically maintain round_stats aggregate for real-time admin monitoring
      const currentStats = statsSnap.exists
        ? statsSnap.data()!
        : {
            greenBetCount: 0,
            redBetCount: 0,
            violetBetCount: 0,
            totalBetCount: 0,
            greenAmount: 0,
            redAmount: 0,
            violetAmount: 0,
            totalAmount: 0,
          };

      tx.set(
        statsRef,
        {
          roundId,
          period: round.period,
          greenBetCount: (currentStats.greenBetCount ?? 0) + (color === "green" ? quantity : 0),
          redBetCount: (currentStats.redBetCount ?? 0) + (color === "red" ? quantity : 0),
          violetBetCount: (currentStats.violetBetCount ?? 0) + (color === "violet" ? quantity : 0),
          totalBetCount: (currentStats.totalBetCount ?? 0) + quantity,
          greenAmount: (currentStats.greenAmount ?? 0) + (color === "green" ? totalStake : 0),
          redAmount: (currentStats.redAmount ?? 0) + (color === "red" ? totalStake : 0),
          violetAmount: (currentStats.violetAmount ?? 0) + (color === "violet" ? totalStake : 0),
          totalAmount: (currentStats.totalAmount ?? 0) + totalStake,
          updatedAt: Date.now(),
        },
        { merge: true },
      );

      // Record Idempotency completion inside same transaction
      if (idempotencyKey) {
        await completeIdempotency(idempotencyKey, decoded.uid, "/api/game/bet", 200, { ok: true }, tx);
      }
    });

    recordMetric("totalBetsPlaced");
  } catch (e) {
    recordMetric("failedBets");
    const message = e instanceof Error ? e.message : "Bet failed";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    recordLatency(Date.now() - start);
  }

  return NextResponse.json({ ok: true });
}

