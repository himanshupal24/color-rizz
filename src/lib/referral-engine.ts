import type { Transaction, DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import type { ReferralReward, UserProfile } from "@/lib/types";

export interface CalculatedBalances {
  cashBalance: number;
  bonusBalance: number;
  unlockedBonusBalance: number;
  playableBalance: number;
  withdrawableBalance: number;
  totalWagered: number;
}

/**
 * Authoritatively calculates all balance buckets for a user.
 */
export function calculateUserBalances(data: Partial<UserProfile> | undefined): CalculatedBalances {
  if (!data) {
    return {
      cashBalance: 0,
      bonusBalance: 0,
      unlockedBonusBalance: 0,
      playableBalance: 0,
      withdrawableBalance: 0,
      totalWagered: 0,
    };
  }

  const bonusBalance = Number(data.bonusBalance ?? 0);
  const unlockedBonusBalance = Number(data.unlockedBonusBalance ?? 0);
  const totalWagered = Number(data.totalWagered ?? 0);

  // If cashBalance is explicitly tracked, use it. Otherwise fallback to (total balance - bonus balances).
  let cashBalance = data.cashBalance !== undefined
    ? Number(data.cashBalance)
    : Math.max(0, Number(data.balance ?? 0) - bonusBalance - unlockedBonusBalance);

  cashBalance = Math.max(0, cashBalance);
  const playableBalance = cashBalance + bonusBalance + unlockedBonusBalance;
  const withdrawableBalance = cashBalance + unlockedBonusBalance;

  return {
    cashBalance: Number(cashBalance.toFixed(2)),
    bonusBalance: Number(bonusBalance.toFixed(2)),
    unlockedBonusBalance: Number(unlockedBonusBalance.toFixed(2)),
    playableBalance: Number(playableBalance.toFixed(2)),
    withdrawableBalance: Number(withdrawableBalance.toFixed(2)),
    totalWagered: Number(totalWagered.toFixed(2)),
  };
}

/**
 * Atomically credits a ₹100 referral bonus to the referrer on registration of a new user.
 */
export async function processReferralRewardOnRegister(
  db: FirebaseFirestore.Firestore,
  tx: Transaction,
  referrerUid: string,
  newUserId: string,
  newUserPhone: string,
  bonusAmount = 300,
  wagerMultiplier = 1.0,
): Promise<boolean> {
  // Prevent self-referral
  if (!referrerUid || referrerUid === newUserId) {
    return false;
  }

  const rewardDocId = `${referrerUid}_${newUserId}`;
  const rewardRef = db.doc(`referral_rewards/${rewardDocId}`);
  const referrerRef = db.doc(`users/${referrerUid}`);

  const [rewardSnap, referrerSnap] = await Promise.all([
    tx.get(rewardRef),
    tx.get(referrerRef),
  ]);

  // Idempotency: Reward already processed for this pair
  if (rewardSnap.exists) {
    return false;
  }

  if (!referrerSnap.exists) {
    return false;
  }

  const referrerData = referrerSnap.data() as UserProfile;
  const balances = calculateUserBalances(referrerData);

  const newBonusBalance = Number((balances.bonusBalance + bonusAmount).toFixed(2));
  const newPlayableBalance = Number((balances.playableBalance + bonusAmount).toFixed(2));

  // Update referrer balances
  tx.update(referrerRef, {
    bonusBalance: newBonusBalance,
    balance: newPlayableBalance,
  });

  // Create immutable referral reward record
  const rewardRecord: ReferralReward = {
    id: rewardDocId,
    referrerUid,
    referrerPhone: referrerData.phone || "",
    referredUid: newUserId,
    referredPhone: newUserPhone,
    amount: bonusAmount,
    type: "REFERRAL_BONUS",
    status: "credited",
    wagerRequirement: Number((bonusAmount * wagerMultiplier).toFixed(2)),
    wagerProgress: 0,
    createdAt: Date.now(),
    creditedAt: Date.now(),
    notes: `Referral promotional bonus credited for inviting ${newUserPhone}`,
  };

  tx.set(rewardRef, rewardRecord);

  // Record ledger entry
  const txRef = db.collection("transactions").doc();
  tx.set(txRef, {
    uid: referrerUid,
    type: "referral",
    amount: bonusAmount,
    status: "success",
    note: `₹${bonusAmount} Referral Bonus for inviting ${newUserPhone}`,
    createdAt: Date.now(),
  });

  // Send app notification
  const notifRef = db.collection("notifications").doc();
  tx.set(notifRef, {
    uid: referrerUid,
    title: "🎁 Referral Bonus Credited!",
    body: `You received a ₹${bonusAmount} promotional bonus for inviting ${newUserPhone}. It is immediately available to play!`,
    read: false,
    createdAt: Date.now(),
  });

  return true;
}

/**
 * Handles bet balance deduction (prioritizing locked bonus first) and unlocks eligible bonuses.
 */
export async function processBetDeductionAndWagering(
  db: FirebaseFirestore.Firestore,
  tx: Transaction,
  userRef: DocumentReference,
  userSnap: DocumentSnapshot,
  totalStake: number,
): Promise<CalculatedBalances> {
  const userData = userSnap.data() as UserProfile;
  const balances = calculateUserBalances(userData);

  if (balances.playableBalance < totalStake) {
    throw new Error("Insufficient playable balance");
  }

  let remainingStake = totalStake;
  let newBonusBalance = balances.bonusBalance;
  let newUnlockedBonus = balances.unlockedBonusBalance;
  let newCashBalance = balances.cashBalance;

  // 1. Deduct from locked promotional bonus first (giving player maximum advantage)
  if (newBonusBalance > 0) {
    const deductBonus = Math.min(newBonusBalance, remainingStake);
    newBonusBalance = Number((newBonusBalance - deductBonus).toFixed(2));
    remainingStake = Number((remainingStake - deductBonus).toFixed(2));
  }

  // 2. Deduct from unlocked bonus next
  if (remainingStake > 0 && newUnlockedBonus > 0) {
    const deductUnlocked = Math.min(newUnlockedBonus, remainingStake);
    newUnlockedBonus = Number((newUnlockedBonus - deductUnlocked).toFixed(2));
    remainingStake = Number((remainingStake - deductUnlocked).toFixed(2));
  }

  // 3. Deduct remainder from cash balance
  if (remainingStake > 0) {
    newCashBalance = Number((newCashBalance - remainingStake).toFixed(2));
    remainingStake = 0;
  }

  const newTotalWagered = Number((balances.totalWagered + totalStake).toFixed(2));
  const newPlayableBalance = Number((newCashBalance + newBonusBalance + newUnlockedBonus).toFixed(2));

  tx.update(userRef, {
    cashBalance: newCashBalance,
    bonusBalance: newBonusBalance,
    unlockedBonusBalance: newUnlockedBonus,
    balance: newPlayableBalance,
    totalWagered: newTotalWagered,
  });

  return {
    cashBalance: newCashBalance,
    bonusBalance: newBonusBalance,
    unlockedBonusBalance: newUnlockedBonus,
    playableBalance: newPlayableBalance,
    withdrawableBalance: Number((newCashBalance + newUnlockedBonus).toFixed(2)),
    totalWagered: newTotalWagered,
  };
}
