"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { formatCurrency } from "@/lib/constants";
import type { SystemReconciliationSummary } from "@/lib/reconciliation";
import {
  AdminTable,
  Badge,
  EmptyState,
  FilterChip,
  PageHeader,
  Panel,
  PanelHeader,
  StatCard,
  Td,
  Th,
} from "@/components/admin/AdminUI";

export default function ReconciliationPage() {
  const fetchAuth = useAuthedFetch();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<SystemReconciliationSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "discrepancies">("discrepancies");

  async function startAudit() {
    setRunning(true);
    try {
      const res = await fetchAuth("/api/admin/reconcile", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to run reconciliation");
      setSummary(data.report);
      toast.success("Reconciliation audit completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }

  const reports =
    summary?.userReports.filter((r) => {
      if (filter === "discrepancies") return r.status === "discrepancy";
      return true;
    }) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Audit wallet balances against the transaction ledger, bets, and recharge activity."
        actions={
          <Button onClick={startAudit} disabled={running}>
            {running ? "Running Audit..." : "Run Full System Audit"}
          </Button>
        }
      />

      {!summary ? (
        <Panel padding={false}>
          <EmptyState
            title="No audit run yet"
            description="Start a full system audit to compare wallet balances with the ledger."
          />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Users Audited" value={summary.totalUsersAudited} accent="slate" />
            <StatCard
              label="Discrepancies"
              value={summary.discrepantUsersCount}
              accent={summary.discrepantUsersCount > 0 ? "rose" : "emerald"}
            />
            <StatCard
              label="System Wallet Total"
              value={formatCurrency(summary.totalSystemBalance)}
              accent="blue"
            />
            <StatCard
              label="Ledger Sum Total"
              value={formatCurrency(summary.totalLedgerBalance)}
              accent="teal"
            />
          </div>

          <Panel padding={false}>
            <PanelHeader
              title="Account audit results"
              actions={
                <div className="flex gap-2">
                  <FilterChip
                    active={filter === "discrepancies"}
                    onClick={() => setFilter("discrepancies")}
                  >
                    Discrepancies ({summary.discrepantUsersCount})
                  </FilterChip>
                  <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                    All Accounts ({summary.totalUsersAudited})
                  </FilterChip>
                </div>
              }
            />

            {reports.length === 0 ? (
              <EmptyState
                title={
                  filter === "discrepancies"
                    ? "Zero discrepancies detected"
                    : "No accounts found"
                }
                description={
                  filter === "discrepancies"
                    ? "All wallet balances match the transaction ledger."
                    : undefined
                }
              />
            ) : (
              <AdminTable>
                <thead>
                  <tr>
                    <Th>User</Th>
                    <Th>Wallet Balance</Th>
                    <Th>Ledger Expected</Th>
                    <Th>Difference</Th>
                    <Th>Bets (Staked / Won)</Th>
                    <Th>Status & Issues</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr
                      key={r.userId}
                      className={r.status === "discrepancy" ? "bg-rose-50/40" : ""}
                    >
                      <Td>
                        <p className="font-bold text-slate-800">{r.phone}</p>
                      </Td>
                      <Td className="font-bold text-slate-900">
                        {formatCurrency(r.currentBalance)}
                      </Td>
                      <Td className="font-medium text-slate-700">
                        {formatCurrency(r.expectedLedgerBalance)}
                      </Td>
                      <Td>
                        <span
                          className={`font-bold ${
                            Math.abs(r.balanceDiff) > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {formatCurrency(r.balanceDiff)}
                        </span>
                      </Td>
                      <Td className="text-slate-600">
                        -{formatCurrency(r.totalBetsStaked)} / +
                        {formatCurrency(r.totalWinnings)}
                      </Td>
                      <Td>
                        {r.issues.length === 0 ? (
                          <Badge tone="emerald">Verified OK</Badge>
                        ) : (
                          <div className="space-y-1">
                            {r.issues.map((iss, i) => (
                              <p key={i} className="text-[11px] font-medium text-rose-600">
                                {iss}
                              </p>
                            ))}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
