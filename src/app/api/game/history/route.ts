import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  APP_TIMEZONE,
  getCalendarDateString,
  getStartOfDay,
  getStartOfNextDay,
} from "@/lib/date-utils";
import type { GameRound } from "@/lib/types";

export async function GET(request: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const requestedDate = url.searchParams.get("date"); // e.g. "2026-10-01"
  const requestedAll = url.searchParams.get("all") === "true";

  // Check if caller is admin
  const decoded = await verifyIdToken(
    request as import("next/server").NextRequest,
  );
  let isAdmin = false;
  if (decoded?.uid) {
    const userSnap = await db.doc(`users/${decoded.uid}`).get();
    isAdmin = userSnap.exists && userSnap.data()?.role === "admin";
  }

  const now = Date.now();

  let startBound: number;
  let endBound: number;
  let dateString: string;

  if (isAdmin && requestedAll) {
    // Admin request for all historical rounds
    const snap = await db
      .collection("rounds")
      .where("status", "==", "settled")
      .orderBy("settledAt", "desc")
      .limit(100)
      .get();

    const rounds = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as GameRound,
    );
    return NextResponse.json({
      rounds,
      mode: "admin_all",
      total: rounds.length,
    });
  } else if (isAdmin && requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    // Admin request for specific historical date
    const [y, m, d] = requestedDate.split("-").map(Number);
    const targetTimestamp = Date.UTC(y, m - 1, d, 12, 0, 0);
    startBound = getStartOfDay(targetTimestamp, APP_TIMEZONE);
    endBound = getStartOfNextDay(targetTimestamp, APP_TIMEZONE);
    dateString = requestedDate;
  } else {
    // NORMAL USERS / PUBLIC ACCESS: Strictly enforce current calendar day bounds
    // Ignore any client-provided date parameters to prevent bypass
    startBound = getStartOfDay(now, APP_TIMEZONE);
    endBound = getStartOfNextDay(now, APP_TIMEZONE);
    dateString = getCalendarDateString(now, APP_TIMEZONE);
  }

  const snap = await db
    .collection("rounds")
    .where("status", "==", "settled")
    .where("settledAt", ">=", startBound)
    .where("settledAt", "<", endBound)
    .orderBy("settledAt", "desc")
    .limit(100)
    .get();

  const rounds = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as GameRound,
  );

  return NextResponse.json({
    rounds,
    date: dateString,
    startOfDay: startBound,
    nextDayStart: endBound,
    total: rounds.length,
  });
}
