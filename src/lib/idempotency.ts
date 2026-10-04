import type { Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export interface IdempotencyRecord {
  key: string;
  uid: string;
  endpoint: string;
  requestHash?: string;
  status: "in_progress" | "completed" | "failed";
  responseStatus?: number;
  responseBody?: unknown;
  createdAt: number;
  updatedAt: number;
}

/**
 * Checks if an idempotency key has already been executed.
 * If completed, returns the cached response.
 * If in_progress, throws an error to prevent concurrent race conditions.
 */
export async function checkIdempotency(
  key: string,
  uid: string,
  endpoint: string,
  tx?: Transaction,
): Promise<{ exists: boolean; record?: IdempotencyRecord }> {
  if (!key || typeof key !== "string" || key.length > 128) {
    return { exists: false };
  }

  const db = getAdminDb();
  if (!db) return { exists: false };

  const docRef = db.doc(`idempotency_keys/${key}`);
  const snap = tx ? await tx.get(docRef) : await docRef.get();

  if (!snap.exists) {
    return { exists: false };
  }

  const record = snap.data() as IdempotencyRecord;

  // Key belongs to a different user - security rejection
  if (record.uid !== uid || record.endpoint !== endpoint) {
    throw new Error("Invalid idempotency key ownership");
  }

  return { exists: true, record };
}

/**
 * Marks an idempotency key as completed with its response payload.
 */
export async function completeIdempotency(
  key: string,
  uid: string,
  endpoint: string,
  responseStatus: number,
  responseBody: unknown,
  tx?: Transaction,
): Promise<void> {
  if (!key || typeof key !== "string" || key.length > 128) return;

  const db = getAdminDb();
  if (!db) return;

  const docRef = db.doc(`idempotency_keys/${key}`);
  const record: IdempotencyRecord = {
    key,
    uid,
    endpoint,
    status: "completed",
    responseStatus,
    responseBody,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (tx) {
    tx.set(docRef, record);
  } else {
    await docRef.set(record);
  }
}
