"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Bell, Send, Sparkles, User, Clock, Trash2 } from "lucide-react";
import { useUserDirectory } from "@/hooks/useUserDirectory";
import { db } from "@/lib/firebase/client";
import type { AppNotification } from "@/lib/types";

export default function AdminNotificationsPage() {
  const { uidOfIdentifier, phoneOf } = useUserDirectory();
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification));
    });
    return () => unsub();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!db) return;

    if (!title.trim() || !body.trim()) {
      toast.error("Title and message body are required");
      return;
    }

    const trimmedTarget = target.trim();
    let targetUid: string | null = null;

    if (trimmedTarget) {
      targetUid = uidOfIdentifier(trimmedTarget) ?? null;
      if (!targetUid) {
        toast.error("No registered user found with that email or phone number");
        return;
      }
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "notifications"), {
        uid: targetUid,
        title: title.trim(),
        body: body.trim(),
        read: false,
        createdAt: Date.now(),
      });
      toast.success(
        targetUid
          ? `Notification dispatched to user (${trimmedTarget})`
          : "Global broadcast notification sent to all players!"
      );
      setTitle("");
      setBody("");
      setTarget("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Broadcast & User Notifications</h1>
        <p className="text-xs text-slate-500">
          Send in-app alerts, reward notifications, and system messages directly to players
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose Form */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Compose New Message</h2>
              <p className="text-xs text-slate-400">Target a specific phone number or broadcast to all</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Send className="h-4 w-4" />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Target User Email or Phone (Leave blank for ALL users)
              </label>
              <input
                type="text"
                placeholder="e.g. alex@example.com (or blank for broadcast)"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Notification Title</label>
              <input
                type="text"
                placeholder="e.g. 🎁 Weekend Bonus Credited!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Message Body</label>
              <textarea
                placeholder="Enter notification details..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {loading ? "Sending Notification..." : target ? "Send to User" : "Send Global Broadcast"}
            </button>
          </form>
        </div>

        {/* Live Mobile Notification Preview */}
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-md border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Player UI Preview
            </span>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
              In-App Banner
            </span>
          </div>

          <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/60 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white truncate">
                  {title || "Notification Title Preview"}
                </h4>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {body || "Your notification message will be displayed to players in their app notification feed and status bar."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/40 p-4 text-xs text-slate-400 space-y-1.5 border border-slate-800">
            <p className="font-bold text-slate-300">Delivery Guidelines:</p>
            <p>• Leaving target blank delivers the alert to all registered active players.</p>
            <p>• Target notifications are ideal for custom bonuses and personalized messages.</p>
          </div>
        </div>
      </div>

      {/* Notification Dispatch History */}
      <div className="rounded-3xl bg-white shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Recent Dispatched Alerts</h3>
          <span className="text-xs text-slate-400 font-medium">{history.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {n.uid ? (
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 font-bold truncate max-w-[150px] inline-block">
                        {phoneOf(n.uid)}
                      </span>
                    ) : (
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-purple-700 font-bold">
                        GLOBAL ALL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{n.title}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{n.body}</td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No dispatched notifications recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
