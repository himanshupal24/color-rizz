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

  const body = (await request.json()) as { displayName?: string; phone?: string };
  const updateData: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (body.displayName !== undefined) {
    const rawName = body.displayName ?? "";
    const displayName = rawName.trim();

    if (displayName.length > 30) {
      return NextResponse.json(
        { error: "Display name cannot exceed 30 characters" },
        { status: 400 },
      );
    }

    if (displayName.length > 0 && !/^[a-zA-Z0-9\s._'-]{2,30}$/.test(displayName)) {
      return NextResponse.json(
        { error: "Name must be 2-30 characters (letters, numbers, spaces, dots, hyphens)" },
        { status: 400 },
      );
    }
    updateData.displayName = displayName;
  }

  if (body.phone !== undefined) {
    const rawPhone = String(body.phone ?? "").trim();
    if (rawPhone.length > 0) {
      const clean = rawPhone.replace(/\D/g, "");
      if (clean.length < 10 || clean.length > 13) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit mobile number" },
          { status: 400 },
        );
      }
      updateData.phone = clean.length === 10 ? `+91${clean}` : `+${clean}`;
    } else {
      updateData.phone = "";
    }
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const userRef = db.doc(`users/${decoded.uid}`);
    await userRef.update(updateData);

    return NextResponse.json({ ok: true, ...updateData });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
