"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Send,
  ArrowRight,
} from "lucide-react";
import { api, type Project } from "@/lib/api";
import { useRole } from "@/components/client-shell";

interface SlaDeliverable {
  id: string;
  code: string;
  title: string;
  state: string;
  due_date: string | null;
  days_remaining: number | null;
  sla_status: string;
  needs_reminder: boolean;
}

interface SlaSummary {
  overdue: number;
  urgent: number;
  warning: number;
  on_track: number;
  no_deadline: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof AlertCircle }> = {
  overdue: { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertCircle },
  urgent: { label: "Urgent", color: "#ff8c00", bg: "rgba(255,140,0,0.08)", icon: AlertTriangle },
  warning: { label: "Warning", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", icon: Clock },
  on_track: { label: "On Track", color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: CheckCircle2 },
  no_deadline: { label: "No Deadline", color: "#64748b", bg: "rgba(100,116,139,0.08)", icon: Clock },
};

export default function RemindersPage() {
  const { role } = useRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<SlaDeliverable[]>([]);
  const [summary, setSummary] = useState<SlaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.projects.list().then(async (p) => {
      setProjects(p);
      if (p.length > 0) {
        const results = await Promise.all(
          p.map((proj) => api.sla.status(proj.id).catch(() => null))
        );
        const best = results
          .filter(Boolean)
          .sort((a, b) => (b!.summary.overdue + b!.summary.urgent + b!.summary.total) - (a!.summary.overdue + a!.summary.urgent + a!.summary.total));
        setSelectedProject(best[0] ? p[results.indexOf(best[0])].id : p[0].id);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    api.sla.status(selectedProject)
      .then((data) => {
        setDeliverables(data.deliverables);
        setSummary(data.summary);
      })
      .catch(() => {
        setDeliverables([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleSendReminder = async (d: SlaDeliverable) => {
    setSending(d.id);
    try {
      await api.reminders.send({
        deliverable_id: d.id,
        recipient_email: "team@afcen.org",
        message: `Reminder: "${d.title}" (${d.code}) is ${d.sla_status === "overdue" ? "overdue" : "approaching its deadline"}. ${d.days_remaining !== null ? `${Math.abs(d.days_remaining)} days ${d.days_remaining < 0 ? "past due" : "remaining"}.` : ""}`,
      });
      setSentIds((prev) => new Set(prev).add(d.id));
    } catch {}
    setSending(null);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--surface-text-strong)] tracking-tight">
            SLA Tracking & Reminders
          </h1>
          <p className="text-[10px] text-[var(--surface-text-muted)] mt-0.5 uppercase tracking-[0.15em]">
            Monitor deliverable deadlines and send reminders
          </p>
        </div>
        {projects.length > 1 && (
          <select
            value={selectedProject || ""}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-[var(--surface-input)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-[11px] text-[var(--surface-text)] outline-none focus:border-[#ff8c00]/30"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--surface-bg)]">
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(["overdue", "urgent", "warning", "on_track", "no_deadline"] as const).map((key) => {
            const cfg = STATUS_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <div key={key} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                  <span className="text-[10px] text-[var(--surface-text-faint)]">{cfg.label}</span>
                </div>
                <span className="text-2xl font-semibold tabular-nums" style={{ color: cfg.color }}>
                  {summary[key]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--surface-text-muted)] text-xs">Loading SLA data...</div>
      ) : deliverables.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Bell className="h-6 w-6 text-[var(--surface-text-dim)] mx-auto mb-2" />
          <p className="text-[11px] text-[var(--surface-text-faint)]">No deliverables found for this project</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[#ff8c00]">
                  <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Code</th>
                  <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Deliverable</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">State</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Due Date</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Days Left</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d) => {
                  const cfg = STATUS_CONFIG[d.sla_status] || STATUS_CONFIG.no_deadline;
                  const Icon = cfg.icon;
                  return (
                    <tr key={d.id} className="border-b border-[var(--surface-border)] hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-3 py-2.5 text-[var(--surface-text-faint)] mono">{d.code}</td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/deliverables/${d.id}`}
                          className="text-[var(--surface-text)] hover:text-[#ff8c00] transition-colors flex items-center gap-1"
                        >
                          {d.title} <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[9px] px-2 py-0.5 rounded-md mono bg-[var(--surface-badge)] text-[var(--surface-text-muted)]">
                          {d.state}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[var(--surface-text-muted)] mono">
                        {d.due_date || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: cfg.color }}>
                        {d.days_remaining !== null ? (
                          d.days_remaining < 0 ? `${Math.abs(d.days_remaining)}d overdue` : `${d.days_remaining}d`
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md mono"
                          style={{ color: cfg.color, backgroundColor: cfg.bg }}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {d.needs_reminder && (role === "afcen_lead" || role === "consultant") ? (
                          sentIds.has(d.id) ? (
                            <span className="text-[9px] text-[#22c55e]">Sent</span>
                          ) : (
                            <button
                              onClick={() => handleSendReminder(d)}
                              disabled={sending === d.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-[#ff8c00] bg-[#ff8c00]/8 hover:bg-[#ff8c00]/15 border border-[#ff8c00]/15 transition-all mx-auto disabled:opacity-50"
                            >
                              <Send className="h-2.5 w-2.5" />
                              {sending === d.id ? "Sending..." : "Remind"}
                            </button>
                          )
                        ) : (
                          <span className="text-[9px] text-[var(--surface-text-dim)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
