"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";
import { normalizePhone, phoneToAuthEmail } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  loginWithGoogle: (referralCode?: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    referralCode?: string,
    displayName?: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setProfileTick] = useState(0);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setProfile(null);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
      } else {
        setProfile(null);
      }
    });
    return () => unsub();
  }, [user]);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured");
    const clean = emailOrPhone.trim();
    const email = clean.includes("@")
      ? clean.toLowerCase()
      : phoneToAuthEmail(normalizePhone(clean));

    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const loginWithGoogle = useCallback(async (referralCode?: string) => {
    if (!auth) throw new Error("Firebase is not configured");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);

    // Sync Firestore document and process referral if new user
    const token = await cred.user.getIdToken();
    try {
      await fetch("/api/auth/google-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode }),
      });
    } catch {
      // Background sync non-blocking
    }
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      referralCode?: string,
      displayName?: string,
      phone?: string,
    ) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          referralCode,
          displayName,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Registration failed");
      }
      if (!auth) throw new Error("Firebase is not configured");
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    },
    [],
  );

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  const refreshProfile = useCallback(() => setProfileTick((t) => t + 1), []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured: isFirebaseConfigured,
      login,
      loginWithGoogle,
      signup,
      logout,
      refreshProfile,
    }),
    [user, profile, loading, login, loginWithGoogle, signup, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
