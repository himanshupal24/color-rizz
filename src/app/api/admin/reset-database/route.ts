import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_GAME_SETTINGS } from "@/lib/constants";
import { logAdminAction } from "@/lib/audit-logger";

const COLLECTIONS_TO_CLEAR = [
  "rounds",
  "bets",
  "round_stats",
  "transactions",
  "recharges",
  "withdrawals",
  "referral_rewards",
  "notifications",
  "audit_logs",
  "bank_accounts",
];

async function deleteCollection(db: FirebaseFirestore.Firestore, collectionPath: string, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
  }

  return totalDeleted;
}

export async function POST(request: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Check either admin token OR secret header
  let adminUid = "system_reset";
  const secret = process.env.GAME_TICK_SECRET;
  const headerSecret = request.headers.get("x-game-tick-secret");

  if (!secret || headerSecret !== secret) {
    const decoded = await verifyIdToken(request as import("next/server").NextRequest);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userDoc = await db.doc(`users/${decoded.uid}`).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    adminUid = decoded.uid;
  }

  const results: Record<string, number> = {};

  for (const coll of COLLECTIONS_TO_CLEAR) {
    results[coll] = await deleteCollection(db, coll);
  }

  // Clear regular users, preserve admins with 0 balance
  const userSnap = await db.collection("users").get();
  const batch = db.batch();
  let deletedUsers = 0;
  let preservedAdmins = 0;

  userSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.role === "admin") {
      batch.update(doc.ref, {
        balance: 0,
        cashBalance: 0,
        bonusBalance: 0,
        unlockedBonusBalance: 0,
        totalWagered: 0,
      });
      preservedAdmins++;
    } else {
      batch.delete(doc.ref);
      deletedUsers++;
    }
  });

  if (deletedUsers > 0 || preservedAdmins > 0) {
    await batch.commit();
  }
  results["users_deleted"] = deletedUsers;
  results["admins_preserved"] = preservedAdmins;

  // Re-initialize default settings
  await db.doc("settings/game").set(DEFAULT_GAME_SETTINGS);

  await logAdminAction(db, {
    adminUid,
    action: "DATABASE_RESET",
    targetType: "settings",
    targetId: "all_collections",
    reason: "Production clean database initialization",
    metadata: results,
  });

  return NextResponse.json({
    ok: true,
    message: "Database reset successfully for production!",
    details: results,
  });
}
