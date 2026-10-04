import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function PATCH(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `profile-edit:${decoded.uid}:${ip}`,
    limit: 20,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many profile updates. Please wait a moment." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { displayName?: string };
  const rawName = body.displayName ?? "";
  const displayName = rawName.trim();

  if (displayName.length > 30) {
    return NextResponse.json(
      { error: "Display name cannot exceed 30 characters" },
      { status: 400 },
    );
  }

  // Allow empty string to clear name, or alphanumeric + spaces + basic symbols
  if (displayName.length > 0 && !/^[a-zA-Z0-9\s._'-]{2,30}$/.test(displayName)) {
    return NextResponse.json(
      { error: "Name must be 2-30 characters (letters, numbers, spaces, dots, hyphens)" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const userRef = db.doc(`users/${decoded.uid}`);
    await userRef.update({
      displayName,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ ok: true, displayName });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
