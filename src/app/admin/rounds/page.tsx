"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { CountdownDisplay } from "@/components/game/CountdownDisplay";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { useCurrentRound } from "@/hooks/useGameRound";
import { db } from "@/lib/firebase/client";
import { formatCurrency } from "@/lib/constants";
import type { GameColor, GameRound, RoundStats } from "@/lib/types";
import {
  AdminTable,
  Badge,
  EmptyState,
  FilterChip,
  LoadingState,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  Td,
  Th,
} from "@/components/admin/AdminUI";

export default function AdminRoundsPage() {
  const fetchAuth = useAuthedFetch();
  const current = useCurrentRound();
  const [history, setHistory] = useState<GameRound[]>([]);
  const [filterMode, setFilterMode] = useState<"live" | "date" | "all">("live");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [stats, setStats] = useState<RoundStats | null>(null);
  const [color, setColor] = useState<GameColor>("green");
  const [number, setNumber] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db || filterMode !== "live") return;
    const q = query(collection(db, "rounds"), orderBy("startsAt", "desc"), limit(50));
    return onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRound));
    });
  }, [filterMode]);

  async function loadHistoricalRounds(date?: string, all?: boolean) {
    setFetchingHistory(true);
    try {
      let endpoint = "/api/game/history";
      if (all) endpoint += "?all=true";
      else if (date) endpoint += `?date=${encodeURIComponent(date)}`;
      const res = await fetchAuth(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch historical rounds");
      setHistory(data.rounds ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setFetchingHistory(false);
    }
  }

  useEffect(() => {
    if (!db || !current?.id) {
      setStats(null);
      return;
    }
    return onSnapshot(doc(db, "round_stats", current.id), (snap) => {
      if (snap.exists()) {
        setStats(snap.data() as RoundStats);
      } else {
        setStats({
          roundId: current.id,
          period: current.period,
          greenBetCount: 0,
          redBetCount: 0,
          violetBetCount: 0,
          totalBetCount: 0,
          greenAmount: 0,
          redAmount: 0,
          violetAmount: 0,
          totalAmount: 0,
          updatedAt: Date.now(),
        });
      }
    });
  }, [current?.id, current?.period]);

  async function setResult() {
    if (!current) {
      toast.error("No active round");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchAuth("/api/admin/round", {
        method: "PATCH",
        body: JSON.stringify({
          roundId: current.id,
          plannedColor: color,
          plannedNumber: number,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Result scheduled for this round");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rounds"
        description="Monitor live betting distribution, countdowns, and round history."
        actions={
          current ? (
            <Badge tone={current.status === "betting" ? "emerald" : "amber"}>
              {current.status}
            </Badge>
          ) : null
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Active Round
            </span>
            <h2 className="mt-1 font-mono text-xl font-bold text-slate-900">
              Period {current?.period ?? "—"}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              ID: {current?.id ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Authoritative Timer
            </p>
            <CountdownDisplay endsAt={current?.endsAt} status={current?.status} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Starts At"
            value={
              current?.startsAt ? new Date(current.startsAt).toLocaleTimeString() : "—"
            }
          />
          <MetricTile
            label="Betting Closes"
            value={
              current?.bettingClosesAt
                ? new Date(current.bettingClosesAt).toLocaleTimeString()
                : current?.endsAt
                  ? new Date(current.endsAt).toLocaleTimeString()
                  : "—"
            }
          />
          <MetricTile
            label="Ends At"
            value={current?.endsAt ? new Date(current.endsAt).toLocaleTimeString() : "—"}
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Live stakes distribution
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-blue-100/80 bg-blue-50/70 p-4">
              <span className="text-xs font-medium text-blue-600">Total Bets</span>
              <p className="mt-1 text-xl font-bold text-blue-950">
                {stats?.totalBetCount ?? 0}
              </p>
              <p className="mt-0.5 text-xs font-bold text-blue-700">
                {formatCurrency(stats?.totalAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/70 p-4">
              <span className="text-xs font-medium text-emerald-600">Green</span>
              <p className="mt-1 text-xl font-bold text-emerald-950">
                {stats?.greenBetCount ?? 0} bets
              </p>
              <p className="mt-0.5 text-xs font-bold text-emerald-700">
                {formatCurrency(stats?.greenAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100/80 bg-violet-50/70 p-4">
              <span className="text-xs font-medium text-violet-600">Violet</span>
              <p className="mt-1 text-xl font-bold text-violet-950">
                {stats?.violetBetCount ?? 0} bets
              </p>
              <p className="mt-0.5 text-xs font-bold text-violet-700">
                {formatCurrency(stats?.violetAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100/80 bg-rose-50/70 p-4">
              <span className="text-xs font-medium text-rose-600">Red</span>
              <p className="mt-1 text-xl font-bold text-rose-950">
                {stats?.redBetCount ?? 0} bets
              </p>
              <p className="mt-0.5 text-xs font-bold text-rose-700">
                {formatCurrency(stats?.redAmount ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Outcome schedule
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Optionally specify a planned outcome before round cutoff.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Color
              <select
                className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium"
                value={color}
                onChange={(e) => setColor(e.target.value as GameColor)}
              >
                <option value="green">Green</option>
                <option value="violet">Violet</option>
                <option value="red">Red</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Number
              <input
                type="number"
                min={0}
                max={9}
                className="ml-2 w-18 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium"
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
              />
            </label>
            <Button
              onClick={setResult}
              disabled={loading || !current || current.status !== "betting"}
            >
              Schedule Result
            </Button>
          </div>
        </div>
      </Panel>

      <Panel padding={false}>
        <PanelHeader
          title="Game rounds record"
          description={
            filterMode === "live"
              ? "Streaming live and recent rounds"
              : filterMode === "date"
                ? `Showing rounds for ${selectedDate || "selected date"}`
                : "Showing all historical rounds"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={filterMode === "live"} onClick={() => setFilterMode("live")}>
                Live & Recent
              </FilterChip>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedDate(val);
                    if (val) {
                      setFilterMode("date");
                      loadHistoricalRounds(val, false);
                    }
                  }}
                  className="bg-transparent text-xs font-medium text-slate-700 outline-none"
                />
              </div>
              <FilterChip
                active={filterMode === "all"}
                onClick={() => {
                  setFilterMode("all");
                  loadHistoricalRounds(undefined, true);
                }}
              >
                All History
              </FilterChip>
            </div>
          }
        />

        {fetchingHistory ? (
          <LoadingState label="Loading historical rounds..." />
        ) : history.length === 0 ? (
          <EmptyState
            title="No rounds found"
            description="Try another date filter or switch back to live mode."
          />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <Th>Period</Th>
                <Th>Status</Th>
                <Th>Result</Th>
                <Th>Time / Settled</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50/70">
                  <Td className="font-mono font-medium text-slate-700">{r.period}</Td>
                  <Td>
                    <Badge
                      tone={
                        r.status === "settled"
                          ? "slate"
                          : r.status === "locked"
                            ? "amber"
                            : "emerald"
                      }
                    >
                      {r.status}
                    </Badge>
                  </Td>
                  <Td className="font-semibold capitalize">
                    {r.resultColor ? `${r.resultColor} (${r.resultNumber ?? "-"})` : "—"}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {r.settledAt
                      ? new Date(r.settledAt).toLocaleString()
                      : r.startsAt
                        ? new Date(r.startsAt).toLocaleString()
                        : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  );
}
