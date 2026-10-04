"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import {
  Activity,
  CircleDot,
  Users,
  Wallet,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import {
  Badge,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatCard,
} from "@/components/admin/AdminUI";

interface SystemTelemetry {
  uptimeHuman: string;
  totalBetsPlaced: number;
  failedBets: number;
  duplicateRequestsPrevented: number;
  failedSettlements: number;
  roundCreationFailures: number;
  firestoreErrors: number;
  rateLimitBlocks: number;
  averageApiLatencyMs: number;
  status: "healthy" | "degraded";
}

export default function AdminDashboardPage() {
  const fetchAuth = useAuthedFetch();
  const [stats, setStats] = useState({
    users: 0,
    recharges: 0,
    withdrawals: 0,
    rounds: 0,
  });
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);

  useEffect(() => {
    if (!db) return;
    void (async () => {
      const [users, recharges, withdrawals, rounds] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "recharges")),
        getCountFromServer(collection(db, "withdrawals")),
        getCountFromServer(collection(db, "rounds")),
      ]);
      setStats({
        users: users.data().count,
        recharges: recharges.data().count,
        withdrawals: withdrawals.data().count,
        rounds: rounds.data().count,
      });
    })();
  }, []);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetchAuth("/api/admin/metrics");
        const data = await res.json();
        if (res.ok) setTelemetry(data.metrics);
      } catch (err) {
        console.error("Telemetry fetch error:", err);
      }
    }
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 15000);
    return () => clearInterval(interval);
  }, [fetchAuth]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform overview and live system reliability telemetry."
        actions={
          telemetry ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs shadow-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  telemetry.status === "healthy"
                    ? "animate-pulse bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
              <span className="font-semibold text-slate-700">
                System {telemetry.status}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">Uptime {telemetry.uptimeHuman}</span>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats.users}
          accent="slate"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Total Recharges"
          value={stats.recharges}
          accent="blue"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Total Withdrawals"
          value={stats.withdrawals}
          accent="amber"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Total Game Rounds"
          value={stats.rounds}
          accent="emerald"
          icon={<CircleDot className="h-4 w-4" />}
        />
      </div>

      {telemetry ? (
        <Panel padding={false}>
          <PanelHeader
            title="System Reliability"
            description="Live indicators for latency, idempotency, rate limiting, and settlement health."
            actions={
              <Badge tone={telemetry.status === "healthy" ? "emerald" : "rose"}>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {telemetry.status}
                </span>
              </Badge>
            }
          />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
            <MetricTile
              label="Avg API Latency"
              value={`${telemetry.averageApiLatencyMs} ms`}
            />
            <MetricTile
              label="Duplicates Blocked"
              value={telemetry.duplicateRequestsPrevented}
              valueClassName="text-emerald-700"
            />
            <MetricTile
              label="Rate Limit Blocks"
              value={telemetry.rateLimitBlocks}
              valueClassName="text-amber-700"
            />
            <MetricTile label="Total Bets Placed" value={telemetry.totalBetsPlaced} />
            <MetricTile
              label="Failed Bets"
              value={telemetry.failedBets}
              valueClassName={telemetry.failedBets > 0 ? "text-rose-600" : undefined}
            />
            <MetricTile
              label="Failed Settlements"
              value={telemetry.failedSettlements}
              valueClassName={
                telemetry.failedSettlements > 0 ? "text-rose-600" : "text-emerald-700"
              }
            />
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
            <Activity className="h-3.5 w-3.5 text-teal-600" />
            Auto-refreshes every 15 seconds
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
