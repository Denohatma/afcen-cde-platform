"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  ArrowRight,
  Shield,
  BarChart3,
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Brain,
  Vault,
} from "lucide-react";
import { api, type Project, type DashboardStats, type IntelligenceSummary } from "@/lib/api";
import { useRole } from "@/components/client-shell";

const PASS_STATUS = {
  passed: { label: "Passed", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  clear: { label: "Clear", color: "#22c55e", bg: "rgba(34,197,94,0.06)" },
  review: { label: "In Review", color: "#ff8c00", bg: "rgba(255,140,0,0.08)" },
  flagged: { label: "Flagged", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
  blocked: { label: "Blocked", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  pending: { label: "Pending", color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

export default function DashboardPage() {
  const { role, hasPermission } = useRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ projects: 0, pending_review: 0, open_flags: 0, published: 0 });
  const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.projects.list(), api.dashboard.stats()])
      .then(async ([p, s]) => {
        setProjects(p);
        setStats(s);
        if (p.length > 0) {
          try {
            const results = await Promise.all(p.map(proj => api.intelligence.summary(proj.id).catch(() => null)));
            const best = results.filter(Boolean).sort((a, b) => (b!.summary.total_open + b!.stages.length) - (a!.summary.total_open + a!.stages.length))[0];
            if (best) setIntelligence(best);
          } catch {}
        }
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight mb-1">
          {role === "investor" ? "Investment Overview" : role === "consultant" ? "Submission Dashboard" : "Common Data Environment"}
        </h1>
        <p className="text-[11px] text-[#475569]">
          Bulambuli-Moroto 132 kV IPT — Feasibility Study Review
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<FolderOpen className="h-4 w-4" />} label="Projects" value={stats.projects} color="#ff8c00" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Pending Review" value={stats.pending_review} color="#fbbf24" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Open Flags" value={stats.open_flags} color="#ef4444" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Published" value={stats.published} color="#22c55e" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {intelligence && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#ff8c00]" />
                  <h2 className="text-[12px] font-medium text-white">Intelligence Review</h2>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full mono ${
                  intelligence.overall_status === "pass"
                    ? "text-[#22c55e] bg-[#22c55e]/8 border border-[#22c55e]/15"
                    : "text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/15"
                }`}>
                  {intelligence.overall_status === "pass" ? "ALL CLEAR" : "REVIEW REQUIRED"}
                </span>
              </div>

              <div className="space-y-2">
                {intelligence.stages.map((stage) => {
                  const status = PASS_STATUS[stage.pass_status as keyof typeof PASS_STATUS] || PASS_STATUS.pending;
                  return (
                    <Link
                      key={stage.deliverable_id}
                      href={`/deliverables/${stage.deliverable_id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-all group"
                    >
                      <span className="text-[10px] text-[#475569] mono w-12 shrink-0">{stage.code}</span>
                      <span className="text-[12px] text-[#c8d0dc] flex-1 truncate group-hover:text-white transition-colors">{stage.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {stage.flags.blocking > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-[#ef4444]">
                            <AlertCircle className="h-3 w-3" />{stage.flags.blocking}
                          </span>
                        )}
                        {stage.flags.material > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-[#fbbf24]">
                            <AlertTriangle className="h-3 w-3" />{stage.flags.material}
                          </span>
                        )}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md mono"
                          style={{ color: status.color, backgroundColor: status.bg }}
                        >
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04] text-[10px] text-[#475569] mono">
                <span>Flags: <span className="text-[#ef4444]">{intelligence.summary.total_flags.blocking}B</span> / <span className="text-[#fbbf24]">{intelligence.summary.total_flags.material}M</span> / <span className="text-[#38bdf8]">{intelligence.summary.total_flags.advisory}A</span></span>
                <span>Open: {intelligence.summary.total_open}</span>
                <span>Resolved: {intelligence.summary.total_resolved}</span>
              </div>
            </div>
          )}

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[12px] font-medium text-white">Projects</h2>
              <Link href="/projects" className="text-[10px] text-[#475569] hover:text-[#ff8c00] flex items-center gap-1 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-6 text-[#475569] text-[11px]">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-6 w-6 text-[#1e293b] mx-auto mb-2" />
                <p className="text-[11px] text-[#475569]">No projects — ensure backend is running on port 8001</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-all group">
                    <div>
                      <span className="text-[12px] font-medium text-[#c8d0dc] group-hover:text-white transition-colors">{p.name}</span>
                      <p className="text-[10px] text-[#475569] mt-0.5">{p.description}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#334155] group-hover:text-[#ff8c00] transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-[12px] font-medium text-white mb-4">Platform Checks</h2>
            <div className="space-y-3">
              <CheckRow icon={<Shield className="h-3.5 w-3.5 text-[#ff8c00]" />} label="Universal" detail="U-1 to U-10" desc="Units, arithmetic, completeness" />
              <CheckRow icon={<BarChart3 className="h-3.5 w-3.5 text-[#38bdf8]" />} label="Benchmark" detail="FR-14 to FR-18" desc="Cost normalization, band checks" />
              <CheckRow icon={<FileCheck className="h-3.5 w-3.5 text-[#22c55e]" />} label="AACE" detail="FR-24" desc="Accuracy class verification" />
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-[12px] font-medium text-white mb-4">Document Lifecycle</h2>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[#64748b] border border-white/5 mono">WIP</span>
              <ArrowRight className="h-3 w-3 text-[#1e293b]" />
              <span className="px-2.5 py-1 rounded-lg bg-[#ff8c00]/6 text-[#ff8c00] border border-[#ff8c00]/12 mono">SHARED</span>
              <ArrowRight className="h-3 w-3 text-[#1e293b]" />
              <span className="px-2.5 py-1 rounded-lg bg-[#22c55e]/6 text-[#22c55e] border border-[#22c55e]/12 mono">PUBLISHED</span>
            </div>
            <p className="text-[10px] text-[#334155] mt-3">
              Intelligence layer fires on WIP → Shared
            </p>
          </div>

          {hasPermission("dataroom.read") && (
            <Link href="/dataroom" className="glass-card p-5 block group">
              <div className="flex items-center gap-2 mb-2">
                <Vault className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-[12px] font-medium text-white">Data Room</h2>
              </div>
              <p className="text-[10px] text-[#475569]">
                Access published deliverables and export packages
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#475569] group-hover:text-[#a78bfa] mt-2 transition-colors">
                Open data room <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] text-[#475569]">{label}</span>
      </div>
      <span className="text-2xl font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function CheckRow({ icon, label, detail, desc }: { icon: React.ReactNode; label: string; detail: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {icon}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#c8d0dc]">{label}</span>
          <span className="text-[9px] text-[#334155] mono">{detail}</span>
        </div>
        <p className="text-[9px] text-[#334155] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
