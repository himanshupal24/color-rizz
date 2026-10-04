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
import { formatCurrency } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import type { Transaction, TransactionType } from "@/lib/types";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Gamepad2,
  Trophy,
  Gift,
  History,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, "transactions"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const filteredItems = items.filter((t) => {
    if (filterType === "all") return true;
    return t.type === filterType;
  });

  function getTransactionIcon(type: TransactionType) {
    switch (type) {
      case "recharge":
        return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
      case "withdraw":
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      case "win":
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case "referral":
        return <Gift className="h-4 w-4 text-purple-600" />;
      case "bet":
      default:
        return <Gamepad2 className="h-4 w-4 text-slate-600" />;
    }
  }

  function getTransactionIconBg(type: TransactionType) {
    switch (type) {
      case "recharge":
        return "bg-emerald-50";
      case "withdraw":
        return "bg-blue-50";
      case "win":
        return "bg-amber-50";
      case "referral":
        return "bg-purple-50";
      case "bet":
      default:
        return "bg-slate-100";
    }
  }

  function isCredit(type: TransactionType) {
    return type === "recharge" || type === "win" || type === "referral";
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="mt-1 text-xs text-blue-100">
            Real-time record of your deposits, bets, payouts, and bonuses
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "recharge", label: "Deposits" },
            { id: "withdraw", label: "Withdrawals" },
            { id: "bet", label: "Bets" },
            { id: "win", label: "Wins" },
            { id: "referral", label: "Bonuses" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filterType === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-18 animate-pulse rounded-2xl bg-white p-4 shadow-xs" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-xs border border-slate-100">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <History className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-700">No Transactions Found</h3>
            <p className="mt-1 text-xs text-slate-400">
              {filterType === "all"
                ? "You haven't made any transactions yet."
                : `No transactions found under "${filterType}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((t) => {
              const credit = isCredit(t.type);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-xs border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getTransactionIconBg(
                        t.type
                      )}`}
                    >
                      {getTransactionIcon(t.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 capitalize truncate">
                          {t.type === "recharge"
                            ? "Deposit"
                            : t.type === "withdraw"
                            ? "Withdrawal"
                            : t.type === "referral"
                            ? "Referral Bonus"
                            : t.type}
                        </span>
                        {t.status === "pending" ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-600">
                            <Clock className="h-2.5 w-2.5" /> Pending
                          </span>
                        ) : t.status === "rejected" ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-600">
                            <XCircle className="h-2.5 w-2.5" /> Rejected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                        {t.note || new Date(t.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <p
                      className={`font-mono text-sm font-extrabold ${
                        credit ? "text-emerald-600" : "text-slate-800"
                      }`}
                    >
                      {credit ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(t.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
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
