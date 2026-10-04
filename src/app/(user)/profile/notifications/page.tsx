"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import type { AppNotification } from "@/lib/types";
import {
  ArrowLeft,
  Bell,
  Gift,
  Zap,
  Trophy,
  CheckCircle2,
  Sparkles,
  Clock,
  ShieldAlert,
  ChevronRight,
  Inbox,
} from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification));
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  function getNotificationIcon(title = "", body = "") {
    const text = (title + " " + body).toLowerCase();
    if (text.includes("referral") || text.includes("bonus") || text.includes("gift")) {
      return {
        icon: <Gift className="h-4 w-4 text-purple-600" />,
        bg: "bg-purple-50",
      };
    }
    if (text.includes("recharge") || text.includes("deposit") || text.includes("approved")) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        bg: "bg-emerald-50",
      };
    }
    if (text.includes("withdraw")) {
      return {
        icon: <Zap className="h-4 w-4 text-blue-600" />,
        bg: "bg-blue-50",
      };
    }
    if (text.includes("win") || text.includes("prize") || text.includes("congrat")) {
      return {
        icon: <Trophy className="h-4 w-4 text-amber-500" />,
        bg: "bg-amber-50",
      };
    }
    return {
      icon: <Bell className="h-4 w-4 text-blue-600" />,
      bg: "bg-blue-50",
    };
  }

  function formatNotificationTime(timestamp: number) {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }

  const filteredItems = items.filter((n) => {
    if (filter === "rewards") {
      const text = (n.title + " " + n.body).toLowerCase();
      return text.includes("bonus") || text.includes("referral") || text.includes("gift");
    }
    if (filter === "system") {
      const text = (n.title + " " + n.body).toLowerCase();
      return !text.includes("bonus") && !text.includes("referral");
    }
    return true;
  });

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
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span>Inbox & Updates</span>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-1 text-xs text-blue-100">
              Stay updated with your bonuses, deposit approvals, and game alerts
            </p>
          </div>
          {items.length > 0 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/20 font-mono text-xs font-bold backdrop-blur-md">
              {items.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Alerts" },
            { id: "rewards", label: "🎁 Rewards & Bonuses" },
            { id: "system", label: "⚡ System & Wallet" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 animate-pulse rounded-2xl bg-white p-4 shadow-xs" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-xs border border-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">You&apos;re All Caught Up!</h3>
            <p className="mt-1 text-xs text-slate-400">
              {filter === "all"
                ? "No new notifications or system alerts at this moment."
                : `No notifications found under "${filter}".`}
            </p>
            <Link
              href="/game"
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Play Win Go Now <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((n) => {
              const { icon, bg } = getNotificationIcon(n.title, n.body);
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-xs border border-slate-100 hover:border-blue-200 transition-all"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{n.title}</h4>
                      <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                        {formatNotificationTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
