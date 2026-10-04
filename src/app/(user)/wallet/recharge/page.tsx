"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { DEFAULT_GAME_SETTINGS, formatCurrency, normalizeTelegramUrl } from "@/lib/constants";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  Sparkles,
  ArrowDownLeft,
  MessageCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

const PRESET_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

export default function RechargePage() {
  const { profile } = useAuth();
  const fetchAuth = useAuthedFetch();
  const [amount, setAmount] = useState("500");
  const [utr, setUtr] = useState("");
  const [telegramUrl, setTelegramUrl] = useState(DEFAULT_GAME_SETTINGS.telegramSupportUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.telegramSupportUrl) setTelegramUrl(s.telegramSupportUrl);
      })
      .catch(() => undefined);
  }, []);

  function handleOpenTelegram() {
    const rawUrl = telegramUrl || "https://t.me/";
    const normalized = normalizeTelegramUrl(rawUrl);
    if (!normalized) {
      toast.error("Support handle not configured");
      return;
    }
    const userIdentifier = profile?.email || profile?.phone || "User";
    const message = encodeURIComponent(
      `Hello Support, I want to recharge ₹${amount} on Color Rizz for account: ${userIdentifier}`
    );
    const fullUrl = normalized.includes("?")
      ? `${normalized}&text=${message}`
      : `${normalized}?text=${message}`;
    window.open(fullUrl, "_blank");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 100) {
      toast.error("Minimum deposit amount is ₹100");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAuth("/api/wallet/recharge", {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          utr: utr.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit recharge");
      toast.success("Recharge request submitted! Support will verify on Telegram and credit your wallet.");
      setUtr("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

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
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>Telegram Support Payment</span>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">Recharge Wallet</h1>
          <p className="mt-1 text-xs text-blue-100">
            Pay securely through verified Telegram Support. Fast approval and instant wallet credit.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Step 1: Select Deposit Amount */}
        <div className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Select Deposit Amount
            </label>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Min ₹100
            </span>
          </div>

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
          </div>

          <div className="mt-3.5">
            <label className="text-[11px] font-semibold text-slate-600">Custom Amount (₹)</label>
            <input
              type="number"
              min={100}
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        {/* Step 2: Contact Support on Telegram */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 p-5 text-white shadow-lg border border-indigo-700/40">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">2. Pay via Telegram Support</h3>
              <p className="text-[11px] text-blue-200">Official 24/7 Recharge Channel</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-blue-100 leading-relaxed">
            Click below to contact our verified Telegram representative. You will receive active UPI/Bank payment details on chat.
          </p>

          <button
            type="button"
            onClick={handleOpenTelegram}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-98 transition-all"
          >
            <Send className="h-4 w-4" />
            Open Telegram Support (₹{amount})
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>

        {/* Step 3: Submit Verification Form */}
        <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              3. Submit Deposit Confirmation
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter your payment UTR / reference after completing the transfer on Telegram.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              UTR / Reference Number (12 Digits)
            </label>
            <input
              type="text"
              placeholder="e.g. 423987123456"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? "Submitting Request..." : `Submit Deposit Request (₹${amount})`}
          </button>
        </form>

        {/* 3-Step Visual Flow Guide */}
        <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 mb-2.5">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <span>Recharge Flow Guide:</span>
          </div>

          <div className="space-y-2 text-xs text-blue-900">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                1
              </span>
              <span>
                <strong>Contact Support:</strong> Click &quot;Open Telegram Support&quot; to connect directly with the official team.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                2
              </span>
              <span>
                <strong>Pay & Verify:</strong> Transfer via the payment details provided on Telegram and share your payment receipt.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                3
              </span>
              <span>
                <strong>Instant Credit:</strong> Support verifies your payment and approves the deposit to your wallet balance.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
