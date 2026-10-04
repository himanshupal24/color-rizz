import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { runReconciliation } from "@/lib/reconciliation";
import { logAdminAction } from "@/lib/audit-logger";

async function assertAdmin(request: Request) {
  const decoded = await verifyIdToken(request as import("next/server").NextRequest);
  if (!decoded) return null;
  const db = getAdminDb();
  if (!db) return null;
  const user = await db.doc(`users/${decoded.uid}`).get();
  if (!user.exists || user.data()?.role !== "admin") return null;
  return decoded;
}

export async function POST(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { targetUserId?: string };

  try {
    const report = await runReconciliation(body.targetUserId);

    // Save report in reconciliations history
    const db = getAdminDb()!;
    const reportRef = await db.collection("reconciliations").add({
      ...report,
      runBy: admin.uid,
      createdAt: Date.now(),
    });

    await logAdminAction({
      adminUid: admin.uid,
      action: "reconciliation_executed",
      targetType: "reconciliation",
      targetId: reportRef.id,
      metadata: {
        totalUsersAudited: report.totalUsersAudited,
        discrepantUsersCount: report.discrepantUsersCount,
      },
    });

    return NextResponse.json({ ok: true, report, reportId: reportRef.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reconciliation failed" },
      { status: 500 },
    );
  }
}
