"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users, Activity, FileText, Clock } from "lucide-react";
import { useRole } from "@/components/client-shell";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  actor: string;
  created_at: string;
  details: { detail?: string } | null;
}

export default function AdminPage() {
  const { role } = useRole();
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetch("http://localhost:8001/api/audit-log")
      .then((r) => r.ok ? r.json() : [])
      .then(setAuditLog)
      .catch(() => setAuditLog([]));
  }, []);

  if (role !== "afcen_lead") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ShieldCheck className="h-8 w-8 text-[var(--surface-text-dim)] mx-auto mb-3" />
          <p className="text-sm text-[var(--surface-text-muted)]">Admin access required</p>
          <p className="text-[10px] text-[var(--surface-text-faint)] mt-1">Only AfCEN Lead can access this section</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--surface-text-strong)] tracking-tight">
          Admin Panel
        </h1>
        <p className="text-[10px] text-[var(--surface-text-muted)] mt-0.5 uppercase tracking-[0.15em]">
          Platform administration & audit trail
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-[#38bdf8]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Users</span>
          </div>
          <span className="text-2xl font-semibold text-[#38bdf8] tabular-nums">4</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-[#22c55e]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Audit Events</span>
          </div>
          <span className="text-2xl font-semibold text-[#22c55e] tabular-nums">{auditLog.length}</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-[#ff8c00]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Active Roles</span>
          </div>
          <span className="text-2xl font-semibold text-[#ff8c00] tabular-nums">4</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-[#a78bfa]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">System Status</span>
          </div>
          <span className="text-sm font-semibold text-[#22c55e]">Healthy</span>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--surface-border)]">
          <h2 className="text-[12px] font-medium text-[var(--surface-text-strong)]">Recent Audit Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--surface-border)] text-[#ff8c00]">
                <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Time</th>
                <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Action</th>
                <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Type</th>
                <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Actor</th>
                <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Detail</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[var(--surface-text-faint)]">No audit events recorded</td>
                </tr>
              ) : (
                auditLog.slice(0, 20).map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--surface-border)] hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-3 py-2.5 text-[var(--surface-text-faint)] mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] px-2 py-0.5 rounded-md mono bg-[#ff8c00]/8 text-[#ff8c00] border border-[#ff8c00]/12">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--surface-text-muted)] mono">{entry.entity_type}</td>
                    <td className="px-3 py-2.5 text-[var(--surface-text)]">{entry.actor}</td>
                    <td className="px-3 py-2.5 text-[var(--surface-text-muted)] truncate max-w-[300px]">
                      {entry.details?.detail || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
