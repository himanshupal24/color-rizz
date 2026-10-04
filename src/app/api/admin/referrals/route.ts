import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/audit-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import type { ReferralReward, ReferralRewardStatus } from "@/lib/types";

async function assertAdmin(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) return null;
  const db = getAdminDb();
  if (!db) return null;
  const user = await db.doc(`users/${decoded.uid}`).get();
  if (!user.exists || user.data()?.role !== "admin") return null;
  return decoded;
}

export async function GET(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  try {
    const rewardsSnap = await db.collection("referral_rewards").orderBy("createdAt", "desc").limit(200).get();

    const rewards: ReferralReward[] = [];
    let totalRewardsDistributed = 0;
    let totalWagerRequirementSum = 0;
    let creditedCount = 0;
    let unlockedCount = 0;
    let pendingCount = 0;
    const uniqueReferrers = new Set<string>();
    const uniqueReferred = new Set<string>();

    rewardsSnap.forEach((doc) => {
      const reward = doc.data() as ReferralReward;
      rewards.push(reward);
      uniqueReferrers.add(reward.referrerUid);
      uniqueReferred.add(reward.referredUid);
      totalRewardsDistributed += reward.amount || 0;
      totalWagerRequirementSum += reward.wagerRequirement || 0;

      if (reward.status === "credited") creditedCount += 1;
      else if (reward.status === "unlocked") unlockedCount += 1;
      else if (reward.status === "pending") pendingCount += 1;
    });

    return NextResponse.json({
      summary: {
        totalRewardsDistributed,
        totalRewardsCount: rewards.length,
        uniqueReferrersCount: uniqueReferrers.size,
        uniqueReferredCount: uniqueReferred.size,
        creditedCount,
        unlockedCount,
        pendingCount,
        totalWagerRequirementSum,
      },
      rewards,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch admin referral stats" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `admin-referrals:${admin.uid}:${ip}`,
    limit: 30,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as {
    rewardId?: string;
    newStatus?: ReferralRewardStatus;
    reason?: string;
  };

  if (!body.rewardId || !body.newStatus) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getAdminDb()!;
  const rewardRef = db.doc(`referral_rewards/${body.rewardId}`);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(rewardRef);
      if (!snap.exists) throw new Error("Reward record not found");
      const current = snap.data() as ReferralReward;

      const oldValue = { status: current.status, notes: current.notes };
      const notes = body.reason
        ? `${current.notes || ""} [Admin Override by ${admin.uid}: ${body.reason}]`.trim()
        : current.notes;

      tx.update(rewardRef, {
        status: body.newStatus,
        notes,
        updatedAt: Date.now(),
      });

      await logAdminAction(
        {
          adminUid: admin.uid,
          action: "referral_reward_override",
          targetType: "referral_reward",
          targetId: body.rewardId!,
          reason: body.reason,
          oldValue,
          newValue: { status: body.newStatus, notes },
          ip,
        },
        tx,
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update referral reward" },
      { status: 400 },
    );
  }
}
