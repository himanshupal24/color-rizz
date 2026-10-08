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
    limit: 10,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    phone?: string;
    referralCode?: string;
    displayName?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const rawPhone = body.phone?.trim() ?? "";
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  const displayName = body.displayName?.trim() ?? "";

  // Email format validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  let uid: string;

  try {
    const existing = await auth.getUserByEmail(email).catch(() => null);
    if (existing) {
      return NextResponse.json({ error: "Email is already registered. Please login instead." }, { status: 409 });
    }
    const user = await auth.createUser({
      email,
      password,
      displayName: displayName || undefined,
      phoneNumber: phone || undefined,
    });
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
      if (candidateReferrer.id !== uid && candidateReferrer.data()?.email !== email) {
        referredBy = candidateReferrer.id;
      }
    }
  }

  const referralCode = generateReferralCode();
  const settingsSnap = await db.doc("settings/game").get();
  const referralBonusAmount = settingsSnap.data()?.referralBonusAmount ?? 300;
  const wagerMultiplier = settingsSnap.data()?.referralWageringMultiplier ?? 1.0;

  const userDocRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (tx) => {
    tx.set(userDocRef, {
      uid,
      email,
      phone: phone || "",
      displayName: displayName || email.split("@")[0],
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
        phone || email,
        referralBonusAmount,
        wagerMultiplier,
      );
    }
  });

  return NextResponse.json({ ok: true, uid });
}

