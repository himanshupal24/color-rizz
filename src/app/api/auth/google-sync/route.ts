import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateReferralCode } from "@/lib/constants";
import { calculateUserBalances } from "@/lib/referral-engine";
import type { ReferralReward, UserProfile } from "@/lib/types";

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

  // New user: initialize profile and process referral
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

  try {
    await db.runTransaction(async (tx) => {
      // 1. ALL READS FIRST (Strict Firestore transaction compliance)
      let referrerSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      let rewardSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      let referrerRef: FirebaseFirestore.DocumentReference | null = null;
      let rewardRef: FirebaseFirestore.DocumentReference | null = null;
      const rewardDocId = referredBy ? `${referredBy}_${uid}` : "";

      if (referredBy) {
        rewardRef = db.doc(`referral_rewards/${rewardDocId}`);
        referrerRef = db.doc(`users/${referredBy}`);
        const [rSnap, refSnap] = await Promise.all([
          tx.get(rewardRef),
          tx.get(referrerRef),
        ]);
        rewardSnap = rSnap;
        referrerSnap = refSnap;
      }

      // 2. ALL WRITES SECOND
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

      if (
        referredBy &&
        rewardRef &&
        referrerRef &&
        rewardSnap &&
        !rewardSnap.exists &&
        referrerSnap &&
        referrerSnap.exists
      ) {
        const referrerData = referrerSnap.data() as UserProfile;
        const balances = calculateUserBalances(referrerData);
        const newBonusBalance = Number((balances.bonusBalance + referralBonusAmount).toFixed(2));
        const newPlayableBalance = Number((balances.playableBalance + referralBonusAmount).toFixed(2));

        tx.update(referrerRef, {
          bonusBalance: newBonusBalance,
          balance: newPlayableBalance,
        });

        const rewardRecord: ReferralReward = {
          id: rewardDocId,
          referrerUid: referredBy,
          referrerPhone: referrerData.phone || referrerData.email || "",
          referredUid: uid,
          referredPhone: email,
          amount: referralBonusAmount,
          type: "REFERRAL_BONUS",
          status: "credited",
          wagerRequirement: Number((referralBonusAmount * wagerMultiplier).toFixed(2)),
          wagerProgress: 0,
          createdAt: Date.now(),
          creditedAt: Date.now(),
          notes: `Referral promotional bonus credited for inviting ${email}`,
        };
        tx.set(rewardRef, rewardRecord);

        tx.set(db.collection("transactions").doc(), {
          uid: referredBy,
          type: "referral",
          amount: referralBonusAmount,
          status: "success",
          note: `₹${referralBonusAmount} Referral Bonus for inviting ${email}`,
          createdAt: Date.now(),
        });

        tx.set(db.collection("notifications").doc(), {
          uid: referredBy,
          title: "🎁 Referral Bonus Credited!",
          body: `You received a ₹${referralBonusAmount} promotional bonus for inviting ${email}. Available to play!`,
          read: false,
          createdAt: Date.now(),
        });
      }
    });

    return NextResponse.json({ ok: true, isNew: true });
  } catch (e) {
    console.error("Google sync error:", e);
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
