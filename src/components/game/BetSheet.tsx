"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import type { GameColor } from "@/lib/types";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";

const colors: GameColor[] = ["green", "violet", "red"];

export function BetSheet({
  roundId,
  color,
  amounts,
  onClose,
}: {
  roundId: string;
  color: GameColor;
  amounts: number[];
  onClose: () => void;
}) {
  const fetchAuth = useAuthedFetch();
  const [amount, setAmount] = useState(amounts[0] ?? 10);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  async function placeBet() {
    if (loading) return;
    setLoading(true);
    const idempotencyKey = `bet_${roundId}_${color}_${amount}_${quantity}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetchAuth("/api/game/bet", {
        method: "POST",
        body: JSON.stringify({
          roundId,
          color,
          amount,
          quantity,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bet failed");
      toast.success("Bet placed successfully");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bet failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5">
        <h3 className="text-lg font-bold capitalize">{color} bet</h3>
        <p className="text-sm text-slate-500">Choose amount and multiplier</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {amounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                amount === a ? "bg-[#2563eb] text-white" : "bg-slate-100"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="text-sm text-slate-600">Number of bets</label>
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
        <p className="mt-3 text-sm">
          Total: <strong>₹{(amount * quantity).toLocaleString("en-IN")}</strong>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={placeBet} disabled={loading}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

export const colorButtonClass: Record<GameColor, string> = {
  green: "bg-emerald-500 hover:bg-emerald-600",
  violet: "bg-violet-500 hover:bg-violet-600",
  red: "bg-rose-500 hover:bg-rose-600",
};

export { colors };
