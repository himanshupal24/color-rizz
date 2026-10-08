"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { calculateUserBalances } from "@/lib/referral-engine";
import {
  Gamepad2,
  Plane,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Bell,
  Eye,
  EyeOff,
  Flame,
  ShieldCheck,
  Zap,
  TrendingUp,
  Award,
  ChevronRight,
  Clock,
  CircleDot,
} from "lucide-react";

const WINNERS = [
  { phone: "98****3210", amount: "₹1,960", color: "green", time: "Just now" },
  { phone: "91****7842", amount: "₹4,500", color: "violet", time: "1 min ago" },
  { phone: "99****1124", amount: "₹980", color: "red", time: "2 mins ago" },
  { phone: "88****9051", amount: "₹2,940", color: "green", time: "3 mins ago" },
  { phone: "70****6329", amount: "₹1,470", color: "red", time: "4 mins ago" },
];

export default function HomePage() {
  const { profile } = useAuth();
  const balances = calculateUserBalances(profile || undefined);

  const [showBalance, setShowBalance] = useState(true);
  const [winnerIndex, setWinnerIndex] = useState(0);

  // Rotate winner marquee
  useEffect(() => {
    const interval = setInterval(() => {
      setWinnerIndex((prev) => (prev + 1) % WINNERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const displayName = profile?.displayName || "Player " + (profile?.phone?.slice(-4) || "");
  const initials = (profile?.displayName || profile?.phone || "U")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();

  const currentWinner = WINNERS[winnerIndex];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/90 px-4 py-3 shadow-xs backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold shadow-sm shadow-blue-500/20">
            <Flame className="h-5 w-5 text-yellow-300 fill-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-sm tracking-tight">WIN WIN GO</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Fast 30s Prediction Game</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </Link>

          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-extrabold shadow-sm"
          >
            {initials}
          </Link>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {/* User Greeting & Online Indicator */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Welcome back,</p>
            <h2 className="text-base font-bold text-slate-800">{displayName}</h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            <CircleDot className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span>1,840 Online</span>
          </div>
        </div>

        {/* Hero Wallet Balance Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-5 text-white shadow-xl shadow-indigo-950/15 border border-indigo-900/40">
          {/* Subtle glow background */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Total Playable Balance</span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
            <Link
              href="/wallet"
              className="text-[11px] font-semibold text-indigo-300 hover:text-white transition-colors flex items-center gap-0.5"
            >
              Wallet <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="relative mt-2">
            <p className="font-mono text-3xl font-extrabold tracking-tight">
              {showBalance ? formatCurrency(balances.playableBalance) : "₹ ••••••"}
            </p>
          </div>

          {/* Sub-balances breakdown */}
          <div className="relative mt-4 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur-md border border-white/10">
            <div>
              <span className="text-[10px] text-slate-300">Withdrawable: </span>
              <strong className="text-white font-semibold">
                {showBalance ? formatCurrency(balances.withdrawableBalance) : "••••"}
              </strong>
            </div>
            {balances.bonusBalance > 0 && (
              <div className="text-amber-300">
                <span className="text-[10px]">Bonus: </span>
                <strong className="font-semibold">
                  {showBalance ? formatCurrency(balances.bonusBalance) : "••••"}
                </strong>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            <Link
              href="/wallet/recharge"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:brightness-110 active:scale-95 transition-all"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Recharge
            </Link>
            <Link
              href="/wallet/withdraw"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/30 hover:brightness-110 active:scale-95 transition-all"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Link>
          </div>
        </div>

        {/* Live Ticker / Realtime Winners Feed */}
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-xs border border-slate-100 overflow-hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 overflow-hidden text-xs">
            <div className="flex items-center justify-between transition-all duration-500">
              <span className="truncate text-slate-600 font-medium">
                User <strong className="text-slate-800">{currentWinner.phone}</strong> won{" "}
                <strong
                  className={
                    currentWinner.color === "green"
                      ? "text-emerald-600"
                      : currentWinner.color === "red"
                      ? "text-rose-600"
                      : "text-purple-600"
                  }
                >
                  {currentWinner.amount}
                </strong>
              </span>
              <span className="shrink-0 text-[10px] text-slate-400 font-normal pl-2">
                {currentWinner.time}
              </span>
            </div>
          </div>
        </div>

        {/* Main Featured Game: Win Go Colour Prediction */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 text-white shadow-lg shadow-indigo-500/20">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-white/10 blur-xl" />

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm">
              <Flame className="h-3 w-3 text-yellow-300 fill-yellow-300" />
              HOT GAME · 30 SECONDS
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-100">
              <Clock className="h-3 w-3" />
              <span>Continuous</span>
            </div>
          </div>

          <h3 className="mt-3 text-xl font-black tracking-tight text-white">
            Win Go 30s Colour Prediction
          </h3>
          <p className="mt-1 text-xs text-blue-100 max-w-xs">
            Predict Green, Violet, or Red. Double or quadruple your stake instantly every 30 seconds!
          </p>

          {/* Color Chips Preview */}
          <div className="mt-4 flex items-center gap-2">
            <span className="flex-1 rounded-xl bg-emerald-500 py-1.5 text-center text-xs font-bold text-white shadow-inner">
              Green 2x
            </span>
            <span className="flex-1 rounded-xl bg-purple-600 py-1.5 text-center text-xs font-bold text-white shadow-inner">
              Violet 4.5x
            </span>
            <span className="flex-1 rounded-xl bg-rose-500 py-1.5 text-center text-xs font-bold text-white shadow-inner">
              Red 2x
            </span>
          </div>

          {/* Play Now CTA */}
          <Link
            href="/game"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-center text-sm font-extrabold text-blue-700 shadow-md hover:bg-blue-50 active:scale-98 transition-all"
          >
            <Gamepad2 className="h-4 w-4 text-blue-600" />
            ENTER GAME ROOM NOW
            <ChevronRight className="h-4 w-4 text-blue-600" />
          </Link>
        </div>

        {/* Promo Banner: Referral Reward */}
        <Link
          href="/profile/referral"
          className="group block overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 text-white shadow-md shadow-orange-500/15 active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100">
                    Invite & Earn
                  </span>
                  <span className="rounded-full bg-white px-1.5 py-0.2 text-[9px] font-bold text-orange-600">
                    ₹100 Free
                  </span>
                </div>
                <p className="text-sm font-bold text-white">Get ₹100 Bonus Per Friend</p>
                <p className="text-[10px] text-white/80">Immediately playable on registration!</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Game Categories */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">All Game Modes</h3>
            <span className="text-[11px] text-slate-400 font-medium">More coming soon</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Win Go Active */}
            <Link
              href="/game"
              className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xs border border-slate-100 hover:border-blue-200 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                  ACTIVE
                </span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-800">Win Go</h4>
              <p className="text-[11px] text-slate-400">Color prediction 30s</p>
            </Link>

            {/* Trx Win Go */}
            <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xs border border-slate-100 opacity-75">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                  SOON
                </span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-700">Trx Win Go</h4>
              <p className="text-[11px] text-slate-400">Blockchain hash rounds</p>
            </div>

            {/* Aviator Crash */}
            <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xs border border-slate-100 opacity-75">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Plane className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                  SOON
                </span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-700">Aviator</h4>
              <p className="text-[11px] text-slate-400">Cash out multiplier</p>
            </div>

            {/* Lucky Wheel */}
            <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xs border border-slate-100 opacity-75">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                  SOON
                </span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-700">Lucky Spin</h4>
              <p className="text-[11px] text-slate-400">Daily prize wheel</p>
            </div>
          </div>
        </div>

        {/* Security & Guarantees */}
        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-100">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-1">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">100% Fair</span>
              <span className="text-[9px] text-slate-400">Server verified</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-1">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Instant UPI</span>
              <span className="text-[9px] text-slate-400">Fast payout</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-1">
                <Award className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">24/7 Live</span>
              <span className="text-[9px] text-slate-400">Always active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
