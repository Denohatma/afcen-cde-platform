"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderOpen,
  ArrowRight,
  Shield,
  BarChart3,
} from "lucide-react";
import { api, type Project, type DashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ projects: 0, pending_review: 0, open_flags: 0, published: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.projects.list(), api.dashboard.stats()])
      .then(([p, s]) => { setProjects(p); setStats(s); })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight mb-1">
          Common Data Environment
        </h1>
        <p className="text-xs text-[#64748b] uppercase tracking-[0.15em]">
          Bulambuli-Moroto 132 kV IPT &mdash; Feasibility Study Review
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={<FolderOpen className="h-3.5 w-3.5" />}
          label="Active Projects"
          value={stats.projects}
          color="#ff8c00"
        />
        <StatCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Pending Review"
          value={stats.pending_review}
          color="#fbbf24"
        />
        <StatCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Open Flags"
          value={stats.open_flags}
          color="#ef4444"
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Published"
          value={stats.published}
          color="#22c55e"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold text-[#ff8c00] uppercase tracking-[0.15em]">
              Projects
            </h2>
            <Link
              href="/projects"
              className="text-[10px] text-[#64748b] hover:text-[#ff8c00] flex items-center gap-1 uppercase tracking-wider transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-[#64748b] text-xs">
              Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-7 w-7 text-[#1e293b] mx-auto mb-2" />
              <p className="text-xs text-[#64748b]">No projects yet</p>
              <p className="text-[10px] text-[#475569] mt-1">
                Backend may not be running on port 8001
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block glass-subtle rounded-lg p-3.5 hover:border-[#ff8c00]/20 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-white group-hover:text-[#ff8c00] transition-colors">
                        {p.name}
                      </span>
                      <p className="text-[11px] text-[#64748b] mt-0.5">
                        {p.description}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#334155] group-hover:text-[#ff8c00] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h2 className="text-[11px] font-semibold text-[#ff8c00] uppercase tracking-[0.15em] mb-3">
              Platform Checks
            </h2>
            <div className="space-y-2.5">
              <CheckRow
                icon={<Shield className="h-3 w-3 text-[#ff8c00]" />}
                label="Universal checks"
                detail="U-1 to U-10"
              />
              <CheckRow
                icon={<BarChart3 className="h-3 w-3 text-[#fbbf24]" />}
                label="Benchmark checks"
                detail="FR-14 to FR-18"
              />
              <CheckRow
                icon={<FileCheck className="h-3 w-3 text-[#22c55e]" />}
                label="AACE verification"
                detail="FR-24"
              />
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h2 className="text-[11px] font-semibold text-[#ff8c00] uppercase tracking-[0.15em] mb-3">
              Document Lifecycle
            </h2>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-1 rounded-md bg-white/5 text-[#94a3b8] border border-white/5">
                WIP
              </span>
              <ArrowRight className="h-3 w-3 text-[#334155]" />
              <span className="px-2 py-1 rounded-md bg-[#ff8c00]/8 text-[#ff8c00] border border-[#ff8c00]/15">
                Shared
              </span>
              <ArrowRight className="h-3 w-3 text-[#334155]" />
              <span className="px-2 py-1 rounded-md bg-[#22c55e]/8 text-[#22c55e] border border-[#22c55e]/15">
                Published
              </span>
            </div>
            <p className="text-[10px] text-[#475569] mt-2.5">
              Automated checks fire on WIP &rarr; Shared transition
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] text-[#64748b] uppercase tracking-[0.15em]">
          {label}
        </span>
      </div>
      <span
        className="text-2xl font-bold bloomberg-glow"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function CheckRow({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] text-[#c8d0dc]">{label}</span>
      </div>
      <span className="text-[10px] text-[#475569]">{detail}</span>
    </div>
  );
}
