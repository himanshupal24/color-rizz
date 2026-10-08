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
  telegramSupportUrl:
    process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT ?? "https://t.me/",
  referralBonusPercent: 5,
  referralBonusAmount: 300,
  referralWageringMultiplier: 1.0,
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

/** Normalize Telegram @username or t.me link into a clickable URL. */
export function normalizeTelegramUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, "").replace(/^t\.me\//i, "").replace(/^\//, "");
  if (!username) return "";
  return `https://t.me/${username}`;
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
