import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { amount?: number; utr?: string };
  const amount = Number(body.amount);
  if (!amount || amount < 10) {
    return NextResponse.json({ error: "Minimum recharge ₹10" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  await db.collection("recharges").add({
    uid: decoded.uid,
    amount,
    utr: body.utr?.trim() ?? "",
    status: "pending",
    createdAt: Date.now(),
  });

  await db.collection("notifications").add({
    uid: decoded.uid,
    title: "Recharge submitted",
    body: `Your recharge of ₹${amount} is pending manual UPI verification.`,
    read: false,
    createdAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
