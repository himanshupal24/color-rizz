import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  generateReferralCode,
  normalizePhone,
  phoneToAuthEmail,
} from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `register:${ip}`,
    limit: 5,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

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
    const code = body.referralCode.trim().toUpperCase();
    const refSnap = await db
      .collection("users")
      .where("referralCode", "==", code)
      .limit(1)
      .get();

    if (!refSnap.empty) {
      const candidateReferrer = refSnap.docs[0]!;
      // Prevent self-referral
      if (candidateReferrer.id !== uid && candidateReferrer.data()?.phone !== phone) {
        referredBy = candidateReferrer.id;
      }
    }
  }

  const referralCode = generateReferralCode();
  const settingsSnap = await db.doc("settings/game").get();
  const referralBonusAmount = settingsSnap.data()?.referralBonusAmount ?? 100;
  const wagerMultiplier = settingsSnap.data()?.referralWageringMultiplier ?? 1.0;

  const userDocRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (tx) => {
    tx.set(userDocRef, {
      phone,
      role: "user",
      balance: 0,
      cashBalance: 0,
      bonusBalance: 0,
      unlockedBonusBalance: 0,
      totalWagered: 0,
      referralCode,
      referredBy: referredBy ?? null,
      referralCreatedAt: referredBy ? Date.now() : null,
      createdAt: Date.now(),
    });

    if (referredBy) {
      const { processReferralRewardOnRegister } = await import("@/lib/referral-engine");
      await processReferralRewardOnRegister(
        db,
        tx,
        referredBy,
        uid,
        phone,
        referralBonusAmount,
        wagerMultiplier,
      );
    }
  });

  await otpRef.delete();

  return NextResponse.json({ ok: true, uid });
}

