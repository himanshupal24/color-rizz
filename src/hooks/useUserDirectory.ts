"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type UserDirectoryEntry = {
  uid: string;
  phone: string;
  displayName?: string;
  referralCode?: string;
};

/**
 * Live uid ↔ user profile directory for admin screens.
 * Replaces raw UIDs with registered phone numbers & names in tables and dashboards.
 */
export function useUserDirectory(maxUsers = 1000) {
  const [usersByUid, setUsersByUid] = useState<Record<string, UserDirectoryEntry>>({});
  const [byPhone, setByPhone] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "users"), limit(maxUsers));
    return onSnapshot(
      q,
      (snap) => {
        const nextUsersByUid: Record<string, UserDirectoryEntry> = {};
        const nextByPhone: Record<string, string> = {};

        for (const doc of snap.docs) {
          const data = doc.data();
          const phone = String(data.phone ?? "").trim();
          const displayName = String(data.displayName ?? "").trim();
          const referralCode = String(data.referralCode ?? "").trim();

          const entry: UserDirectoryEntry = {
            uid: doc.id,
            phone: phone || doc.id,
            displayName: displayName || undefined,
            referralCode: referralCode || undefined,
          };

          nextUsersByUid[doc.id] = entry;

          if (phone) {
            nextByPhone[phone] = doc.id;
            const digits = phone.replace(/\D/g, "");
            if (digits) nextByPhone[digits] = doc.id;
          }
        }

        setUsersByUid(nextUsersByUid);
        setByPhone(nextByPhone);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [maxUsers]);

  const phoneOf = useMemo(
    () => (uid?: string | null) => {
      if (!uid) return "—";
      return usersByUid[uid]?.phone ?? uid;
    },
    [usersByUid],
  );

  const userOf = useMemo(
    () => (uid?: string | null): UserDirectoryEntry => {
      if (!uid) return { uid: "", phone: "—" };
      return (
        usersByUid[uid] ?? {
          uid,
          phone: uid,
        }
      );
    },
    [usersByUid],
  );

  const uidOfPhone = useMemo(
    () => (phone?: string | null) => {
      if (!phone) return undefined;
      const trimmed = phone.trim();
      return byPhone[trimmed] ?? byPhone[trimmed.replace(/\D/g, "")];
    },
    [byPhone],
  );

  return { usersByUid, byPhone, phoneOf, userOf, uidOfPhone, loading };
}
