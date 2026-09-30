"use client";

import { useCallback } from "react";
import { auth } from "@/lib/firebase/client";

export function useAuthedFetch() {
  return useCallback(async (input: RequestInfo, init?: RequestInit) => {
    const user = auth?.currentUser;
    if (!user) throw new Error("Not signed in");
    const token = await user.getIdToken();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(input, { ...init, headers });
  }, []);
}
