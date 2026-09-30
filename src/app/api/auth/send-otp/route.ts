import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { normalizePhone } from "@/lib/constants";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string };
  const phone = body.phone ? normalizePhone(body.phone) : "";
  if (!phone || phone.length < 12) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server not configured (Firebase Admin)" },
      { status: 503 },
    );
  }

  const otp =
    process.env.NODE_ENV === "development" && process.env.DEV_OTP
      ? process.env.DEV_OTP
      : String(Math.floor(100000 + Math.random() * 900000));

  const expiresAt = Date.now() + 10 * 60 * 1000;
  await db.doc(`phoneOtps/${phone.replace(/\+/g, "")}`).set({
    phone,
    otp,
    expiresAt,
    createdAt: Date.now(),
  });

  // In production, integrate SMS provider here. OTP is never returned except in dev.
  const response: { ok: true; devOtp?: string } = { ok: true };
  if (process.env.NODE_ENV === "development") {
    response.devOtp = otp;
  }

  return NextResponse.json(response);
}
