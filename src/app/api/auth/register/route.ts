import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { generateReferralCode, normalizePhone } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { calculateUserBalances } from "@/lib/referral-engine";
import type { ReferralReward, UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `register:${ip}`,
      limit: 15,
      windowMs: 60000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
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
    let isFreshAuthUser = false;

    const existingAuthUser = await auth.getUserByEmail(email).catch(() => null);

    if (existingAuthUser) {
      // Check if user document exists in Firestore
      const existingDoc = await db.doc(`users/${existingAuthUser.uid}`).get();
      if (existingDoc.exists) {
        return NextResponse.json(
          { error: "Email is already registered. Please login instead." },
          { status: 409 },
        );
      }

      // Self-heal: Auth record existed from a prior failed registration attempt without a Firestore document
      await auth.updateUser(existingAuthUser.uid, {
        password,
        displayName: displayName || undefined,
        phoneNumber: phone || undefined,
      });
      uid = existingAuthUser.uid;
    } else {
      const user = await auth.createUser({
        email,
        password,
        displayName: displayName || undefined,
        phoneNumber: phone || undefined,
      });
      uid = user.uid;
      isFreshAuthUser = true;
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
            referredPhone: phone || email,
            amount: referralBonusAmount,
            type: "REFERRAL_BONUS",
            status: "credited",
            wagerRequirement: Number((referralBonusAmount * wagerMultiplier).toFixed(2)),
            wagerProgress: 0,
            createdAt: Date.now(),
            creditedAt: Date.now(),
            notes: `Referral promotional bonus credited for inviting ${phone || email}`,
          };
          tx.set(rewardRef, rewardRecord);

          tx.set(db.collection("transactions").doc(), {
            uid: referredBy,
            type: "referral",
            amount: referralBonusAmount,
            status: "success",
            note: `₹${referralBonusAmount} Referral Bonus for inviting ${phone || email}`,
            createdAt: Date.now(),
          });

          tx.set(db.collection("notifications").doc(), {
            uid: referredBy,
            title: "🎁 Referral Bonus Credited!",
            body: `You received a ₹${referralBonusAmount} promotional bonus for inviting ${phone || email}. Available to play!`,
            read: false,
            createdAt: Date.now(),
          });
        }
      });
    } catch (txError) {
      // If Firestore transaction fails for a freshly created auth user, clean up to avoid orphaning
      if (isFreshAuthUser) {
        await auth.deleteUser(uid).catch(() => undefined);
      }
      throw txError;
    }

    return NextResponse.json({ ok: true, uid });
  } catch (e) {
    console.error("Registration error:", e);
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
