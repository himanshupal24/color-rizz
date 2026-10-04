import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { DEFAULT_GAME_SETTINGS } from "./constants";
import type { GameColor, GameSettings } from "./types";

export async function getGameSettings(db: Firestore): Promise<GameSettings> {
  const snap = await db.doc("settings/game").get();
  if (!snap.exists) {
    await db.doc("settings/game").set(DEFAULT_GAME_SETTINGS);
    return DEFAULT_GAME_SETTINGS;
  }
  return { ...DEFAULT_GAME_SETTINGS, ...snap.data() } as GameSettings;
}

function periodId(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = Math.floor(date.getTime() / 1000)
    .toString()
    .slice(-6);
  return `${y}${m}${d}${seq}`;
}

export async function advanceGameRound(db: Firestore): Promise<void> {
  const settings = await getGameSettings(db);
  const now = Date.now();
  const roundDurationMs = settings.roundDurationSec * 1000;
  const cutoffMs = 5000; // 5 seconds betting cutoff buffer

  const activeSnap = await db
    .collection("rounds")
    .where("status", "in", ["betting", "locked"])
    .orderBy("startsAt", "desc")
    .limit(1)
    .get();

  if (activeSnap.empty) {
    // Atomically create initial round if no active round exists
    await db.runTransaction(async (tx) => {
      const checkSnap = await tx.get(
        db
          .collection("rounds")
          .where("status", "in", ["betting", "locked"])
          .limit(1)
      );
      if (!checkSnap.empty) return;

      const newRoundRef = db.collection("rounds").doc();
      tx.set(newRoundRef, {
        period: periodId(new Date(now)),
        status: "betting",
        startsAt: now,
        bettingClosesAt: now + (roundDurationMs - cutoffMs),
        endsAt: now + roundDurationMs,
        createdAt: now,
      });
    });
    return;
  }

  const roundDoc = activeSnap.docs[0]!;
  const round = roundDoc.data();
  const roundId = roundDoc.id;

  const closesAt = round.bettingClosesAt ?? round.endsAt;

  if (round.status === "betting" && now >= closesAt) {
    await roundDoc.ref.update({ status: "locked", lockedAt: now });
    return;
  }

  if (round.status === "locked") {
    let color: GameColor | undefined;
    let number: number | undefined;

    const planRef = db.doc(`round_plans/${roundId}`);
    const planSnap = await planRef.get();
    if (planSnap.exists) {
      const planData = planSnap.data()!;
      color = planData.plannedColor as GameColor | undefined;
      number = typeof planData.plannedNumber === "number" ? planData.plannedNumber : undefined;
    }

    if (!color || number === undefined) {
      number = Math.floor(Math.random() * 10);
      const colorMap: Record<number, GameColor> = {
        0: "violet", 5: "violet",
        1: "green", 3: "green", 7: "green", 9: "green",
        2: "red", 4: "red", 6: "red", 8: "red"
      };
      color = colorMap[number]!;
    }

    const betsSnap = await db
      .collection("bets")
      .where("roundId", "==", roundId)
      .get();

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(roundDoc.ref);
      if (!fresh.exists || fresh.data()?.status !== "locked") return;

      const betsWithData: Array<{ ref: import("firebase-admin/firestore").DocumentReference; data: import("firebase-admin/firestore").DocumentData }> = [];
      for (const betDoc of betsSnap.docs) {
        const betLive = await tx.get(betDoc.ref);
        if (betLive.exists) {
          betsWithData.push({ ref: betDoc.ref, data: betLive.data()! });
        }
      }

      // Settle current round
      tx.update(roundDoc.ref, {
        status: "settled",
        resultColor: color,
        resultNumber: number,
        settledAt: now,
      });

      if (planSnap.exists) {
        tx.delete(planRef);
      }

      // Process payouts
      for (const { ref: betRef, data: bet } of betsWithData) {
        const won = bet.color === color;
        const payout = won
          ? bet.totalStake * (settings.multipliers[color as GameColor] ?? 2)
          : 0;

        tx.update(betRef, {
          status: won ? "won" : "lost",
          payout,
        });

        if (won && payout > 0) {
          const userRef = db.doc(`users/${bet.uid}`);
          tx.update(userRef, {
            balance: FieldValue.increment(payout),
          });
          tx.set(db.collection("transactions").doc(), {
            uid: bet.uid,
            type: "win",
            amount: payout,
            status: "success",
            note: `Win on period ${bet.period}`,
            createdAt: now,
          });
        }
      }

      // Atomically create next round in the SAME commit
      const nextRoundRef = db.collection("rounds").doc();
      tx.set(nextRoundRef, {
        period: periodId(new Date(now)),
        status: "betting",
        startsAt: now,
        bettingClosesAt: now + (roundDurationMs - cutoffMs),
        endsAt: now + roundDurationMs,
        createdAt: now,
      });
    });
  }
}
