import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { calculateUserBalances } from "@/lib/referral-engine";
import type { ReferralReward, UserProfile } from "@/lib/types";

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

    const rewardDocId = `${referrerUid}_${uid}`;
    const rewardRef = db.doc(`referral_rewards/${rewardDocId}`);
    const referrerRef = db.doc(`users/${referrerUid}`);

    await db.runTransaction(async (tx) => {
      // 1. ALL READS FIRST (Strict Firestore transaction compliance)
      const [freshUserSnap, rewardSnap, referrerSnap] = await Promise.all([
        tx.get(userDocRef),
        tx.get(rewardRef),
        tx.get(referrerRef),
      ]);

      if (!freshUserSnap.exists) throw new Error("User not found");
      const freshData = freshUserSnap.data() as UserProfile;

      if (freshData.referredBy) {
        throw new Error("A referral code has already been applied to this account.");
      }

      if (!referrerSnap.exists) {
        throw new Error("Referrer account not found");
      }

      // 2. ALL WRITES SECOND
      tx.update(userDocRef, {
        referredBy: referrerUid,
        referralCreatedAt: Date.now(),
      });

      if (!rewardSnap.exists) {
        const referrerData = referrerSnap.data() as UserProfile;
        const balances = calculateUserBalances(referrerData);
        const newBonusBalance = Number((balances.bonusBalance + referralBonusAmount).toFixed(2));
        const newPlayableBalance = Number((balances.playableBalance + referralBonusAmount).toFixed(2));

        tx.update(referrerRef, {
          bonusBalance: newBonusBalance,
          balance: newPlayableBalance,
        });

        const userPhoneOrEmail = userData.email || userData.phone || "User";
        const rewardRecord: ReferralReward = {
          id: rewardDocId,
          referrerUid,
          referrerPhone: referrerData.phone || referrerData.email || "",
          referredUid: uid,
          referredPhone: userPhoneOrEmail,
          amount: referralBonusAmount,
          type: "REFERRAL_BONUS",
          status: "credited",
          wagerRequirement: Number((referralBonusAmount * wagerMultiplier).toFixed(2)),
          wagerProgress: 0,
          createdAt: Date.now(),
          creditedAt: Date.now(),
          notes: `Referral promotional bonus credited for inviting ${userPhoneOrEmail}`,
        };
        tx.set(rewardRef, rewardRecord);

        tx.set(db.collection("transactions").doc(), {
          uid: referrerUid,
          type: "referral",
          amount: referralBonusAmount,
          status: "success",
          note: `₹${referralBonusAmount} Referral Bonus for inviting ${userPhoneOrEmail}`,
          createdAt: Date.now(),
        });

        tx.set(db.collection("notifications").doc(), {
          uid: referrerUid,
          title: "🎁 Referral Bonus Credited!",
          body: `You received a ₹${referralBonusAmount} promotional bonus for inviting ${userPhoneOrEmail}. Available to play!`,
          read: false,
          createdAt: Date.now(),
        });
      }
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
