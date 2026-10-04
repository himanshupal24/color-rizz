import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AuditLogEntry } from "@/lib/audit-logger";

async function assertAdmin(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) return null;
  const db = getAdminDb();
  if (!db) return null;
  const user = await db.doc(`users/${decoded.uid}`).get();
  if (!user.exists || user.data()?.role !== "admin") return null;
  return decoded;
}

export async function GET(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getAdminDb()!;
  const url = new URL(request.url);
  const targetType = url.searchParams.get("targetType");
  const limitParam = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  let query: FirebaseFirestore.Query = db.collection("audit_logs").orderBy("timestamp", "desc").limit(limitParam);

  if (targetType) {
    query = db.collection("audit_logs").where("targetType", "==", targetType).orderBy("timestamp", "desc").limit(limitParam);
  }

  const snap = await query.get();
  const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry);

  return NextResponse.json({ logs });
}
