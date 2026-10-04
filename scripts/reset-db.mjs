import fs from "fs";
import path from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load environment variables from .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON is not set in environment or .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      }),
    });

const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

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

async function deleteCollection(collectionPath, batchSize = 100) {
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

async function resetUsers(preserveAdmins = true) {
  const snapshot = await db.collection("users").get();
  const batch = db.batch();
  let deleted = 0;
  let preserved = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (preserveAdmins && data.role === "admin") {
      // Reset admin balance to 0 for a clean start
      batch.update(doc.ref, {
        balance: 0,
        cashBalance: 0,
        bonusBalance: 0,
        unlockedBonusBalance: 0,
        totalWagered: 0,
      });
      preserved++;
    } else {
      batch.delete(doc.ref);
      deleted++;
    }
  });

  if (deleted > 0 || preserved > 0) {
    await batch.commit();
  }

  return { deleted, preserved };
}

async function initializeDefaults() {
  const defaultSettings = {
    roundDurationSec: 60,
    minBet: 10,
    maxBet: 100000,
    betAmounts: [10, 50, 100, 500, 1000, 5000],
    multipliers: {
      green: 2,
      violet: 4.5,
      red: 2,
    },
    upiId: process.env.NEXT_PUBLIC_UPI_ID || "support@upi",
    telegramSupportUrl: "https://t.me/your_support_username",
    referralBonusPercent: 10,
    referralBonusAmount: 100,
    referralWageringMultiplier: 1.0,
  };

  await db.doc("settings/game").set(defaultSettings);
  console.log("✅ Default game settings initialized.");
}

async function main() {
  console.log("🔄 Starting Database Reset...");

  for (const coll of COLLECTIONS_TO_CLEAR) {
    const count = await deleteCollection(coll);
    console.log(`🧹 Cleared collection '${coll}' (${count} documents removed)`);
  }

  const { deleted, preserved } = await resetUsers(true);
  console.log(`👤 Users: ${deleted} regular accounts removed, ${preserved} admin account(s) preserved with zeroed balance.`);

  await initializeDefaults();

  console.log("\n🎉 Database has been successfully reset for production launch!");
}

main().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
