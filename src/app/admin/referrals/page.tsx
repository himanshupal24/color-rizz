"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Gift,
  ShieldAlert,
  CheckCircle2,
  Search,
  RefreshCw,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/constants";
import type { ReferralReward, ReferralRewardStatus } from "@/lib/types";
import {
  AdminTable,
  Badge,
  EmptyState,
  LoadingState,
  PageHeader,
  Panel,
  PanelHeader,
  StatCard,
  Td,
  Th,
} from "@/components/admin/AdminUI";

interface AdminReferralData {
  summary: {
    totalRewardsDistributed: number;
    totalRewardsCount: number;
    uniqueReferrersCount: number;
    uniqueReferredCount: number;
    creditedCount: number;
    unlockedCount: number;
    pendingCount: number;
    totalWagerRequirementSum: number;
  };
  rewards: ReferralReward[];
}

function statusTone(status: string) {
  if (status === "credited") return "blue" as const;
  if (status === "unlocked") return "emerald" as const;
  if (status === "pending") return "amber" as const;
  return "rose" as const;
}

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overrideModal, setOverrideModal] = useState<{
    reward: ReferralReward;
    newStatus: ReferralRewardStatus;
    reason: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load referral records");
      }
    } catch {
      toast.error("Network error fetching referral data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  async function handleStatusOverride() {
    if (!overrideModal || !user) return;
    if (!overrideModal.reason.trim()) {
      toast.error("Please provide an audit reason for the override");
      return;
    }

    setProcessing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rewardId: overrideModal.reward.id,
          newStatus: overrideModal.newStatus,
          reason: overrideModal.reason,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Override failed");

      toast.success("Referral reward status updated & audited");
      setOverrideModal(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    } finally {
      setProcessing(false);
    }
  }

  const filteredRewards = (data?.rewards || []).filter((r) => {
    const matchesSearch =
      r.referrerPhone?.toLowerCase().includes(search.toLowerCase()) ||
      r.referredPhone?.toLowerCase().includes(search.toLowerCase()) ||
      r.referrerUid?.toLowerCase().includes(search.toLowerCase()) ||
      r.referredUid?.toLowerCase().includes(search.toLowerCase()) ||
      r.id?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        description="Monitor promotional referral rewards, wagering progress, and conversions."
        actions={
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Bonus Distributed"
          value={formatCurrency(data?.summary.totalRewardsDistributed ?? 0)}
          hint={`${data?.summary.totalRewardsCount ?? 0} total reward claims`}
          accent="violet"
          icon={<Gift className="h-4 w-4" />}
        />
        <StatCard
          label="Referred Users"
          value={data?.summary.uniqueReferredCount ?? 0}
          hint={`from ${data?.summary.uniqueReferrersCount ?? 0} active referrers`}
          accent="blue"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Credited / Playable"
          value={data?.summary.creditedCount ?? 0}
          hint="Available to play"
          accent="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Unlocked (Withdrawable)"
          value={data?.summary.unlockedCount ?? 0}
          hint="Wagered & ready to cash out"
          accent="amber"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      <Panel className="!p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone or reward ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none ring-teal-600/20 focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none ring-teal-600/20 focus:ring-2"
            >
              <option value="all">All Statuses</option>
              <option value="credited">Credited (Playable)</option>
              <option value="unlocked">Unlocked (Withdrawable)</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Panel>

      <Panel padding={false}>
        <PanelHeader
          title="Rewards ledger"
          description={`${filteredRewards.length} matching records`}
        />
        {loading ? (
          <LoadingState label="Loading referral rewards..." />
        ) : filteredRewards.length === 0 ? (
          <EmptyState
            title="No referral records found"
            description="Try clearing filters or wait for new referral rewards."
          />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Referrer</Th>
                <Th>Referred User</Th>
                <Th>Bonus Amount</Th>
                <Th>Status</Th>
                <Th>Wagering Progress</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRewards.map((reward) => (
                <tr key={reward.id} className="transition-colors hover:bg-slate-50/70">
                  <Td className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(reward.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-800">
                      {reward.referrerPhone || "Unknown"}
                    </p>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-800">
                      {reward.referredPhone || "Unknown"}
                    </p>
                  </Td>
                  <Td className="font-bold text-slate-800">₹{reward.amount}</Td>
                  <Td>
                    <Badge tone={statusTone(reward.status)}>{reward.status}</Badge>
                  </Td>
                  <Td>
                    <div className="w-28">
                      <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                        <span>₹{reward.wagerProgress ?? 0}</span>
                        <span>₹{reward.wagerRequirement ?? reward.amount}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{
                            width: `${Math.min(
                              100,
                              ((reward.wagerProgress ?? 0) /
                                (reward.wagerRequirement || reward.amount || 1)) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideModal({
                          reward,
                          newStatus: reward.status === "unlocked" ? "credited" : "unlocked",
                          reason: "",
                        })
                      }
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-200 active:scale-95"
                    >
                      Override
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>

      {overrideModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">
              Admin Referral Status Override
            </h3>
            <p className="text-xs text-slate-500">
              Manually adjusting status for reward{" "}
              <span className="font-mono font-semibold">{overrideModal.reward.id}</span>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700">Target Status</label>
              <select
                value={overrideModal.newStatus}
                onChange={(e) =>
                  setOverrideModal({
                    ...overrideModal,
                    newStatus: e.target.value as ReferralRewardStatus,
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="credited">Credited (Playable)</option>
                <option value="unlocked">Unlocked (Withdrawable)</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Audit Reason (Required)
              </label>
              <textarea
                placeholder="State the justification for this administrative override..."
                value={overrideModal.reason}
                onChange={(e) =>
                  setOverrideModal({ ...overrideModal, reason: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none ring-teal-600/20 focus:ring-2"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleStatusOverride}
                className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 active:scale-95"
              >
                {processing ? "Saving..." : "Confirm Override"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
