"use client";

import { useEffect, useState } from "react";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { useUserDirectory } from "@/hooks/useUserDirectory";
import type { AuditLogEntry } from "@/lib/audit-logger";
import {
  AdminTable,
  Badge,
  EmptyState,
  LoadingState,
  PageHeader,
  Panel,
  PanelHeader,
  Td,
  Th,
} from "@/components/admin/AdminUI";

export default function AuditLogsPage() {
  const fetchAuth = useAuthedFetch();
  const { phoneOf } = useUserDirectory();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetType, setTargetType] = useState<string>("all");

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const url =
          targetType === "all"
            ? "/api/admin/audit-logs"
            : `/api/admin/audit-logs?targetType=${targetType}`;
        const res = await fetchAuth(url);
        const data = await res.json();
        if (res.ok) setLogs(data.logs ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [targetType, fetchAuth]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable trail of admin approvals, overrides, and configuration changes."
        actions={
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none ring-teal-600/20 focus:ring-2"
          >
            <option value="all">All Action Types</option>
            <option value="recharge">Recharge Actions</option>
            <option value="withdraw">Withdrawal Actions</option>
            <option value="round">Round Outcomes</option>
            <option value="settings">Settings Modifications</option>
            <option value="reconciliation">Reconciliations</option>
          </select>
        }
      />

      <Panel padding={false}>
        <PanelHeader title="Action history" description={`${logs.length} entries loaded`} />

        {loading ? (
          <LoadingState label="Loading audit logs..." />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit logs yet"
            description="Admin actions for this category will appear here once recorded."
          />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Admin</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Reason / Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-slate-50/70">
                  <Td className="whitespace-nowrap font-mono text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </Td>
                  <Td className="font-semibold text-slate-800">
                    {phoneOf(log.adminUid)}
                  </Td>
                  <Td>
                    <Badge tone="blue">{log.action}</Badge>
                  </Td>
                  <Td className="text-xs text-slate-600">
                    <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-slate-400">
                      {log.targetType}
                    </span>
                    {log.targetType === "user"
                      ? phoneOf(log.targetId)
                      : log.targetId}
                  </Td>
                  <Td className="max-w-xs text-xs text-slate-600">
                    {log.reason ? (
                      <p className="font-medium text-slate-800">Reason: {log.reason}</p>
                    ) : null}
                    {log.newValue ? (
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
                        {JSON.stringify(log.newValue)}
                      </span>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  );
}
