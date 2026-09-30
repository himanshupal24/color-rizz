"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { GameRound } from "@/lib/types";

export function useCurrentRound() {
  const [round, setRound] = useState<GameRound | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "rounds"),
      where("status", "in", ["betting", "locked"]),
      orderBy("startsAt", "desc"),
      limit(1),
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setRound(null);
        return;
      }
      const doc = snap.docs[0]!;
      setRound({ id: doc.id, ...doc.data() } as GameRound);
    });
    return () => unsub();
  }, []);

  return round;
}

export function useRoundHistory(limitCount = 20) {
  const [rounds, setRounds] = useState<GameRound[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "rounds"),
      where("status", "==", "settled"),
      orderBy("settledAt", "desc"),
      limit(limitCount),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRounds(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRound),
      );
    });
    return () => unsub();
  }, [limitCount]);

  return rounds;
}

export function useCountdown(endsAt?: number) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      setSeconds(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return seconds;
}
