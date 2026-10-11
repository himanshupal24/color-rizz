import fs from "fs";
import path from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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
const auth = getAuth(app);

function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function main() {
  const mode = process.argv[2] || "--status"; // --status, --sync, --delete-orphans
  console.log(`🔍 Checking users across Firebase Authentication and Firestore (Mode: ${mode})...\n`);

  const listUsersResult = await auth.listUsers(1000);
  const authUsers = listUsersResult.users;
  console.log(`📋 Total users in Firebase Authentication: ${authUsers.length}`);

  const firestoreUsersSnap = await db.collection("users").get();
  console.log(`📋 Total users in Firestore: ${firestoreUsersSnap.size}\n`);

  const firestoreUidSet = new Set(firestoreUsersSnap.docs.map((d) => d.id));

  const orphanedAuthUsers = [];
  const validUsers = [];

  for (const u of authUsers) {
    if (firestoreUidSet.has(u.uid)) {
      validUsers.push(u);
    } else {
      orphanedAuthUsers.push(u);
    }
  }

  console.log(`✅ Synced Users (Exist in both Auth & Firestore): ${validUsers.length}`);
  validUsers.forEach((u) => console.log(`   - ${u.email || u.phoneNumber} (${u.uid})`));

  console.log(`\n⚠️ Orphaned Users (Exist in Auth but MISSING from Firestore): ${orphanedAuthUsers.length}`);
  orphanedAuthUsers.forEach((u) => console.log(`   - ${u.email || u.phoneNumber} (${u.uid})`));

  if (orphanedAuthUsers.length === 0) {
    console.log("\n🎉 All users are in sync!");
    return;
  }

  if (mode === "--sync") {
    console.log(`\n🛠️ Creating missing Firestore profile documents for ${orphanedAuthUsers.length} user(s)...`);
    for (const u of orphanedAuthUsers) {
      const email = u.email || "";
      const displayName = u.displayName || email.split("@")[0] || "Player";
      const referralCode = generateReferralCode();

      await db.doc(`users/${u.uid}`).set({
        uid: u.uid,
        email,
        phone: u.phoneNumber || "",
        displayName,
        role: "user",
        balance: 0,
        cashBalance: 0,
        bonusBalance: 0,
        unlockedBonusBalance: 0,
        totalWagered: 0,
        referralCode,
        referredBy: null,
        createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : Date.now(),
      });
      console.log(`   ✓ Created Firestore profile for ${email || u.uid}`);
    }
    console.log("\n🎉 All orphaned users have now been synced with valid Firestore profiles!");
  } else if (mode === "--delete-orphans") {
    console.log(`\n🗑️ Deleting ${orphanedAuthUsers.length} orphaned test users from Firebase Auth...`);
    for (const u of orphanedAuthUsers) {
      await auth.deleteUser(u.uid);
      console.log(`   ✓ Deleted Auth user ${u.email || u.uid}`);
    }
    console.log("\n🎉 Orphaned test accounts removed from Firebase Auth!");
  } else {
    console.log("\n💡 Available actions:");
    console.log("   node scripts/sync-auth-users.mjs --sync           (Create missing Firestore profiles for all)");
    console.log("   node scripts/sync-auth-users.mjs --delete-orphans  (Delete orphaned accounts from Firebase Auth)");
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
