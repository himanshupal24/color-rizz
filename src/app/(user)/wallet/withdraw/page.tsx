"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { calculateUserBalances } from "@/lib/referral-engine";
import { formatCurrency } from "@/lib/constants";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Lock,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Info,
  CheckCircle2,
} from "lucide-react";

const PRESET_AMOUNTS = [300, 500, 1000, 2000, 5000];

export default function WithdrawPage() {
  const { profile } = useAuth();
  const fetchAuth = useAuthedFetch();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const balances = calculateUserBalances(profile || undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 300) {
      toast.error("Minimum withdrawal amount is ₹300");
      return;
    }
    if (!profile?.bankDetails) {
      toast.error("Please add bank details before withdrawing");
      return;
    }
    if (balances.withdrawableBalance < num) {
      toast.error(
        `Insufficient withdrawable balance (₹${balances.withdrawableBalance.toFixed(2)} available)` +
        (balances.bonusBalance > 0 ? `. Bonus balance of ₹${balances.bonusBalance.toFixed(2)} is playable only.` : "")
      );
      return;
    }

    setLoading(true);
    const idempotencyKey = `withdraw_${profile?.uid}_${num}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetchAuth("/api/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: num, idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal failed");
      toast.success("Withdrawal request submitted successfully! Funds will be transferred shortly.");
      setAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  const hasBankDetails = Boolean(
    profile?.bankDetails?.accountNumber && profile?.bankDetails?.ifsc
  );

  return (
    <div className="flex-1 w-full pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-b-3xl text-white shadow-md">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-100 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Wallet
        </Link>
        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Direct Bank Transfer</span>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">Withdraw Funds</h1>
          <p className="mt-1 text-xs text-blue-100">
            Cash out winnings directly to your linked bank account or UPI
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Balances Card */}
        <div className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Available to Withdraw
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              Min ₹300
            </span>
          </div>
          <p className="mt-1 text-3xl font-black text-slate-800 font-mono">
            {formatCurrency(balances.withdrawableBalance)}
          </p>

          {balances.bonusBalance > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200/60">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Promotional bonus of <strong>{formatCurrency(balances.bonusBalance)}</strong> is playable in game rounds and cannot be directly withdrawn.
              </span>
            </div>
          )}
        </div>

        {/* Bank Account Destination */}
        {!hasBankDetails ? (
          <div className="rounded-3xl bg-amber-50 p-5 shadow-xs border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">No Bank Account Linked</h4>
                <p className="mt-0.5 text-xs text-amber-700">
                  Please link your bank account details before submitting a withdrawal request.
                </p>
                <Link
                  href="/profile/bank"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all"
                >
                  Link Bank Card <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-4 shadow-xs border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{profile?.bankDetails?.bankName}</p>
                <p className="font-mono text-xs text-slate-500">
                  •••• {profile?.bankDetails?.accountNumber?.slice(-4)} ({profile?.bankDetails?.ifsc})
                </p>
              </div>
            </div>
            <Link
              href="/profile/bank"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Change
            </Link>
          </div>
        )}

        {/* Preset Amount Chips */}
        <div className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Amount Selection
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amt) => {
              const selected = amount === String(amt);
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className={`rounded-2xl p-2.5 text-center font-mono font-extrabold text-xs transition-all active:scale-95 ${
                    selected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500"
                      : "bg-slate-50 text-slate-800 border border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  ₹{amt}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setAmount(String(Math.floor(balances.withdrawableBalance)))}
              className="rounded-2xl p-2.5 text-center font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all active:scale-95"
            >
              Max All
            </button>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">
                Withdrawal Amount (₹) — Minimum ₹300
              </label>
              <input
                type="number"
                min={300}
                placeholder="Enter amount (min ₹300)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !hasBankDetails}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading
                ? "Processing Withdrawal..."
                : `Submit Withdrawal ${amount ? `(₹${amount})` : ""}`}
            </button>
          </form>
        </div>

        {/* Withdrawal Rules */}
        <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span>Withdrawal Instructions & Terms:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-blue-900 list-disc list-inside">
            <li>Minimum withdrawal amount is <strong>₹300</strong>.</li>
            <li>Withdrawal requests are processed via direct IMPS bank transfer.</li>
            <li>Zero withdrawal fees. 100% of your requested amount is credited.</li>
            <li>Ensure bank account number and IFSC are correct to avoid transfer delays.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
