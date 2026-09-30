import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  generateReferralCode,
  normalizePhone,
  phoneToAuthEmail,
} from "@/lib/constants";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    phone?: string;
    otp?: string;
    password?: string;
    referralCode?: string;
  };

  const phone = body.phone ? normalizePhone(body.phone) : "";
  const otp = body.otp?.trim() ?? "";
  const password = body.password ?? "";

  if (!phone || !otp || password.length < 6) {
    return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
  }

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const otpRef = db.doc(`phoneOtps/${phone.replace(/\+/g, "")}`);
  const otpSnap = await otpRef.get();
  if (!otpSnap.exists) {
    return NextResponse.json({ error: "OTP not found. Send OTP first." }, { status: 400 });
  }
  const otpData = otpSnap.data()!;
  if (otpData.expiresAt < Date.now() || otpData.otp !== otp) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  const email = phoneToAuthEmail(phone);
  let uid: string;

  try {
    const existing = await auth.getUserByEmail(email).catch(() => null);
    if (existing) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }
    const user = await auth.createUser({ email, password, phoneNumber: phone });
    uid = user.uid;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let referredBy: string | undefined;
  if (body.referralCode?.trim()) {
    const refSnap = await db
      .collection("users")
      .where("referralCode", "==", body.referralCode.trim().toUpperCase())
      .limit(1)
      .get();
    if (!refSnap.empty) referredBy = refSnap.docs[0]!.id;
  }

  const referralCode = generateReferralCode();
  await db.doc(`users/${uid}`).set({
    phone,
    role: "user",
    balance: 0,
    referralCode,
    referredBy: referredBy ?? null,
    createdAt: Date.now(),
  });

  await otpRef.delete();

  return NextResponse.json({ ok: true, uid });
}
