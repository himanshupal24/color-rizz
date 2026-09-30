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

  const activeSnap = await db
    .collection("rounds")
    .where("status", "in", ["betting", "locked"])
    .orderBy("startsAt", "desc")
    .limit(1)
    .get();

  if (activeSnap.empty) {
    const endsAt = now + settings.roundDurationSec * 1000;
    await db.collection("rounds").add({
      period: periodId(),
      status: "betting",
      startsAt: now,
      endsAt,
      createdAt: now,
    });
    return;
  }

  const roundDoc = activeSnap.docs[0]!;
  const round = roundDoc.data();
  const roundId = roundDoc.id;

  if (round.status === "betting" && now >= round.endsAt) {
    await roundDoc.ref.update({ status: "locked", lockedAt: now });
    return;
  }

  if (round.status === "locked") {
    const color = round.plannedColor as GameColor | undefined;
    const number =
      typeof round.plannedNumber === "number" ? round.plannedNumber : undefined;

    if (!color || number === undefined) {
      return;
    }

    const betsSnap = await db
      .collection("bets")
      .where("roundId", "==", roundId)
      .get();

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(roundDoc.ref);
      if (!fresh.exists || fresh.data()?.status !== "locked") return;

      tx.update(roundDoc.ref, {
        status: "settled",
        resultColor: color,
        resultNumber: number,
        settledAt: now,
      });

      for (const betDoc of betsSnap.docs) {
        const betRef = betDoc.ref;
        const betLive = await tx.get(betRef);
        if (!betLive.exists) continue;
        const bet = betLive.data()!;
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
    });

    const endsAt = now + settings.roundDurationSec * 1000;
    await db.collection("rounds").add({
      period: periodId(),
      status: "betting",
      startsAt: now,
      endsAt,
      createdAt: now,
    });
  }
}
