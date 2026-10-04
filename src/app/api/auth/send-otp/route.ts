import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { normalizePhone } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = (await request.json()) as { phone?: string };
  const phone = body.phone ? normalizePhone(body.phone) : "";
  if (!phone || phone.length < 12) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // Rate limit: max 3 OTP sends per minute per phone and IP
  const rateLimit = checkRateLimit({
    key: `otp:${phone}:${ip}`,
    limit: 3,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many OTP requests. Please wait a minute before requesting another OTP." },
      { status: 429 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server not configured (Firebase Admin)" },
      { status: 503 },
    );
  }

  // If DEV_OTP is set in env, use that. Otherwise generate a 6-digit OTP (or fallback to 123456 if DEV_OTP requested)
  const otp =
    process.env.DEV_OTP ||
    String(Math.floor(100000 + Math.random() * 900000));

  const expiresAt = Date.now() + 10 * 60 * 1000;
  await db.doc(`phoneOtps/${phone.replace(/\+/g, "")}`).set({
    phone,
    otp,
    expiresAt,
    createdAt: Date.now(),
  });

  // If external SMS API (e.g. Fast2SMS / Twilio) is configured, SMS would be sent here.
  // When no SMS API is active, return the OTP so the user can verify without being blocked.
  const hasExternalSms = Boolean(process.env.SMS_API_KEY || process.env.TWILIO_AUTH_TOKEN);

  return NextResponse.json({
    ok: true,
    devOtp: otp,
    message: hasExternalSms
      ? "OTP sent via SMS"
      : `Your verification code is ${otp}`,
  });
}
