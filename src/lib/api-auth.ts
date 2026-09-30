import { getAdminAuth } from "@/lib/firebase/admin";
import type { NextRequest } from "next/server";

export async function verifyIdToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}
