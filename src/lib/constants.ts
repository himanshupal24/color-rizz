import type { GameSettings } from "./types";

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  roundDurationSec: 180,
  minBet: 10,
  maxBet: 100000,
  betAmounts: [10, 100, 500, 1000, 5000],
  multipliers: {
    green: 2,
    red: 2,
    violet: 4.5,
  },
  upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "merchant@upi",
  referralBonusPercent: 5,
};

export const PHONE_AUTH_DOMAIN = "phone.colourprediction.local";

export function phoneToAuthEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@${PHONE_AUTH_DOMAIN}`;
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (input.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function formatCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function colorForNumber(n: number): "green" | "violet" | "red" {
  if (n === 0 || n === 5) return "violet";
  if (n % 2 === 0) return "red";
  return "green";
}
