import { AdminShell } from "@/components/admin/AdminShell";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminShell>{children}</AdminShell>
    </RouteGuard>
  );
}
