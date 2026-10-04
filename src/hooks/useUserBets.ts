"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Bet } from "@/lib/types";

/**
 * Real-time hook to subscribe to the authenticated user's bets
 * with support for live status, open bets filtering, and pagination ("load previous bets").
 */
export function useUserRecentBets(uid?: string, initialLimit: number = 5) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [limitCount, setLimitCount] = useState<number>(initialLimit);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!db || !uid) {
      setBets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "bets"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bet);
        setBets(list);
        setHasMore(snap.docs.length >= limitCount);
        setLoading(false);
        setLoadingMore(false);
      },
      (err) => {
        console.warn("User bets listener error:", err);
        setLoading(false);
        setLoadingMore(false);
      },
    );

    return () => unsub();
  }, [uid, limitCount]);

  const loadPreviousBets = useCallback(() => {
    setLoadingMore(true);
    setLimitCount((prev) => prev + 10);
  }, []);

  const openBets = bets.filter((b) => b.status === "open");
  const settledBets = bets.filter((b) => b.status !== "open");

  return {
    bets,
    openBets,
    settledBets,
    loading,
    loadingMore,
    hasMore,
    loadPreviousBets,
    limitCount,
  };
}

