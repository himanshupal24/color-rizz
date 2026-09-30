"use client";

import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#eef4ff] via-[#fdf2f8] to-[#eef4ff] pb-20">
      <div className="mx-auto min-h-dvh max-w-lg">{children}</div>
      <BottomNav />
    </div>
  );
}
