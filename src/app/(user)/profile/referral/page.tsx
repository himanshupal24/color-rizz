"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { useAuth } from "@/context/AuthContext";
import { Copy, Users, Gift, Lock, CheckCircle2, Share2, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import type { ReferralReward } from "@/lib/types";

interface ReferralData {
  referralCode: string;
  referredBy?: string | null;
  balances: {
    cashBalance: number;
    bonusBalance: number;
    unlockedBonusBalance: number;
    playableBalance: number;
    withdrawableBalance: number;
    totalWagered: number;
  };
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    totalRewardsEarned: number;
    lockedBonusBalance: number;
    unlockedBonusBalance: number;
  };
  rewards: ReferralReward[];
  referredUsers: Array<{
    uid: string;
    phoneMasked: string;
    createdAt: number;
  }>;
}

export default function ReferralPage() {
  const { profile, user } = useAuth();
  const [qr, setQr] = useState("");
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputCode, setInputCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [hasAppliedRef, setHasAppliedRef] = useState(false);

  const referralCode = profile?.referralCode || data?.referralCode || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = referralCode ? `${origin}/register?ref=${referralCode}` : "";

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 220, margin: 1 })
      .then(setQr)
      .catch(() => undefined);
  }, [link]);

  useEffect(() => {
    async function fetchReferralStats() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/referrals", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load referral stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReferralStats();
  }, [user]);

  async function handleApplyReferralCode(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a referral code");
      return;
    }

    setApplyingCode(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/apply-referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode: cleanCode }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to apply referral code");
      }

      toast.success("Referral code applied successfully!");
      setInputCode("");
      setHasAppliedRef(true);
      const statsRes = await fetch("/api/user/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const json = await statsRes.json();
        setData(json);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply referral code");
    } finally {
      setApplyingCode(false);
    }
  }

  function copyCode() {
    if (!referralCode) return;
    void navigator.clipboard.writeText(referralCode);
    toast.success("Referral Code copied!");
  }

  function copyLink() {
    if (!link) return;
    void navigator.clipboard.writeText(link);
    toast.success("Referral Link copied!");
  }

  function shareWhatsApp() {
    if (!link) return;
    const msg = encodeURIComponent(
      `🎉 Join me on Win Win Go! Use my referral code *${referralCode}* to get ₹300 instant bonus:\n${link}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
  }

  return (
    <div className="flex-1 w-full pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-b-3xl text-white shadow-md">
        <Link href="/profile" className="inline-flex items-center text-xs font-semibold text-blue-100 hover:text-white">
          ← Back to Profile
        </Link>
        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>Invite & Earn ₹300</span>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">Referral Program</h1>
          <p className="mt-1 text-xs text-blue-100">
            Get ₹300 instant bonus directly into your game wallet for every friend you invite!
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Referral Code & Share Card */}
        <div className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100">
          <div className="flex flex-col items-center text-center">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Referral QR Code" className="h-44 w-44 rounded-xl border border-slate-200 p-1 shadow-inner" />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                Generating QR...
              </div>
            )}

            <div className="mt-4 w-full">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Your Referral Code</span>
              <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
                <span className="font-mono text-xl font-extrabold tracking-widest text-blue-600">
                  {referralCode || "—"}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </button>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Share2 className="h-4 w-4" />
                Share WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Apply Inviter's Referral Code Card */}
        {!profile?.referredBy && !data?.referredBy && !hasAppliedRef ? (
          <div className="rounded-3xl bg-white p-5 shadow-xs border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Have a Referral / Inviter Code?</h3>
                <p className="text-[11px] text-slate-500">
                  Enter your inviter&apos;s referral code to link your account. (Only 1 code allowed per user)
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyReferralCode} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. REF12345"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={applyingCode || !inputCode.trim()}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {applyingCode ? "Applying..." : "Apply Code"}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Inviter Referral Code Linked</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
              LOCKED (1 Max)
            </span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium">Total Invited</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800">
              {loading ? "..." : (data?.stats.totalReferrals ?? 0)}
            </p>
            <p className="text-[10px] text-slate-400">Registered users</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Gift className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">Total Rewards</span>
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-600">
              {loading ? "..." : `₹${data?.stats.totalRewardsEarned ?? 0}`}
            </p>
            <p className="text-[10px] text-slate-400">Promotional bonuses</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Lock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Bonus (Playable)</span>
            </div>
            <p className="mt-2 text-xl font-bold text-amber-600">
              {loading ? "..." : `₹${data?.balances.bonusBalance ?? profile?.bonusBalance ?? 0}`}
            </p>
            <p className="text-[10px] text-slate-400">Used first on bets</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium">Unlocked Bonus</span>
            </div>
            <p className="mt-2 text-xl font-bold text-indigo-600">
              {loading ? "..." : `₹${data?.balances.unlockedBonusBalance ?? profile?.unlockedBonusBalance ?? 0}`}
            </p>
            <p className="text-[10px] text-slate-400">Withdrawable cash</p>
          </div>
        </div>

        {/* How it works info card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4 border border-indigo-100/80">
          <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>How Referral Rewards Work</span>
          </div>
          <ul className="mt-2.5 space-y-1.5 text-xs text-indigo-800/90">
            <li className="flex items-start gap-1.5">
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <span><strong>₹300 Instant Bonus:</strong> Immediately credited to your playable bonus balance when your friend registers.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <span><strong>Bet Commission:</strong> Earn bonus credit on every bet placed by your referred friends (play-only balance).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <span><strong>Play First Advantage:</strong> Bets automatically deduct from your bonus balance first, keeping real money safe.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <span><strong>Fair Play Protected:</strong> Unique codes prevent duplicate or self-referrals.</span>
            </li>
          </ul>
        </div>

        {/* Invited Friends & Rewards History */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Recent Referrals</h2>
          {loading ? (
            <p className="mt-3 text-center text-xs text-slate-400">Loading history...</p>
          ) : !data?.referredUsers || data.referredUsers.length === 0 ? (
            <div className="mt-4 text-center py-6">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-medium text-slate-500">No referrals yet</p>
              <p className="text-[11px] text-slate-400">Share your link to invite your first friend!</p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {data.referredUsers.map((u) => (
                <div key={u.uid} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{u.phoneMasked}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <span>+₹300</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Credited
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
