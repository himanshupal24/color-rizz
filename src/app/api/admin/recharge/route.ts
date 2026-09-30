import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

async function assertAdmin(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) return null;
  const db = getAdminDb();
  if (!db) return null;
  const user = await db.doc(`users/${decoded.uid}`).get();
  if (!user.exists || user.data()?.role !== "admin") return null;
  return decoded;
}

export async function PATCH(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    action?: "approve" | "reject";
  };
  if (!body.id || !body.action) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getAdminDb()!;
  const ref = db.doc(`recharges/${body.id}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Not found");
    const data = snap.data()!;
    if (data.status !== "pending") throw new Error("Already processed");

    if (body.action === "approve") {
      tx.update(ref, { status: "approved", processedAt: Date.now(), processedBy: admin.uid });
      tx.update(db.doc(`users/${data.uid}`), {
        balance: FieldValue.increment(data.amount),
      });
      tx.set(db.collection("transactions").doc(), {
        uid: data.uid,
        type: "recharge",
        amount: data.amount,
        status: "success",
        note: "UPI recharge approved",
        createdAt: Date.now(),
      });

      const userSnap = await tx.get(db.doc(`users/${data.uid}`));
      const referredBy = userSnap.data()?.referredBy;
      if (referredBy) {
        const settings = await db.doc("settings/game").get();
        const pct = settings.data()?.referralBonusPercent ?? 5;
        const bonus = Math.floor((data.amount * pct) / 100);
        if (bonus > 0) {
          tx.update(db.doc(`users/${referredBy}`), {
            balance: FieldValue.increment(bonus),
          });
          tx.set(db.collection("transactions").doc(), {
            uid: referredBy,
            type: "referral",
            amount: bonus,
            status: "success",
            note: "Referral commission",
            createdAt: Date.now(),
          });
        }
      }
    } else {
      tx.update(ref, { status: "rejected", processedAt: Date.now(), processedBy: admin.uid });
    }
  }).catch((e) => {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  });

  return NextResponse.json({ ok: true });
}
