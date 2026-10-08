"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, SlidersHorizontal, Settings, ShieldCheck, Send, Gift, Clock, Sparkles } from "lucide-react";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { DEFAULT_GAME_SETTINGS } from "@/lib/constants";
import type { GameSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const fetchAuth = useAuthedFetch();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => setSettings({ ...DEFAULT_GAME_SETTINGS, ...s }))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchAuth("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Settings updated & audited successfully!");
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System & Platform Settings</h1>
        <p className="text-xs text-slate-500">
          Configure round durations, bet thresholds, Telegram recharge channels, and referral parameters
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Configuration Form */}
        <form onSubmit={onSubmit} className="lg:col-span-2 space-y-5">
          {/* Section 1: Game & Timing Configuration */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Game Rounds & Stake Limits</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Round Duration (Seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={settings.roundDurationSec}
                  onChange={(e) =>
                    setSettings({ ...settings, roundDurationSec: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-400">Default: 30s or 180s per round</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Quick Bet Chips (Comma Separated)
                </label>
                <input
                  type="text"
                  value={settings.betAmounts?.join(",") || "10,100,500,1000,5000"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      betAmounts: e.target.value
                        .split(",")
                        .map((n) => Number(n.trim()))
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-400">Values shown on the betting sheet</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Min Bet Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={settings.minBet}
                  onChange={(e) =>
                    setSettings({ ...settings, minBet: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Max Bet Amount (₹)</label>
                <input
                  type="number"
                  min={10}
                  value={settings.maxBet}
                  onChange={(e) =>
                    setSettings({ ...settings, maxBet: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Telegram Support & Payment Channels */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Telegram Support & Recharge Channels</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Official Telegram Support Link / Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://t.me/YourSupportHandle or @handle"
                  value={settings.telegramSupportUrl || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, telegramSupportUrl: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Used by players on the Recharge page to contact support
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Merchant UPI ID (Backup)
                </label>
                <input
                  type="text"
                  placeholder="e.g. merchant@upi"
                  value={settings.upiId || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, upiId: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Referral Program Configuration */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Gift className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">Referral Program Parameters</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Referral Registration Bonus (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.referralBonusAmount ?? 300}
                  onChange={(e) =>
                    setSettings({ ...settings, referralBonusAmount: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
                <p className="mt-1 text-[10px] text-slate-400">Instant promotional bonus credited to referrer</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Recharge Commission Bonus (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.referralBonusPercent}
                  onChange={(e) =>
                    setSettings({ ...settings, referralBonusPercent: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
                <p className="mt-1 text-[10px] text-slate-400">% bonus credited when referred friend recharges</p>
              </div>
            </div>
          </div>

          {/* Section 4: Audit Reason & Save */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Audit Reason / Justification (Logged to Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Updated Telegram Support Handle for VIP desk"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving Settings..." : "Save Platform Settings"}
            </button>
          </div>
        </form>

        {/* Snapshot Summary Sidebar */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <SlidersHorizontal className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Live Snapshot</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                <span className="text-slate-400">Round Cycle:</span>
                <span className="font-mono font-bold text-blue-400">{settings.roundDurationSec}s</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                <span className="text-slate-400">Bet Limits:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{settings.minBet} – ₹{settings.maxBet}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                <span className="text-slate-400">Referral Bonus:</span>
                <span className="font-mono font-bold text-purple-400">
                  ₹{settings.referralBonusAmount ?? 300} ({settings.referralBonusPercent}%)
                </span>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px] block">Telegram Handle:</span>
                <span className="font-mono text-xs font-bold text-indigo-300 break-all">
                  {settings.telegramSupportUrl || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
