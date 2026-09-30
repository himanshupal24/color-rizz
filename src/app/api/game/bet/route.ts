import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getGameSettings } from "@/lib/game-engine";
import type { GameColor } from "@/lib/types";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    roundId?: string;
    color?: GameColor;
    amount?: number;
    quantity?: number;
  };

  const { roundId, color, amount = 0, quantity = 1 } = body;
  if (!roundId || !color || amount <= 0 || quantity <= 0) {
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const settings = await getGameSettings(db);
  const totalStake = amount * quantity;
  if (totalStake < settings.minBet || totalStake > settings.maxBet) {
    return NextResponse.json({ error: "Bet amount out of range" }, { status: 400 });
  }

  const roundRef = db.doc(`rounds/${roundId}`);
  const userRef = db.doc(`users/${decoded.uid}`);

  try {
    await db.runTransaction(async (tx) => {
      const [roundSnap, userSnap] = await Promise.all([
        tx.get(roundRef),
        tx.get(userRef),
      ]);
      if (!roundSnap.exists) throw new Error("Round not found");
      const round = roundSnap.data()!;
      if (round.status !== "betting" || Date.now() >= round.endsAt) {
        throw new Error("Betting closed for this round");
      }
      if (!userSnap.exists) throw new Error("User not found");
      const balance = userSnap.data()!.balance ?? 0;
      if (balance < totalStake) throw new Error("Insufficient balance");

      tx.update(userRef, { balance: FieldValue.increment(-totalStake) });
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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bet failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
