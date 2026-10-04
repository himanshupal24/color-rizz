import { getAdminDb } from "@/lib/firebase/admin";
import type { Transaction } from "firebase-admin/firestore";

export interface AuditLogEntry {
  id?: string;
  adminUid: string;
  action: string;
  targetType: "round" | "user" | "recharge" | "withdraw" | "settings" | "reconciliation" | "referral_reward" | "system";
  targetId: string;
  timestamp: number;
  reason?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable audit log entry for admin actions.
 */
export async function logAdminAction(
  entry: Omit<AuditLogEntry, "timestamp">,
  tx?: Transaction,
): Promise<string> {
  const db = getAdminDb();
  if (!db) return "";

  const logRef = db.collection("audit_logs").doc();
  const fullEntry: Record<string, unknown> = {
    adminUid: entry.adminUid || "",
    action: entry.action || "",
    targetType: entry.targetType || "system",
    targetId: entry.targetId || "",
    timestamp: Date.now(),
    reason: entry.reason ?? "",
    oldValue: entry.oldValue !== undefined ? entry.oldValue : null,
    newValue: entry.newValue !== undefined ? entry.newValue : null,
    ip: entry.ip ?? "",
    metadata: entry.metadata !== undefined ? entry.metadata : null,
  };

  if (tx) {
    tx.set(logRef, fullEntry);
  } else {
    await logRef.set(fullEntry);
  }

  return logRef.id;
}
