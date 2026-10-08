import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateReferralCode } from "@/lib/constants";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    referralCode?: string;
  };

  const uid = decoded.uid;
  const email = decoded.email?.toLowerCase() || "";
  const displayName = decoded.name || email.split("@")[0] || "Player";
  const userDocRef = db.doc(`users/${uid}`);

  const snap = await userDocRef.get();
  if (snap.exists) {
    return NextResponse.json({ ok: true, isNew: false });
  }

  // New Google user: initialize profile and process referral
  let referredBy: string | undefined;
  if (body.referralCode?.trim()) {
    const code = body.referralCode.trim().toUpperCase();
    const refSnap = await db
      .collection("users")
      .where("referralCode", "==", code)
      .limit(1)
      .get();

    if (!refSnap.empty) {
      const candidate = refSnap.docs[0]!;
      if (candidate.id !== uid && candidate.data()?.email !== email) {
        referredBy = candidate.id;
      }
    }
  }

  const referralCode = generateReferralCode();
  const settingsSnap = await db.doc("settings/game").get();
  const referralBonusAmount = settingsSnap.data()?.referralBonusAmount ?? 300;
  const wagerMultiplier = settingsSnap.data()?.referralWageringMultiplier ?? 1.0;

  await db.runTransaction(async (tx) => {
    tx.set(userDocRef, {
      uid,
      email,
      phone: "",
      displayName,
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
        email,
        referralBonusAmount,
        wagerMultiplier,
      );
    }
  });

  return NextResponse.json({ ok: true, isNew: true });
}
