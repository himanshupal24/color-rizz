import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { processReferralRewardOnRegister } from "@/lib/referral-engine";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    referralCode?: string;
  };

  const rawCode = body.referralCode?.trim() ?? "";
  if (!rawCode) {
    return NextResponse.json({ error: "Please enter a referral code" }, { status: 400 });
  }
  const code = rawCode.toUpperCase();

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const uid = decoded.uid;
  const userDocRef = db.doc(`users/${uid}`);

  try {
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() as UserProfile;
    if (userData.referredBy) {
      return NextResponse.json(
        { error: "A referral code has already been applied to this account. Only one referral code is allowed." },
        { status: 400 },
      );
    }

    // Find referrer by referralCode
    const refSnap = await db
      .collection("users")
      .where("referralCode", "==", code)
      .limit(1)
      .get();

    if (refSnap.empty) {
      return NextResponse.json({ error: "Invalid referral code. Please check and try again." }, { status: 400 });
    }

    const referrerDoc = refSnap.docs[0]!;
    const referrerUid = referrerDoc.id;

    if (referrerUid === uid || referrerDoc.data()?.email === userData.email) {
      return NextResponse.json({ error: "You cannot use your own referral code." }, { status: 400 });
    }

    const settingsSnap = await db.doc("settings/game").get();
    const referralBonusAmount = settingsSnap.data()?.referralBonusAmount ?? 300;
    const wagerMultiplier = settingsSnap.data()?.referralWageringMultiplier ?? 1.0;

    await db.runTransaction(async (tx) => {
      const freshUserSnap = await tx.get(userDocRef);
      if (!freshUserSnap.exists) throw new Error("User not found");
      const freshData = freshUserSnap.data() as UserProfile;

      if (freshData.referredBy) {
        throw new Error("A referral code has already been applied to this account.");
      }

      tx.update(userDocRef, {
        referredBy: referrerUid,
        referralCreatedAt: Date.now(),
      });

      const userPhoneOrEmail = userData.email || userData.phone || "User";
      await processReferralRewardOnRegister(
        db,
        tx,
        referrerUid,
        uid,
        userPhoneOrEmail,
        referralBonusAmount,
        wagerMultiplier,
      );
    });

    return NextResponse.json({
      ok: true,
      message: "Referral code applied successfully!",
      referredBy: referrerUid,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to apply referral code";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
