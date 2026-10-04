"use client";

import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 pb-24 selection:bg-blue-500 selection:text-white">
      <div className="mx-auto min-h-dvh max-w-lg shadow-sm bg-slate-50 flex flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
