"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import type { BankDetails } from "@/lib/types";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  User,
  Hash,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  QrCode,
} from "lucide-react";

export default function BankPage() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState<BankDetails>({
    accountName: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    upiId: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.bankDetails) {
      setForm({
        accountName: profile.bankDetails.accountName || "",
        accountNumber: profile.bankDetails.accountNumber || "",
        ifsc: profile.bankDetails.ifsc || "",
        bankName: profile.bankDetails.bankName || "",
        upiId: profile.bankDetails.upiId || "",
      });
    }
  }, [profile?.bankDetails]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !db) return;

    if (!form.accountName.trim()) {
      toast.error("Account holder name is required");
      return;
    }
    if (!form.accountNumber.trim() || form.accountNumber.trim().length < 8) {
      toast.error("Please enter a valid bank account number");
      return;
    }
    if (!form.ifsc.trim() || form.ifsc.trim().length < 5) {
      toast.error("Please enter a valid IFSC code");
      return;
    }
    if (!form.bankName.trim()) {
      toast.error("Bank name is required");
      return;
    }

    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          bankDetails: {
            accountName: form.accountName.trim(),
            accountNumber: form.accountNumber.trim(),
            ifsc: form.ifsc.trim().toUpperCase(),
            bankName: form.bankName.trim(),
            upiId: (form.upiId || "").trim(),
          },
        },
        { merge: true }
      );
      toast.success("Bank details saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank details");
    } finally {
      setLoading(false);
    }
  }

  const maskedAccount =
    form.accountNumber && form.accountNumber.length > 4
      ? "•••• •••• " + form.accountNumber.slice(-4)
      : form.accountNumber || "•••• •••• •••• ••••";

  return (
    <div className="flex-1 w-full pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-b-3xl text-white shadow-md">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-100 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile
        </Link>
        <div className="mt-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bank & Payment Card</h1>
          <p className="mt-1 text-xs text-blue-100">
            Link your bank account or UPI ID for fast withdrawal payouts
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Visual Bank Card Mockup */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl shadow-indigo-950/20 border border-white/10">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <span className="font-extrabold text-sm tracking-wider text-blue-200">
              {form.bankName || "BANK CARD"}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-300/30">
              <ShieldCheck className="h-3 w-3" />
              <span>VERIFIED</span>
            </div>
          </div>

          {/* Chip visual */}
          <div className="mt-4 flex items-center gap-2">
            <div className="h-7 w-10 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 shadow-inner border border-amber-500/40" />
            <Sparkles className="h-4 w-4 text-amber-300 opacity-60" />
          </div>

          {/* Account Number */}
          <div className="mt-4">
            <p className="font-mono text-lg sm:text-xl font-bold tracking-widest text-slate-100">
              {maskedAccount}
            </p>
          </div>

          {/* Cardholder & IFSC Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Card Holder</p>
              <p className="font-bold tracking-wide text-white uppercase truncate max-w-[160px]">
                {form.accountName || "YOUR FULL NAME"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">IFSC Code</p>
              <p className="font-mono font-bold text-white uppercase">
                {form.ifsc || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100 space-y-3.5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>Account Holder Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Bank Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. State Bank of India, HDFC, ICICI"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <CreditCard className="h-3.5 w-3.5 text-blue-600" />
              <span>Account Number</span>
            </label>
            <input
              type="text"
              placeholder="Enter full bank account number"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Hash className="h-3.5 w-3.5 text-blue-600" />
              <span>IFSC Code</span>
            </label>
            <input
              type="text"
              placeholder="e.g. SBIN0001234"
              value={form.ifsc}
              maxLength={11}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all uppercase font-mono"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <QrCode className="h-3.5 w-3.5 text-purple-600" />
              <span>UPI ID (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. yourname@oksbi / 9876543210@paytm"
              value={form.upiId || ""}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? "Saving Details..." : "Save Bank Details"}
          </button>
        </form>

        {/* Security Assurance Notice */}
        <div className="rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-indigo-900 leading-relaxed">
            <strong>Bank-Grade Encryption:</strong> Your payout details are encrypted and strictly used to transfer your game winnings securely.
          </p>
        </div>
      </div>
    </div>
  );
}
