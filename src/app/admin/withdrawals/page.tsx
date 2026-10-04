"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { useUserDirectory } from "@/hooks/useUserDirectory";
import { formatCurrency } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import type { WithdrawalRequest } from "@/lib/types";
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  CreditCard,
  Building2,
  User,
  Mail,
  Phone,
} from "lucide-react";

export default function AdminWithdrawalsPage() {
  const fetchAuth = useAuthedFetch();
  const { userOf } = useUserDirectory();
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState<{
    id: string;
    action: "approve" | "reject";
    amount: number;
    userEmail: string;
    reason: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "withdrawals"),
      orderBy("createdAt", "desc"),
      limit(150),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithdrawalRequest));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  async function handleConfirmAction() {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const res = await fetchAuth("/api/admin/withdraw", {
        method: "PATCH",
        body: JSON.stringify({
          id: actionModal.id,
          action: actionModal.action,
          reason: actionModal.reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(actionModal.action === "approve" ? "Withdrawal approved & payout recorded!" : "Withdrawal rejected");
      setActionModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setProcessing(false);
    }
  }

  const filteredItems = items.filter((w) => {
    const userInfo = userOf(w.uid);
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    const matchesSearch =
      userInfo.phone?.toLowerCase().includes(search.toLowerCase()) ||
      userInfo.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      w.uid?.toLowerCase().includes(search.toLowerCase()) ||
      w.id?.toLowerCase().includes(search.toLowerCase()) ||
      w.bankSnapshot?.accountNumber?.toLowerCase().includes(search.toLowerCase()) ||
      w.bankSnapshot?.accountName?.toLowerCase().includes(search.toLowerCase()) ||
      w.bankSnapshot?.upiId?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = items.filter((w) => w.status === "pending").length;
  const approvedSum = items
    .filter((w) => w.status === "approved")
    .reduce((acc, w) => acc + (w.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Withdrawal Requests & Payouts</h1>
          <p className="text-xs text-slate-500">
            Process player cashout requests, review bank snapshots, and track payouts
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Pending Withdrawals</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-[11px] text-slate-400">Awaiting bank transfer</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Payouts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {formatCurrency(approvedSum)}
          </p>
          <p className="text-[11px] text-slate-400">Completed cashouts</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Requests</span>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{items.length}</p>
          <p className="text-[11px] text-slate-400">All submissions</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Active Filter</span>
            <Filter className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{filteredItems.length}</p>
          <p className="text-[11px] text-slate-400">Entries matching view</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl bg-white p-3 shadow-xs border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by User UID, Account Name, Number, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Player / Email</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Bank / Payout Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading withdrawal requests...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No withdrawal requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((w) => {
                  const userInfo = userOf(w.uid);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(w.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold text-xs">
                            <Mail className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[160px] sm:max-w-xs">
                              {userInfo.email}
                            </p>
                            {userInfo.displayName && (
                              <p className="text-[11px] text-slate-500">{userInfo.displayName}</p>
                            )}
                            {userInfo.phone && userInfo.phone !== userInfo.email && (
                              <p className="text-[10px] text-slate-400">Tel: {userInfo.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-extrabold text-slate-900">
                        {formatCurrency(w.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {w.bankSnapshot ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{w.bankSnapshot.accountName}</p>
                            <p className="text-[11px] text-slate-600">
                              {w.bankSnapshot.bankName} · <span className="font-mono">{w.bankSnapshot.accountNumber}</span>
                            </p>
                            <p className="font-mono text-[10px] text-slate-400">
                              IFSC: {w.bankSnapshot.ifsc} {w.bankSnapshot.upiId ? `· UPI: ${w.bankSnapshot.upiId}` : ""}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            w.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : w.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {w.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  id: w.id,
                                  action: "approve",
                                  amount: w.amount,
                                  userEmail: userInfo.email,
                                  reason: "",
                                })
                              }
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  id: w.id,
                                  action: "reject",
                                  amount: w.amount,
                                  userEmail: userInfo.email,
                                  reason: "",
                                })
                              }
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all border border-rose-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {actionModal.action === "approve" ? "Confirm Payout Approval" : "Reject Withdrawal Request"}
            </h3>
            <p className="text-xs text-slate-600">
              {actionModal.action === "approve"
                ? `Confirm that ${formatCurrency(actionModal.amount)} has been transferred to player (${actionModal.userEmail})?`
                : `Rejecting this will return ${formatCurrency(actionModal.amount)} to player (${actionModal.userEmail}) balance.`}
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Audit Reason / Bank Reference (Optional)</label>
              <textarea
                placeholder="e.g. IMPS Reference number / Transfer UTR"
                value={actionModal.reason}
                onChange={(e) =>
                  setActionModal({ ...actionModal, reason: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmAction}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs active:scale-95 transition-all ${
                  actionModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {processing
                  ? "Processing..."
                  : actionModal.action === "approve"
                  ? "Confirm Payout"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
