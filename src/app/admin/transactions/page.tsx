"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useUserDirectory } from "@/hooks/useUserDirectory";
import { formatCurrency } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import type { Transaction } from "@/lib/types";
import {
  AdminTable,
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Td,
  Th,
} from "@/components/admin/AdminUI";

function statusTone(status: string) {
  if (status === "completed" || status === "success" || status === "approved") return "emerald" as const;
  if (status === "pending") return "amber" as const;
  if (status === "failed" || status === "rejected") return "rose" as const;
  return "slate" as const;
}

function typeTone(type: string) {
  if (type.includes("recharge") || type.includes("credit") || type.includes("win")) return "emerald" as const;
  if (type.includes("withdraw") || type.includes("bet") || type.includes("debit")) return "amber" as const;
  return "blue" as const;
}

export default function AdminTransactionsPage() {
  const { phoneOf } = useUserDirectory();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Latest wallet ledger movements across recharges, bets, winnings, and withdrawals."
        actions={
          <Badge tone="slate">{items.length} recent</Badge>
        }
      />

      <Panel padding={false}>
        <PanelHeader
          title="Ledger feed"
          description="Streaming the most recent 100 transactions"
        />
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading transactions…</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Wallet activity will appear here as users play and move funds."
          />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Player / Email</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Time</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50/70">
                  <Td>
                    <Badge tone={typeTone(t.type)}>{t.type}</Badge>
                  </Td>
                  <Td className="font-semibold text-slate-800">{phoneOf(t.uid)}</Td>
                  <Td className="font-semibold text-slate-900">
                    {formatCurrency(t.amount)}
                  </Td>
                  <Td>
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  );
}
