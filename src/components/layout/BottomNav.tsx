"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, Gamepad2, Wallet, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/game", label: "Win Go", icon: Gamepad2, isCenter: true },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

function checkIsActive(href: string, pathname: string): boolean {
  if (!pathname) return href === "/home";
  if (href === "/home") {
    return pathname === "/" || pathname === "/home";
  }
  if (href === "/game") {
    return pathname === "/game" || pathname.startsWith("/game/");
  }
  if (href === "/wallet") {
    return pathname === "/wallet" || pathname.startsWith("/wallet/");
  }
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  // Optimistic active tab state for instantaneous visual feedback on click
  const [activeTab, setActiveTab] = useState<string>(pathname);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 select-none">
      <div className="mx-auto max-w-lg bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_25px_rgba(0,0,0,0.07)] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
        <div className="flex items-center justify-around">
          {navItems.map(({ href, label, icon: Icon, isCenter }) => {
            const isActive = checkIsActive(href, activeTab);

            if (isCenter) {
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setActiveTab(href)}
                  className="group relative -top-3.5 flex flex-col items-center justify-center focus:outline-none"
                >
                  <div
                    className={cn(
                      "relative flex h-13 w-13 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 active:scale-90",
                      isActive
                        ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-indigo-500/40 ring-4 ring-white scale-105"
                        : "bg-gradient-to-tr from-slate-700 to-slate-800 text-slate-200 shadow-slate-900/20 ring-4 ring-white hover:brightness-110"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6 transition-transform duration-300",
                        isActive ? "scale-110 animate-pulse text-white" : "scale-100 text-slate-200"
                      )}
                    />
                    {isActive && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white animate-bounce">
                        <Sparkles className="h-2 w-2 text-white" />
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 text-[11px] font-bold tracking-tight transition-all duration-200",
                      isActive ? "text-blue-600 scale-105" : "text-slate-500 group-hover:text-slate-700"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setActiveTab(href)}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-90 focus:outline-none",
                  isActive ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {/* Active Indicator Bubble & Icon */}
                <div
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                    isActive
                      ? "bg-blue-50/90 text-blue-600 shadow-inner scale-105"
                      : "bg-transparent text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive ? "scale-110 stroke-[2.5px] text-blue-600" : "scale-100 stroke-[1.8px]"
                    )}
                  />
                  {/* Subtle top indicator bar */}
                  {isActive && (
                    <span className="absolute -top-1 h-1 w-5 rounded-full bg-blue-600 shadow-xs" />
                  )}
                </div>

                {/* Tab Label */}
                <span
                  className={cn(
                    "mt-0.5 text-[10px] tracking-tight transition-all duration-200",
                    isActive ? "font-bold text-blue-600 scale-105" : "font-medium text-slate-500"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
