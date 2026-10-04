"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase/client";
import { normalizePhone, phoneToAuthEmail } from "@/lib/constants";
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function PasswordPage() {
  const { profile } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMinLength = newPassword.length >= 6;
  const hasLetterAndNumber =
    /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const isMatching = newPassword.length > 0 && newPassword === confirm;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!oldPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (!auth?.currentUser || (!profile?.email && !profile?.phone && !auth.currentUser.email)) {
      toast.error("User session expired. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const email =
        auth.currentUser.email ||
        profile?.email ||
        (profile?.phone ? phoneToAuthEmail(normalizePhone(profile.phone)) : "");
      const cred = EmailAuthProvider.credential(email, oldPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("wrong-password") || err.message.includes("invalid-credential")
            ? "Current password is incorrect"
            : err.message
          : "Password update failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Account Security</span>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">Change Password</h1>
          <p className="mt-1 text-xs text-blue-100">
            Keep your account secure with a strong and unique login password
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Form Card */}
        <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-xs border border-slate-100 space-y-4">
          {/* Current Password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <KeyRound className="h-3.5 w-3.5 text-blue-600" />
              <span>Current Password</span>
            </label>
            <div className="relative mt-1">
              <input
                type={showOld ? "text" : "password"}
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-10 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              <span>New Password</span>
            </label>
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-10 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-3.5 w-3.5 text-purple-600" />
              <span>Confirm New Password</span>
            </label>
            <div className="relative mt-1">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-10 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Live Validation Checklist */}
          {newPassword.length > 0 && (
            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    isMinLength ? "text-emerald-500" : "text-slate-300"
                  }`}
                />
                <span className={isMinLength ? "text-emerald-700 font-medium" : "text-slate-500"}>
                  At least 6 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    hasLetterAndNumber ? "text-emerald-500" : "text-slate-300"
                  }`}
                />
                <span className={hasLetterAndNumber ? "text-emerald-700 font-medium" : "text-slate-500"}>
                  Contains letters and numbers
                </span>
              </div>
              {confirm.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${
                      isMatching ? "text-emerald-500" : "text-rose-400"
                    }`}
                  />
                  <span className={isMatching ? "text-emerald-700 font-medium" : "text-rose-600"}>
                    {isMatching ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </form>

        {/* Security Advisory */}
        <div className="rounded-2xl bg-blue-50/70 p-3.5 border border-blue-100 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-blue-900 leading-relaxed">
            <strong>Security Reminder:</strong> Never share your password or OTP with anyone. Our support team will never ask for your login password.
          </p>
        </div>
      </div>
    </div>
  );
}
