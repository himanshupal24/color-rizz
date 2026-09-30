import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { amount?: number };
  const amount = Number(body.amount);
  if (!amount || amount < 100) {
    return NextResponse.json({ error: "Minimum withdrawal ₹100" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const userRef = db.doc(`users/${decoded.uid}`);

  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("User not found");
      const user = userSnap.data()!;
      if (!user.bankDetails) throw new Error("Add bank details first");
      const balance = user.balance ?? 0;
      if (balance < amount) throw new Error("Insufficient balance");

      tx.update(userRef, { balance: FieldValue.increment(-amount) });
      tx.set(db.collection("withdrawals").doc(), {
        uid: decoded.uid,
        amount,
        bankSnapshot: user.bankDetails,
        status: "pending",
        createdAt: Date.now(),
      });
      tx.set(db.collection("transactions").doc(), {
        uid: decoded.uid,
        type: "withdraw",
        amount,
        status: "pending",
        note: "Withdrawal request",
        createdAt: Date.now(),
      });
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Withdrawal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
