"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { calculateUserBalances } from "@/lib/referral-engine";
import { ArrowUpRight, ArrowDownLeft, History, Gift, Lock, ShieldCheck, ChevronRight } from "lucide-react";

export default function WalletPage() {
  const { profile } = useAuth();
  const balances = calculateUserBalances(profile || undefined);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-20">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">Wallet</h1>
      <p className="text-xs text-slate-500 mt-0.5">Manage your deposits, bonuses, and withdrawals</p>

      {/* Main Balance Card */}
      <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Total Playable Balance</span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
            Active
          </span>
        </div>
        <p className="mt-2 text-3xl font-extrabold tracking-tight">
          {formatCurrency(balances.playableBalance)}
        </p>

        {/* Balance Sub-breakdown */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-white/20 pt-4 text-xs">
          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-blue-100">Withdrawable Balance</p>
            <p className="mt-0.5 text-base font-bold text-white">
              {formatCurrency(balances.withdrawableBalance)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-blue-100 flex items-center gap-1">
              <Lock className="h-3 w-3 text-amber-300" />
              Bonus (Playable)
            </p>
            <p className="mt-0.5 text-base font-bold text-amber-200">
              {formatCurrency(balances.bonusBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/wallet/recharge"
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
        >
          <ArrowDownLeft className="h-4 w-4" />
          Recharge
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        >
          <ArrowUpRight className="h-4 w-4" />
          Withdraw
        </Link>
      </div>

      {/* Wallet Navigation Links */}
      <div className="mt-6 space-y-2.5">
        <Link
          href="/wallet/transactions"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Transaction History</p>
              <p className="text-xs text-slate-400">View recharges, bets, withdrawals & bonuses</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/profile/referral"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Referral Rewards</p>
              <p className="text-xs text-slate-400">Invite friends & earn ₹100 instant bonus</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/profile/bank"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Bank Card / UPI</p>
              <p className="text-xs text-slate-400">Manage withdrawal account details</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
