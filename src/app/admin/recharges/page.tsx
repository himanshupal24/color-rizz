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
import type { RechargeRequest } from "@/lib/types";
import {
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";

export default function AdminRechargesPage() {
  const fetchAuth = useAuthedFetch();
  const { userOf } = useUserDirectory();
  const [items, setItems] = useState<RechargeRequest[]>([]);
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
      collection(db, "recharges"),
      orderBy("createdAt", "desc"),
      limit(150),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RechargeRequest));
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
      const res = await fetchAuth("/api/admin/recharge", {
        method: "PATCH",
        body: JSON.stringify({
          id: actionModal.id,
          action: actionModal.action,
          reason: actionModal.reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(actionModal.action === "approve" ? "Recharge approved & balance credited!" : "Recharge rejected");
      setActionModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setProcessing(false);
    }
  }

  const filteredItems = items.filter((r) => {
    const userInfo = userOf(r.uid);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch =
      userInfo.phone?.toLowerCase().includes(search.toLowerCase()) ||
      userInfo.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      r.uid?.toLowerCase().includes(search.toLowerCase()) ||
      r.utr?.toLowerCase().includes(search.toLowerCase()) ||
      r.id?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = items.filter((r) => r.status === "pending").length;
  const approvedSum = items
    .filter((r) => r.status === "approved")
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recharge Requests (UPI / Telegram)</h1>
          <p className="text-xs text-slate-500">
            Verify manual deposits, validate UTR reference numbers, and credit player wallets
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Pending Requests</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-[11px] text-slate-400">Awaiting verification</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Approved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {formatCurrency(approvedSum)}
          </p>
          <p className="text-[11px] text-slate-400">Credited deposits</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Recorded</span>
            <ArrowDownLeft className="h-4 w-4 text-blue-600" />
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
            placeholder="Search by Player Phone, Name, UTR number..."
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
                <th className="px-4 py-3">Player Details</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">UTR / Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading recharge requests...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No recharge requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((r) => {
                  const userInfo = userOf(r.uid);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 font-mono text-xs">{userInfo.phone}</p>
                            {userInfo.displayName && (
                              <p className="text-[11px] text-slate-500">{userInfo.displayName}</p>
                            )}
                            {userInfo.referralCode && (
                              <p className="text-[10px] text-slate-400">Code: {userInfo.referralCode}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-extrabold text-emerald-600">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {r.utr || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            r.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  id: r.id,
                                  action: "approve",
                                  amount: r.amount,
                                  userPhone: userInfo.phone,
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
                                  id: r.id,
                                  action: "reject",
                                  amount: r.amount,
                                  userPhone: userInfo.phone,
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
              {actionModal.action === "approve" ? "Approve Deposit Request" : "Reject Deposit Request"}
            </h3>
            <p className="text-xs text-slate-600">
              {actionModal.action === "approve"
                ? `Confirm crediting ${formatCurrency(actionModal.amount)} to player (${actionModal.userPhone})?`
                : `Are you sure you want to reject this deposit request for player (${actionModal.userPhone})?`}
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Audit Reason / Note (Optional)</label>
              <textarea
                placeholder="e.g. Verified via Telegram Support screenshot"
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
                  ? "Confirm & Credit"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
