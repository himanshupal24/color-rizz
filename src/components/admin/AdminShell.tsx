"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Gamepad2,
  Scale,
  FileText,
  Receipt,
  Gift,
  Bell,
  Settings,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Flame,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/rounds", label: "Rounds & Results", icon: Gamepad2 },
  { href: "/admin/users", label: "Users Management", icon: Users },
  { href: "/admin/recharges", label: "Recharges (UPI/TG)", icon: ArrowDownLeft },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { href: "/admin/referrals", label: "Referrals & Bonuses", icon: Gift },
  { href: "/admin/reconciliation", label: "Reconciliation", icon: Scale },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold shadow-sm">
            <Flame className="h-4 w-4 text-yellow-300 fill-yellow-300" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">COLOR RIZZ ADMIN</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-white"
          >
            User App <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div>
          {/* Logo & Brand */}
          <div className="hidden lg:flex items-center justify-between pb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-blue-500/20">
                <Flame className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-white">COLOR RIZZ</span>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Admin Console</p>
              </div>
            </div>
          </div>

          {/* Quick User App Link */}
          <div className="mt-4 hidden lg:block">
            <Link
              href="/home"
              className="flex items-center justify-between rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all"
            >
              <span>← Return to User App</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin Status */}
        <div className="border-t border-slate-800/80 pt-4 mt-6">
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900 p-3 border border-slate-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{profile?.phone || "Admin"}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Super Admin</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-100 text-slate-900 p-4 sm:p-6 lg:p-8 min-h-screen overflow-x-hidden">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
