"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/constants";
import { calculateUserBalances } from "@/lib/referral-engine";
import {
  User,
  Pencil,
  Copy,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  KeyRound,
  Gift,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Phone,
  Check,
  X,
  Lock,
} from "lucide-react";

export default function ProfilePage() {
  const { profile, user, logout } = useAuth();
  const balances = calculateUserBalances(profile || undefined);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setNameInput(profile.displayName);
    } else {
      setNameInput("");
    }
  }, [profile?.displayName]);

  function copyReferralCode() {
    if (!profile?.referralCode) return;
    void navigator.clipboard.writeText(profile.referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const trimmed = nameInput.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    if (trimmed.length > 30) {
      toast.error("Name cannot exceed 30 characters");
      return;
    }

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("Profile name updated successfully!");
      setEditModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile?.displayName || "Player " + (profile?.phone?.slice(-4) || "");
  const initials = (profile?.displayName || profile?.phone || "U")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex-1 w-full pb-6">
      {/* Top Profile Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-b-3xl text-white shadow-md">
        {/* Subtle decorative lights */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-purple-400/20 blur-lg" />

        <div className="relative">
          {/* User Info Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white/20 font-extrabold text-lg text-white shadow-inner backdrop-blur-md border border-white/30">
                {initials || <User className="h-6 w-6" />}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-indigo-600" />
              </div>

              {/* Name & Phone */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-bold tracking-tight text-white truncate max-w-[150px] sm:max-w-xs">
                    {displayName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(true)}
                    className="shrink-0 rounded-lg bg-white/20 p-1 text-blue-100 hover:bg-white/30 hover:text-white active:scale-95 transition-all"
                    title="Edit Name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-blue-100 font-medium">
                  <Phone className="h-3 w-3 opacity-80 shrink-0" />
                  <span className="truncate">{profile?.phone || "—"}</span>
                </div>
              </div>
            </div>

            {/* Role / VIP Badge */}
            {profile?.role === "admin" ? (
              <span className="shrink-0 rounded-full bg-amber-400/25 px-2.5 py-1 text-[10px] font-extrabold text-amber-200 border border-amber-300/40 backdrop-blur-sm">
                ADMIN
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-blue-100 border border-white/20 backdrop-blur-sm">
                VIP 1
              </span>
            )}
          </div>

          {/* Referral Code Chip Bar */}
          <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-yellow-300 shrink-0" />
              <span className="text-xs text-blue-100 font-medium shrink-0">Referral Code:</span>
              <span className="font-mono text-xs font-extrabold tracking-wider text-white truncate">
                {profile?.referralCode || "—"}
              </span>
            </div>
            <button
              type="button"
              onClick={copyReferralCode}
              className="shrink-0 flex items-center gap-1 rounded-xl bg-white/25 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/35 active:scale-95 transition-all shadow-xs"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedCode ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-4 px-4 pt-4">
        {/* Wallet Balance Snapshot Card */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Playable Balance</p>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-800">
                {formatCurrency(balances.playableBalance)}
              </p>
            </div>
            <Link
              href="/wallet"
              className="flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Wallet <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Sub Balances */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <div className="text-slate-600 font-medium">
              <span className="text-slate-400">Withdrawable: </span>
              <strong className="text-slate-800 font-bold">{formatCurrency(balances.withdrawableBalance)}</strong>
            </div>
            {balances.bonusBalance > 0 && (
              <div className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-lg">
                <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                <span>Bonus: </span>
                <strong className="font-bold">{formatCurrency(balances.bonusBalance)}</strong>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              href="/wallet/recharge"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Recharge
            </Link>
            <Link
              href="/wallet/withdraw"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Link>
          </div>
        </div>

        {/* Financial & Account Menu */}
        <div className="rounded-3xl bg-white p-2 shadow-xs border border-slate-100">
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Financial & Account</p>
          </div>
          <div className="divide-y divide-slate-100">
            <Link
              href="/wallet"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">My Wallet</p>
                  <p className="text-[10px] text-slate-400">Recharge & withdraw funds</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/wallet/transactions"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Transactions</p>
                  <p className="text-[10px] text-slate-400">All deposits, bets, wins & withdrawals</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/profile/bank"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Bank Card / UPI</p>
                  <p className="text-[10px] text-slate-400">Manage payout bank details</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Rewards & Security Menu */}
        <div className="rounded-3xl bg-white p-2 shadow-xs border border-slate-100">
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rewards & Security</p>
          </div>
          <div className="divide-y divide-slate-100">
            <Link
              href="/profile/referral"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Gift className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800">Refer & Earn</p>
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-700">
                      ₹100 Bonus
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Invite friends & earn rewards</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/profile/password"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Change Password</p>
                  <p className="text-[10px] text-slate-400">Update account login password</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/profile/notifications"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Notifications</p>
                  <p className="text-[10px] text-slate-400">System alerts & bonus updates</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Admin Center (if admin) */}
        {profile?.role === "admin" && (
          <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-2 border border-amber-200 shadow-xs">
            <Link
              href="/admin"
              className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-amber-100/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-black shadow-xs shrink-0">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Admin Control Center</p>
                  <p className="text-[10px] text-amber-700">Manage rounds, users, recharges & audits</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-800" />
            </Link>
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={async () => {
            await logout();
            toast.success("Logged out successfully");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white p-3.5 text-xs font-bold text-rose-600 shadow-xs border border-slate-100 hover:bg-rose-50 active:scale-98 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>

      {/* Edit Profile / Name Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Pencil className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Edit Profile Name</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Set a display name for your profile and leaderboard ranking.
            </p>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Display Name</label>
                <input
                  type="text"
                  placeholder="Enter your name (e.g. Alex Sharma)"
                  value={nameInput}
                  maxLength={30}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>2-30 characters</span>
                  <span>{nameInput.length}/30</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
