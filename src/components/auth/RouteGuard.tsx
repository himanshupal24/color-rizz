"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function RouteGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, profile, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;

    if (requireAuth && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireAdmin && profile?.role !== "admin") {
      router.replace("/home");
    }
  }, [loading, user, profile, requireAuth, requireAdmin, router, pathname, configured]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Firebase not configured</p>
        <p className="mt-2">
          Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{" "}
          <code className="rounded bg-slate-100 px-1">.env.local</code> and add your
          Firebase keys.
        </p>
      </div>
    );
  }

  if (requireAuth && !user) return null;
  if (requireAdmin && profile?.role !== "admin") return null;

  return <>{children}</>;
}
