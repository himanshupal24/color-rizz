"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { GameRound } from "@/lib/types";

import {
  APP_TIMEZONE,
  getCalendarDateString,
  getMsUntilMidnight,
  getStartOfDay,
  getStartOfNextDay,
} from "@/lib/date-utils";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface GameSyncState {
  currentRound: GameRound | null;
  history: GameRound[];
  lastSettledRound: GameRound | null;
  calendarDate: string;
  connectionState: ConnectionState;
  loading: boolean;
}

// Global cached state and subscriber pattern to prevent duplicate listeners across components
let globalState: GameSyncState = {
  currentRound: null,
  history: [],
  lastSettledRound: null,
  calendarDate: getCalendarDateString(Date.now(), APP_TIMEZONE),
  connectionState: "connecting",
  loading: true,
};

const listeners = new Set<(state: GameSyncState) => void>();
let unsubscribeSnapshot: (() => void) | null = null;
let midnightTimerId: ReturnType<typeof setTimeout> | null = null;
let cachedAllRounds: GameRound[] = [];
let activeSubscriberCount = 0;

function notifySubscribers() {
  for (const listener of listeners) {
    listener(globalState);
  }
}

function computeDailyState(allRounds: GameRound[], now = Date.now()) {
  const currentDayStart = getStartOfDay(now, APP_TIMEZONE);
  const nextDayStart = getStartOfNextDay(now, APP_TIMEZONE);
  const calendarDate = getCalendarDateString(now, APP_TIMEZONE);

  // Active round crossing midnight continues normally
  const active =
    allRounds.find((r) => r.status === "betting" || r.status === "locked") ?? null;

  // Public history is strictly restricted to the current calendar day: [currentDayStart, nextDayStart)
  const settled = allRounds.filter(
    (r) =>
      r.status === "settled" &&
      (r.settledAt ?? r.startsAt) >= currentDayStart &&
      (r.settledAt ?? r.startsAt) < nextDayStart,
  );
  const latestSettled = settled[0] ?? null;

  return {
    currentRound: active,
    history: settled,
    lastSettledRound: latestSettled,
    calendarDate,
  };
}

function scheduleMidnightReset() {
  if (midnightTimerId) {
    clearTimeout(midnightTimerId);
    midnightTimerId = null;
  }

  const msUntilMidnight = getMsUntilMidnight(Date.now(), APP_TIMEZONE) + 100;

  midnightTimerId = setTimeout(() => {
    // When exactly 12:00 AM arrives, automatically reset public history view
    const computed = computeDailyState(cachedAllRounds, Date.now());
    globalState = {
      ...globalState,
      ...computed,
    };
    notifySubscribers();

    // Schedule next midnight check
    scheduleMidnightReset();
  }, msUntilMidnight);
}

function startGlobalListener() {
  if (!db || unsubscribeSnapshot) return;

  globalState = { ...globalState, connectionState: "connecting" };
  notifySubscribers();
  scheduleMidnightReset();

  const q = query(
    collection(db, "rounds"),
    orderBy("startsAt", "desc"),
    limit(50),
  );

  unsubscribeSnapshot = onSnapshot(
    q,
    (snap) => {
      cachedAllRounds = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as GameRound,
      );
      const computed = computeDailyState(cachedAllRounds, Date.now());

      globalState = {
        ...globalState,
        ...computed,
        connectionState: "connected",
        loading: false,
      };
      notifySubscribers();
    },
    (err) => {
      console.warn("Firestore round subscription error:", err);
      globalState = {
        ...globalState,
        connectionState: "disconnected",
        loading: false,
      };
      notifySubscribers();
    },
  );
}

function stopGlobalListener() {
  if (unsubscribeSnapshot && activeSubscriberCount === 0) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
    if (midnightTimerId) {
      clearTimeout(midnightTimerId);
      midnightTimerId = null;
    }
    cachedAllRounds = [];
    globalState = {
      ...globalState,
      connectionState: "disconnected",
    };
  }
}

/**
 * Unified persistent real-time hook that shares a single Firestore snapshot stream
 * with automatic network offline/online recovery and midnight reset.
 */
export function useGameSync(): GameSyncState {
  const [state, setState] = useState<GameSyncState>(globalState);

  useEffect(() => {
    activeSubscriberCount++;
    listeners.add(setState);

    if (activeSubscriberCount === 1) {
      startGlobalListener();
    } else {
      setState(globalState);
    }

    const handleOnline = () => {
      globalState = { ...globalState, connectionState: "reconnecting" };
      notifySubscribers();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      startGlobalListener();
    };

    const handleOffline = () => {
      globalState = { ...globalState, connectionState: "disconnected" };
      notifySubscribers();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      activeSubscriberCount--;
      listeners.delete(setState);
      if (activeSubscriberCount === 0) {
        stopGlobalListener();
      }
    };
  }, []);

  return state;
}

export function useCurrentRound(): GameRound | null {
  const { currentRound } = useGameSync();
  return currentRound;
}

export function useRoundHistory(): GameRound[] {
  const { history } = useGameSync();
  return history;
}

/**
 * High-performance authoritative countdown hook that does not trigger parent rerenders.
 */
export function useLocalCountdown(
  endsAt: number | undefined,
  onExpire?: () => void,
) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (!endsAt) return 0;
    return Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredFiredRef = useRef(false);

  useEffect(() => {
    if (!endsAt) {
      setSecondsRemaining(0);
      return;
    }

    expiredFiredRef.current = false;

    const calculate = () => {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    calculate();
    const intervalId = setInterval(calculate, 1000);

    return () => clearInterval(intervalId);
  }, [endsAt]);

  return secondsRemaining;
}

// Backward-compatible fallback export
export function useCountdown(endsAt?: number) {
  return useLocalCountdown(endsAt);
}
