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

export interface UserProfile {
  uid: string;
  phone: string;
  displayName?: string;
  role: UserRole;
  balance: number;
  referralCode: string;
  referredBy?: string;
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
  referralBonusPercent: number;
}

export interface GameRound {
  id: string;
  period: string;
  status: RoundStatus;
  startsAt: number;
  endsAt: number;
  resultColor?: GameColor;
  resultNumber?: number;
  plannedColor?: GameColor;
  plannedNumber?: number;
  settledAt?: number;
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
