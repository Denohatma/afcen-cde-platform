"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { api, type Project } from "@/lib/api";

interface ReviewStage {
  deliverable_id: string;
  code: string;
  title: string;
  state: string;
  pass_status: string;
  flags: { blocking: number; material: number; advisory: number };
  open_count: number;
  resolved_count: number;
}

interface IntelligenceData {
  project_id: string;
  project_name: string;
  overall_status: string;
  stages: ReviewStage[];
  summary: {
    total_open: number;
    total_resolved: number;
    total_flags: { blocking: number; material: number; advisory: number };
  };
}

const PASS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  passed: { label: "Passed", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  clear: { label: "Clear", color: "#22c55e", bg: "rgba(34,197,94,0.06)" },
  review: { label: "In Review", color: "#ff8c00", bg: "rgba(255,140,0,0.08)" },
  flagged: { label: "Flagged", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
  blocked: { label: "Blocked", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  pending: { label: "Pending", color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

export default function ReviewsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviews, setReviews] = useState<Map<string, IntelligenceData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.list().then(async (p) => {
      setProjects(p);
      const results = await Promise.all(
        p.map((proj) =>
          api.intelligence.summary(proj.id).catch(() => null)
        )
      );
      const map = new Map<string, IntelligenceData>();
      results.forEach((r, i) => {
        if (r) map.set(p[i].id, r);
      });
      setReviews(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalOpen = Array.from(reviews.values()).reduce((s, r) => s + r.summary.total_open, 0);
  const totalResolved = Array.from(reviews.values()).reduce((s, r) => s + r.summary.total_resolved, 0);
  const totalBlocking = Array.from(reviews.values()).reduce((s, r) => s + r.summary.total_flags.blocking, 0);
  const totalMaterial = Array.from(reviews.values()).reduce((s, r) => s + r.summary.total_flags.material, 0);
  const totalAdvisory = Array.from(reviews.values()).reduce((s, r) => s + r.summary.total_flags.advisory, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--surface-text-strong)] tracking-tight">
          Reviews
        </h1>
        <p className="text-[10px] text-[var(--surface-text-muted)] mt-0.5 uppercase tracking-[0.15em]">
          Deliverable review status across all projects
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-[#ef4444]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Blocking</span>
          </div>
          <span className="text-2xl font-semibold text-[#ef4444] tabular-nums">{totalBlocking}</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-[#fbbf24]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Material</span>
          </div>
          <span className="text-2xl font-semibold text-[#fbbf24] tabular-nums">{totalMaterial}</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-[#38bdf8]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Advisory</span>
          </div>
          <span className="text-2xl font-semibold text-[#38bdf8] tabular-nums">{totalAdvisory}</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-4 w-4 text-[#ff8c00]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Open</span>
          </div>
          <span className="text-2xl font-semibold text-[#ff8c00] tabular-nums">{totalOpen}</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Resolved</span>
          </div>
          <span className="text-2xl font-semibold text-[#22c55e] tabular-nums">{totalResolved}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--surface-text-muted)] text-xs">Loading reviews...</div>
      ) : (
        <div className="space-y-6">
          {projects.map((proj) => {
            const review = reviews.get(proj.id);
            if (!review) return null;
            return (
              <div key={proj.id} className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--surface-border)] flex items-center justify-between">
                  <div>
                    <h2 className="text-[13px] font-medium text-[var(--surface-text-strong)]">{proj.name}</h2>
                    <span className="text-[10px] text-[var(--surface-text-faint)]">
                      {review.summary.total_open} open &middot; {review.summary.total_resolved} resolved
                    </span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full mono ${
                    review.overall_status === "pass"
                      ? "text-[#22c55e] bg-[#22c55e]/8 border border-[#22c55e]/15"
                      : "text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/15"
                  }`}>
                    {review.overall_status === "pass" ? "ALL CLEAR" : "REVIEW REQUIRED"}
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  {review.stages.map((stage) => {
                    const pass = PASS_CONFIG[stage.pass_status] || PASS_CONFIG.pending;
                    return (
                      <Link
                        key={stage.deliverable_id}
                        href={`/deliverables/${stage.deliverable_id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-input)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] transition-all group"
                      >
                        <span className="text-[10px] text-[var(--surface-text-faint)] mono w-12 shrink-0">{stage.code}</span>
                        <span className="text-[12px] text-[var(--surface-text)] flex-1 truncate group-hover:text-[var(--surface-text-strong)] transition-colors">
                          {stage.title}
                        </span>
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
                          {stage.flags.advisory > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-[#38bdf8]">
                              <Info className="h-3 w-3" />{stage.flags.advisory}
                            </span>
                          )}
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md mono"
                            style={{ color: pass.color, backgroundColor: pass.bg }}
                          >
                            {pass.label}
                          </span>
                          <ArrowRight className="h-3 w-3 text-[var(--surface-text-dim)] group-hover:text-[#ff8c00] transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
