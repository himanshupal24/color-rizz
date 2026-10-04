"use client";

import React, { memo } from "react";
import { useLocalCountdown } from "@/hooks/useGameRound";

interface CountdownDisplayProps {
  endsAt?: number;
  status?: string;
  onExpire?: () => void;
}

export const CountdownDisplay = memo(function CountdownDisplay({
  endsAt,
  status = "starting",
  onExpire,
}: CountdownDisplayProps) {
  const seconds = useLocalCountdown(endsAt, onExpire);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const isLockedOrExpiring = status === "locked" || seconds === 0;

  return (
    <div className="text-right">
      <p
        className={`text-2xl font-mono font-bold tracking-wider transition-colors duration-200 ${
          isLockedOrExpiring ? "text-rose-500 animate-pulse" : "text-[#2563eb]"
        }`}
      >
        {status === "locked" ? "00:00" : `${mm}:${ss}`}
      </p>
      <div className="flex items-center justify-end gap-1.5 mt-0.5">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "betting" && seconds > 0
              ? "bg-emerald-500 animate-ping"
              : status === "locked"
              ? "bg-amber-500"
              : "bg-slate-400"
          }`}
        />
        <p className="text-xs font-medium capitalize text-slate-500">
          {status === "locked" ? "Settling..." : status}
        </p>
      </div>
    </div>
  );
});
