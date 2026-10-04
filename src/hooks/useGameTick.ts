"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GameRound } from "@/lib/types";

/**
 * Ensures authoritative round transitions (locking when time expires -> settling when locked)
 * without duplicate listeners or request spam.
 */
export function useGameTick(round?: GameRound | null) {
  const busyRef = useRef(false);
  const lastTickTimeRef = useRef(0);

  const triggerTick = useCallback(async () => {
    const now = Date.now();
    // Enforce 1500ms minimum interval between client tick dispatches
    if (busyRef.current || now - lastTickTimeRef.current < 1500) {
      return;
    }

    busyRef.current = true;
    lastTickTimeRef.current = now;

    try {
      await fetch("/api/game/tick", { method: "POST" });
    } catch {
      // Ignore network errors; persistent listener and other clients/cron will retry
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!round) {
      void triggerTick();
      return;
    }

    const now = Date.now();
    if (round.status === "locked" || (round.status === "betting" && now >= round.endsAt)) {
      void triggerTick();
    }
  }, [round?.id, round?.status, round?.endsAt, triggerTick]);

  return triggerTick;
}
