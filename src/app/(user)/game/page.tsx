"use client";

import { useEffect, useState, memo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  BetSheet,
  colorButtonClass,
  colors,
} from "@/components/game/BetSheet";
import { CountdownDisplay } from "@/components/game/CountdownDisplay";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import { DEFAULT_GAME_SETTINGS } from "@/lib/constants";
import type { GameColor, GameRound, GameSettings } from "@/lib/types";
import { useGameSync, type ConnectionState } from "@/hooks/useGameRound";
import { useGameTick } from "@/hooks/useGameTick";
import { useUserRecentBets } from "@/hooks/useUserBets";

const colorMap: Record<string, string> = {
  green: "bg-emerald-500",
  violet: "bg-violet-500",
  red: "bg-rose-500",
};

const ResultDot = memo(function ResultDot({ color }: { color?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full shadow-sm ${
        color ? colorMap[color] ?? "bg-slate-300" : "bg-slate-300"
      }`}
    />
  );
});

const ConnectionIndicator = memo(function ConnectionIndicator({
  state,
}: {
  state: ConnectionState;
}) {
  const configs: Record<
    ConnectionState,
    { label: string; dot: string; text: string }
  > = {
    connected: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-700" },
    connecting: { label: "Connecting...", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
    reconnecting: { label: "Reconnecting...", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
    disconnected: { label: "Disconnected", dot: "bg-rose-500", text: "text-rose-700" },
  };

  const config = configs[state] ?? configs.connected;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      <span className={config.text}>{config.label}</span>
    </div>
  );
});

const HistoryRow = memo(function HistoryRow({ round }: { round: GameRound }) {
  return (
    <div className="grid grid-cols-3 items-center border-t border-slate-100 px-4 py-2.5 text-xs text-slate-700 transition-colors hover:bg-slate-50">
      <span className="font-mono text-slate-600 font-medium">{round.period}</span>
      <span className="font-mono font-bold text-center text-slate-800">
        {round.resultNumber ?? "-"}
      </span>
      <span className="flex justify-end">
        <ResultDot color={round.resultColor} />
      </span>
    </div>
  );
});

export default function GamePage() {
  const { profile } = useAuth();
  const {
    currentRound,
    history,
    lastSettledRound,
    calendarDate,
    connectionState,
    loading,
  } = useGameSync();
  const triggerTick = useGameTick(currentRound);
  const {
    bets: userBets,
    openBets,
    loading: betsLoading,
    loadingMore: betsLoadingMore,
    hasMore: hasMoreBets,
    loadPreviousBets,
  } = useUserRecentBets(profile?.uid, 5);

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [pick, setPick] = useState<GameColor | null>(null);
  const [betTab, setBetTab] = useState<"all" | "open" | "settled">("all");

  // Cache settings with single onSnapshot listener
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, "settings/game"), (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_GAME_SETTINGS, ...snap.data() } as GameSettings);
      }
    });
    return () => unsub();
  }, []);

  const isBettingActive = currentRound?.status === "betting";

  const displayedBets = userBets.filter((b) => {
    if (betTab === "open") return b.status === "open";
    if (betTab === "settled") return b.status !== "open";
    return true;
  });

  if (loading && !currentRound && history.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 py-10">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#2563eb] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Connecting to live game room...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Top Header Status & Connection */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Win Colour
        </h1>
        <ConnectionIndicator state={connectionState} />
      </div>

      {/* Balance & Live Period Card */}
      <div className="rounded-3xl bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Available Balance
            </p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(profile?.balance ?? 0)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Period
            </p>
            <p className="font-mono text-xs font-bold text-slate-700 mt-0.5">
              {currentRound?.period ?? lastSettledRound?.period ?? "—"}
            </p>
            <div className="mt-1">
              <CountdownDisplay
                endsAt={currentRound?.endsAt}
                status={currentRound?.status}
                onExpire={triggerTick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Latest Round Instant Outcome Notification Banner */}
      {lastSettledRound && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Last Round ({lastSettledRound.period}):</span>
            <span className="text-xs font-bold capitalize text-slate-800">
              {lastSettledRound.resultColor} {lastSettledRound.resultNumber}
            </span>
          </div>
          <ResultDot color={lastSettledRound.resultColor} />
        </div>
      )}

      {/* Betting Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            disabled={!isBettingActive}
            onClick={() => setPick(c)}
            className={`flex flex-col items-center justify-center rounded-2xl py-6 text-lg font-black capitalize text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${colorButtonClass[c]}`}
          >
            <span>{c}</span>
            <span className="text-xs font-normal opacity-80 mt-0.5">
              {c === "violet" ? "4.5x" : "2x"}
            </span>
          </button>
        ))}
      </div>

      {/* Open Bet(s) Highlight Box */}
      {openBets.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Active Open Bet ({openBets.length})
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-amber-800">
              Period {openBets[0]?.period}
            </span>
          </div>

          <div className="space-y-2">
            {openBets.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-2xl bg-white/95 px-3.5 py-2.5 text-xs shadow-2xs border border-amber-100"
              >
                <div className="flex items-center gap-2">
                  <ResultDot color={b.color} />
                  <div>
                    <span className="font-bold capitalize text-slate-800">{b.color}</span>
                    <span className="text-slate-400 text-xs mx-1">·</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(b.totalStake)}</span>
                    {b.quantity > 1 && (
                      <span className="text-slate-400 text-[11px] ml-1">({b.quantity}x)</span>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Waiting Result
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time User Bets Card */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">My Recent Bets</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Status
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-0.5 text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setBetTab("all")}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                betTab === "all" ? "bg-white font-bold text-slate-900 shadow-2xs" : "hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setBetTab("open")}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                betTab === "open" ? "bg-white font-bold text-slate-900 shadow-2xs" : "hover:text-slate-900"
              }`}
            >
              Open ({openBets.length})
            </button>
            <button
              type="button"
              onClick={() => setBetTab("settled")}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                betTab === "settled" ? "bg-white font-bold text-slate-900 shadow-2xs" : "hover:text-slate-900"
              }`}
            >
              Settled
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayedBets.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-3.5 text-xs transition-colors hover:bg-slate-50/50"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      colorMap[b.color] ?? "bg-slate-300"
                    }`}
                  />
                  <span className="font-bold capitalize text-slate-800">
                    {b.color}
                  </span>
                  <span className="font-mono text-slate-400">
                    ({b.period})
                  </span>
                </div>
                <p className="text-slate-500 mt-0.5">
                  Stake: {formatCurrency(b.totalStake)}
                  {b.quantity > 1 && ` (${b.quantity}x)`}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    b.status === "won"
                      ? "bg-emerald-100 text-emerald-800"
                      : b.status === "lost"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {b.status === "won"
                    ? `+${formatCurrency(b.payout ?? 0)}`
                    : b.status === "lost"
                    ? "Lost"
                    : "Open"}
                </span>
              </div>
            </div>
          ))}

          {!betsLoading && displayedBets.length === 0 && (
            <p className="p-6 text-center text-xs text-slate-400 font-medium">
              {betTab === "open"
                ? "No active open bets right now."
                : betTab === "settled"
                ? "No settled bets found."
                : "No bets placed yet. Choose a colour to place your first bet!"}
            </p>
          )}
        </div>

        {/* Load Previous Bets Action */}
        {hasMoreBets && userBets.length > 0 && betTab !== "open" && (
          <div className="border-t border-slate-100 bg-slate-50/60 p-3 text-center">
            <button
              type="button"
              disabled={betsLoadingMore}
              onClick={loadPreviousBets}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs border border-slate-200 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {betsLoadingMore ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                  <span>Loading previous bets...</span>
                </>
              ) : (
                <span>Load Previous Bets</span>
              )}
            </button>
          </div>
        )}

        {!hasMoreBets && userBets.length >= 5 && betTab !== "open" && (
          <div className="border-t border-slate-100 bg-slate-50/30 py-2.5 text-center text-[11px] font-medium text-slate-400">
            All previous bets loaded
          </div>
        )}
      </div>


      {/* Real-time Current Day Game History Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Game Record</h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            Today&apos;s Results ({calendarDate})
          </span>
        </div>

        <div className="grid grid-cols-3 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Period</span>
          <span className="text-center">Number</span>
          <span className="text-right">Result</span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
          {history.map((r) => (
            <HistoryRow key={r.id} round={r} />
          ))}

          {!history.length && (
            <p className="p-6 text-center text-xs text-slate-400 font-medium">
              No game records for today yet. New settled rounds will appear here.
            </p>
          )}
        </div>
      </div>

      {/* Modal Bet Sheet */}
      {pick && currentRound && (
        <BetSheet
          roundId={currentRound.id}
          color={pick}
          amounts={settings.betAmounts}
          onClose={() => setPick(null)}
        />
      )}
    </div>
  );
}
