"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function SplashPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !configured) return;
    if (user) router.replace("/home");
  }, [user, loading, configured, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-[#dbeafe] via-[#fce7f3] to-[#dbeafe] px-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
        <span className="text-4xl font-black text-[#2563eb]">W</span>
      </div>
      <h1 className="text-2xl font-bold tracking-wide text-slate-800">
        WIN WIN GO
      </h1>
      <p className="mt-2 max-w-xs text-sm text-slate-600">
        Predict colours, manage your wallet, and play live rounds with Win Win Go.
      </p>
      <div className="mt-10 w-full max-w-xs space-y-3">
        <Link href="/login">
          <Button fullWidth>Get Started</Button>
        </Link>
        <Link href="/register">
          <Button fullWidth variant="secondary">
            Register Now
          </Button>
        </Link>
      </div>
    </main>
  );
}
