"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, FileText, TrendingUp, DollarSign, ArrowRight, CheckCircle2 } from "lucide-react";
import { api, type Project } from "@/lib/api";

export default function DealRoomPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.list()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--surface-text-strong)] tracking-tight">
          Deal Room
        </h1>
        <p className="text-[10px] text-[var(--surface-text-muted)] mt-0.5 uppercase tracking-[0.15em]">
          Investment-ready project packages for stakeholders
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Handshake className="h-4 w-4 text-[#ff8c00]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Active Deals</span>
          </div>
          <span className="text-2xl font-semibold text-[#ff8c00] tabular-nums">{projects.length}</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-[#38bdf8]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Documents</span>
          </div>
          <span className="text-2xl font-semibold text-[#38bdf8] tabular-nums">15</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#22c55e]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Pipeline Value</span>
          </div>
          <span className="text-lg font-semibold text-[#22c55e]">$72.5M</span>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[#a78bfa]" />
            <span className="text-[10px] text-[var(--surface-text-faint)]">Ready</span>
          </div>
          <span className="text-2xl font-semibold text-[#a78bfa] tabular-nums">1</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--surface-text-muted)] text-xs">Loading deal room...</div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="glass-card p-5 block group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[13px] font-medium text-[var(--surface-text-strong)] group-hover:text-[#ff8c00] transition-colors">
                      {p.name}
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-md mono bg-[#22c55e]/8 text-[#22c55e] border border-[#22c55e]/12">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--surface-text-muted)]">{p.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--surface-text-faint)]">
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Pre-Feasibility</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documents available</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--surface-text-dim)] group-hover:text-[#ff8c00] transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
