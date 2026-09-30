"use client";

import { useEffect, useRef } from "react";
import { useCurrentRound } from "./useGameRound";

/** Keeps round lifecycle moving (lock → settle when admin set result). */
export function useGameTick() {
  const round = useCurrentRound();
  const busy = useRef(false);

  useEffect(() => {
    if (!round) {
      void fetch("/api/game/tick", { method: "POST" });
      return;
    }

    const shouldTick =
      (round.status === "betting" && Date.now() >= round.endsAt) ||
      round.status === "locked";

    if (!shouldTick || busy.current) return;

    busy.current = true;
    fetch("/api/game/tick", { method: "POST" })
      .catch(() => undefined)
      .finally(() => {
        busy.current = false;
      });
  }, [round?.id, round?.status, round?.endsAt]);
}
