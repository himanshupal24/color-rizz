"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type UserDirectoryEntry = {
  uid: string;
  email: string;
  phone?: string;
  displayName?: string;
  referralCode?: string;
};

/**
 * Live uid ↔ user profile directory for admin screens.
 * Replaces raw UIDs with registered emails & names in tables and dashboards.
 */
export function useUserDirectory(maxUsers = 1000) {
  const [usersByUid, setUsersByUid] = useState<Record<string, UserDirectoryEntry>>({});
  const [byIdentifier, setByIdentifier] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "users"), limit(maxUsers));
    return onSnapshot(
      q,
      (snap) => {
        const nextUsersByUid: Record<string, UserDirectoryEntry> = {};
        const nextByIdentifier: Record<string, string> = {};

        for (const doc of snap.docs) {
          const data = doc.data();
          const email = String(data.email ?? "").trim();
          const phone = String(data.phone ?? "").trim();
          const displayName = String(data.displayName ?? "").trim();
          const referralCode = String(data.referralCode ?? "").trim();

          const primaryId = email || phone || doc.id;

          const entry: UserDirectoryEntry = {
            uid: doc.id,
            email: primaryId,
            phone: phone || undefined,
            displayName: displayName || undefined,
            referralCode: referralCode || undefined,
          };

          nextUsersByUid[doc.id] = entry;

          if (email) {
            nextByIdentifier[email.toLowerCase()] = doc.id;
          }
          if (phone) {
            nextByIdentifier[phone] = doc.id;
            const digits = phone.replace(/\D/g, "");
            if (digits) nextByIdentifier[digits] = doc.id;
          }
        }

        setUsersByUid(nextUsersByUid);
        setByIdentifier(nextByIdentifier);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [maxUsers]);

  const phoneOf = useMemo(
    () => (uid?: string | null) => {
      if (!uid) return "—";
      return usersByUid[uid]?.email ?? usersByUid[uid]?.phone ?? uid;
    },
    [usersByUid],
  );

  const emailOf = useMemo(
    () => (uid?: string | null) => {
      if (!uid) return "—";
      return usersByUid[uid]?.email ?? uid;
    },
    [usersByUid],
  );

  const userOf = useMemo(
    () => (uid?: string | null): UserDirectoryEntry => {
      if (!uid) return { uid: "", email: "—" };
      return (
        usersByUid[uid] ?? {
          uid,
          email: uid,
        }
      );
    },
    [usersByUid],
  );

  const uidOfIdentifier = useMemo(
    () => (identifier?: string | null) => {
      if (!identifier) return undefined;
      const trimmed = identifier.trim().toLowerCase();
      return byIdentifier[trimmed] ?? byIdentifier[trimmed.replace(/\D/g, "")];
    },
    [byIdentifier],
  );

  return {
    usersByUid,
    byIdentifier,
    phoneOf,
    emailOf,
    userOf,
    uidOfIdentifier,
    loading,
  };
}
