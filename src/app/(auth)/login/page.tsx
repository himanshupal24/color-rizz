"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

import { Suspense } from "react";

function LoginForm() {
  const { login, configured } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phone, password);
      toast.success("Welcome back");
      router.push(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-800">Login</h1>
      <p className="mt-1 text-sm text-slate-500">Phone + password</p>
      {!configured ? (
        <p className="mt-4 text-sm text-amber-700">Configure Firebase in .env.local</p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          label="Phone Number"
          placeholder="9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        New user?{" "}
        <Link href="/register" className="font-semibold text-[#2563eb]">
          Register Now
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#eef4ff] to-white px-6 py-10">
      <Suspense fallback={<p>Loading...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
