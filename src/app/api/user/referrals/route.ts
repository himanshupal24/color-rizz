import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { calculateUserBalances } from "@/lib/referral-engine";
import type { ReferralReward, UserProfile } from "@/lib/types";

export async function GET(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const userSnap = await db.doc(`users/${decoded.uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() as UserProfile;
    const balances = calculateUserBalances(userData);

    // Fetch referral rewards for this referrer
    const rewardsSnap = await db
      .collection("referral_rewards")
      .where("referrerUid", "==", decoded.uid)
      .get();

    const rewards: ReferralReward[] = [];
    let totalRewardsEarned = 0;
    let successfulCount = 0;
    let pendingCount = 0;

    rewardsSnap.forEach((doc) => {
      const reward = doc.data() as ReferralReward;
      rewards.push(reward);
      if (reward.status === "credited" || reward.status === "unlocked") {
        totalRewardsEarned += reward.amount;
        successfulCount += 1;
      } else if (reward.status === "pending") {
        pendingCount += 1;
      }
    });

    // Sort rewards newest first
    rewards.sort((a, b) => b.createdAt - a.createdAt);

    // Fetch referred users list
    const referredUsersSnap = await db
      .collection("users")
      .where("referredBy", "==", decoded.uid)
      .get();

    const referredUsers: Array<{
      uid: string;
      phoneMasked: string;
      createdAt: number;
    }> = [];

    referredUsersSnap.forEach((doc) => {
      const u = doc.data() as UserProfile;
      const rawPhone = u.phone || "";
      const phoneMasked =
        rawPhone.length >= 10
          ? rawPhone.slice(0, 3) + "****" + rawPhone.slice(7)
          : rawPhone ? "***" + rawPhone.slice(-3) : "User";
      referredUsers.push({
        uid: doc.id,
        phoneMasked,
        createdAt: u.createdAt || u.referralCreatedAt || Date.now(),
      });
    });

    referredUsers.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      referralCode: userData.referralCode || "",
      referredBy: userData.referredBy || null,
      balances: {
        cashBalance: balances.cashBalance,
        bonusBalance: balances.bonusBalance,
        unlockedBonusBalance: balances.unlockedBonusBalance,
        playableBalance: balances.playableBalance,
        withdrawableBalance: balances.withdrawableBalance,
        totalWagered: balances.totalWagered,
      },
      stats: {
        totalReferrals: referredUsers.length,
        successfulReferrals: successfulCount || referredUsers.length,
        pendingReferrals: pendingCount,
        totalRewardsEarned: Number(totalRewardsEarned.toFixed(2)),
        lockedBonusBalance: balances.bonusBalance,
        unlockedBonusBalance: balances.unlockedBonusBalance,
      },
      rewards: rewards.slice(0, 50),
      referredUsers: referredUsers.slice(0, 50),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch referral data" },
      { status: 500 },
    );
  }
}
