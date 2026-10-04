import { getAdminDb } from "@/lib/firebase/admin";
import type { Bet, RechargeRequest, Transaction, UserProfile, WithdrawalRequest } from "@/lib/types";

export interface UserReconciliationReport {
  userId: string;
  phone: string;
  currentBalance: number;
  expectedLedgerBalance: number;
  balanceDiff: number;
  totalRecharges: number;
  totalWithdrawals: number;
  totalBetsStaked: number;
  totalWinnings: number;
  totalReferrals: number;
  issues: string[];
  status: "ok" | "discrepancy" | "warning";
}

export interface SystemReconciliationSummary {
  timestamp: number;
  totalUsersAudited: number;
  discrepantUsersCount: number;
  totalSystemBalance: number;
  totalLedgerBalance: number;
  systemBalanceDiff: number;
  userReports: UserReconciliationReport[];
}

/**
 * Reconciles wallet balance against transaction ledger, bets, and request records for a specific user or all users.
 */
export async function runReconciliation(targetUserId?: string): Promise<SystemReconciliationSummary> {
  const db = getAdminDb();
  if (!db) {
    throw new Error("Firestore Admin not initialized");
  }

  // 1. Fetch users
  let usersQuery = db.collection("users");
  let userDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (targetUserId) {
    const singleSnap = await db.doc(`users/${targetUserId}`).get();
    if (singleSnap.exists) {
      userDocs = [singleSnap as unknown as FirebaseFirestore.QueryDocumentSnapshot];
    }
  } else {
    const snap = await usersQuery.limit(100).get();
    userDocs = snap.docs;
  }

  const userReports: UserReconciliationReport[] = [];
  let totalSystemBalance = 0;
  let totalLedgerBalance = 0;

  for (const doc of userDocs) {
    const user = { uid: doc.id, ...doc.data() } as UserProfile;
    const uid = user.uid;
    const currentBalance = user.balance ?? 0;
    totalSystemBalance += currentBalance;

    const issues: string[] = [];

    // 2. Fetch all user transactions
    const txSnap = await db.collection("transactions").where("uid", "==", uid).get();
    const transactions = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);

    // 3. Fetch user recharges, withdrawals, and bets
    const [rechargeSnap, withdrawSnap, betSnap] = await Promise.all([
      db.collection("recharges").where("uid", "==", uid).get(),
      db.collection("withdrawals").where("uid", "==", uid).get(),
      db.collection("bets").where("uid", "==", uid).get(),
    ]);

    const recharges = rechargeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RechargeRequest);
    const withdrawals = withdrawSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithdrawalRequest);
    const bets = betSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bet);

    // Calculate ledger totals
    let calculatedLedgerBalance = 0;
    let totalRecharges = 0;
    let totalWithdrawals = 0;
    let totalBetsStaked = 0;
    let totalWinnings = 0;
    let totalReferrals = 0;

    for (const tx of transactions) {
      if (tx.status !== "success" && tx.status !== "approved") continue;
      const amt = tx.amount ?? 0;
      switch (tx.type) {
        case "recharge":
          calculatedLedgerBalance += amt;
          totalRecharges += amt;
          break;
        case "withdraw":
          calculatedLedgerBalance -= amt;
          totalWithdrawals += amt;
          break;
        case "bet":
          calculatedLedgerBalance -= amt;
          totalBetsStaked += amt;
          break;
        case "win":
          calculatedLedgerBalance += amt;
          totalWinnings += amt;
          break;
        case "referral":
          calculatedLedgerBalance += amt;
          totalReferrals += amt;
          break;
      }
    }

    totalLedgerBalance += calculatedLedgerBalance;

    // Check discrepancy between current balance and calculated ledger balance
    const diff = Number((currentBalance - calculatedLedgerBalance).toFixed(2));
    if (Math.abs(diff) > 0.01) {
      issues.push(`Balance mismatch: User balance is ₹${currentBalance}, but transaction ledger sums to ₹${calculatedLedgerBalance} (Diff: ₹${diff})`);
    }

    if (currentBalance < 0) {
      issues.push(`Critical: User has negative balance (₹${currentBalance})`);
    }

    // Check consistency between approved requests and transactions
    const approvedRechargeTotal = recharges
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);

    const approvedWithdrawalTotal = withdrawals
      .filter((w) => w.status === "approved")
      .reduce((sum, w) => sum + (w.amount ?? 0), 0);

    if (Math.abs(approvedRechargeTotal - totalRecharges) > 0.01) {
      issues.push(`Recharge mismatch: Approved recharges ₹${approvedRechargeTotal} vs ledger ₹${totalRecharges}`);
    }

    if (Math.abs(approvedWithdrawalTotal - totalWithdrawals) > 0.01) {
      issues.push(`Withdrawal mismatch: Approved withdrawals ₹${approvedWithdrawalTotal} vs ledger ₹${totalWithdrawals}`);
    }

    // Check for open bets that may be stranded
    const openBets = bets.filter((b) => b.status === "open");
    if (openBets.length > 5) {
      issues.push(`Warning: ${openBets.length} open bets pending settlement`);
    }

    const report: UserReconciliationReport = {
      userId: uid,
      phone: user.phone || "Unknown",
      currentBalance,
      expectedLedgerBalance: calculatedLedgerBalance,
      balanceDiff: diff,
      totalRecharges,
      totalWithdrawals,
      totalBetsStaked,
      totalWinnings,
      totalReferrals,
      issues,
      status: issues.length > 0 ? "discrepancy" : "ok",
    };

    userReports.push(report);
  }

  const discrepantCount = userReports.filter((r) => r.status === "discrepancy").length;

  const summary: SystemReconciliationSummary = {
    timestamp: Date.now(),
    totalUsersAudited: userReports.length,
    discrepantUsersCount: discrepantCount,
    totalSystemBalance: Number(totalSystemBalance.toFixed(2)),
    totalLedgerBalance: Number(totalLedgerBalance.toFixed(2)),
    systemBalanceDiff: Number((totalSystemBalance - totalLedgerBalance).toFixed(2)),
    userReports,
  };

  return summary;
}
