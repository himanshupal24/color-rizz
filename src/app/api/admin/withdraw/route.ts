import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/audit-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

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

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: `admin:${admin.uid}:${ip}`,
    limit: 60,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as {
    id?: string;
    action?: "approve" | "reject";
    reason?: string;
  };
  if (!body.id || !body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getAdminDb()!;
  const ref = db.doc(`withdrawals/${body.id}`);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Not found");
      const data = snap.data()!;
      if (data.status !== "pending") throw new Error("Already processed");

      const userRef = db.doc(`users/${data.uid}`);

      if (body.action === "approve") {
        tx.update(ref, {
          status: "approved",
          processedAt: Date.now(),
          processedBy: admin.uid,
          reason: body.reason ?? "",
        });
        tx.set(db.collection("transactions").doc(), {
          uid: data.uid,
          type: "withdraw",
          amount: data.amount,
          status: "success",
          note: "Withdrawal approved",
          createdAt: Date.now(),
        });
      } else {
        tx.update(ref, {
          status: "rejected",
          processedAt: Date.now(),
          processedBy: admin.uid,
          reason: body.reason ?? "",
        });
        tx.update(userRef, {
          balance: FieldValue.increment(data.amount),
        });
        tx.set(db.collection("transactions").doc(), {
          uid: data.uid,
          type: "withdraw",
          amount: data.amount,
          status: "rejected",
          note: "Withdrawal rejected (refunded)",
          createdAt: Date.now(),
        });
      }

      // Record immutable audit log
      await logAdminAction(
        {
          adminUid: admin.uid,
          action: body.action === "approve" ? "withdrawal_approved" : "withdrawal_rejected",
          targetType: "withdraw",
          targetId: body.id!,
          reason: body.reason,
          oldValue: { status: data.status, amount: data.amount, uid: data.uid },
          newValue: { status: body.action === "approve" ? "approved" : "rejected" },
          ip,
        },
        tx,
      );
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

