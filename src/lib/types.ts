export type UserRole = "user" | "admin";

export type GameColor = "green" | "violet" | "red";

export type RoundStatus = "betting" | "locked" | "settled";

export type TransactionType =
  | "recharge"
  | "withdraw"
  | "bet"
  | "win"
  | "referral";

export type RequestStatus = "pending" | "approved" | "rejected";

export type ReferralRewardStatus = "pending" | "credited" | "unlocked" | "expired" | "cancelled";

export interface UserProfile {
  uid: string;
  email?: string;
  phone?: string;
  displayName?: string;
  role: UserRole;
  balance: number; // Total playable balance (cashBalance + bonusBalance + unlockedBonusBalance)
  cashBalance?: number; // Real withdrawable cash balance
  bonusBalance?: number; // Locked promotional referral balance
  unlockedBonusBalance?: number; // Unlocked referral balance eligible for withdrawal
  totalWagered?: number; // Cumulative bet stakes for wagering unlock progress
  referralCode: string;
  referredBy?: string;
  referralCreatedAt?: number;
  bankDetails?: BankDetails;
  createdAt: number;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  upiId?: string;
}

export interface GameSettings {
  roundDurationSec: number;
  minBet: number;
  maxBet: number;
  betAmounts: number[];
  multipliers: Record<GameColor, number>;
  upiId: string;
  /** Telegram support link or @username for recharge assistance */
  telegramSupportUrl: string;
  referralBonusPercent: number;
  referralBonusAmount: number; // e.g. 100
  referralWageringMultiplier: number; // e.g. 1.0 (wager 1x bonus to unlock)
}

export interface ReferralReward {
  id: string;
  referrerUid: string;
  referrerPhone?: string;
  referredUid: string;
  referredPhone?: string;
  amount: number;
  type: "REFERRAL_BONUS";
  status: ReferralRewardStatus;
  wagerRequirement: number;
  wagerProgress: number;
  createdAt: number;
  creditedAt: number;
  unlockedAt?: number;
  notes?: string;
}

export interface GameRound {
  id: string;
  period: string;
  status: RoundStatus;
  startsAt: number;
  bettingClosesAt?: number;
  endsAt: number;
  resultColor?: GameColor;
  resultNumber?: number;
  plannedColor?: GameColor;
  plannedNumber?: number;
  settledAt?: number;
  createdAt?: number;
}

export interface RoundStats {
  roundId: string;
  period: string;
  greenBetCount: number;
  redBetCount: number;
  violetBetCount: number;
  totalBetCount: number;
  greenAmount: number;
  redAmount: number;
  violetAmount: number;
  totalAmount: number;
  updatedAt: number;
}

export interface Bet {
  id: string;
  uid: string;
  roundId: string;
  period: string;
  color: GameColor;
  amount: number;
  quantity: number;
  totalStake: number;
  payout?: number;
  status: "open" | "won" | "lost";
  createdAt: number;
}

export interface Transaction {
  id: string;
  uid: string;
  type: TransactionType;
  amount: number;
  status: RequestStatus | "success";
  note?: string;
  createdAt: number;
}

export interface RechargeRequest {
  id: string;
  uid: string;
  amount: number;
  utr?: string;
  status: RequestStatus;
  createdAt: number;
  source?: "telegram" | "upi" | "manual";
  note?: string;
  processedAt?: number;
  processedBy?: string;
}

export interface WithdrawalRequest {
  id: string;
  uid: string;
  amount: number;
  bankSnapshot: BankDetails;
  status: RequestStatus;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  uid?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
}
