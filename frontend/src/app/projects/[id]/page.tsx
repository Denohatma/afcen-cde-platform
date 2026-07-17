"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { api, type Project, type Deliverable, type Flag } from "@/lib/api";

const STATE_COLORS: Record<string, { color: string; label: string }> = {
  wip: { color: "#64748b", label: "WIP" },
  shared: { color: "#ff8c00", label: "Shared" },
  published: { color: "#22c55e", label: "Published" },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [flagCounts, setFlagCounts] = useState<Record<string, { blocking: number; material: number; advisory: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.projects.get(id), api.deliverables.list(id)])
      .then(async ([proj, dels]) => {
        setProject(proj);
        setDeliverables(dels);
        const counts: Record<string, { blocking: number; material: number; advisory: number }> = {};
        for (const d of dels) {
          try {
            const flags = await api.flags.list(d.id);
            const open = flags.filter((f: Flag) => f.status === "open");
            counts[d.id] = {
              blocking: open.filter((f: Flag) => f.severity === "blocking").length,
              material: open.filter((f: Flag) => f.severity === "material").length,
              advisory: open.filter((f: Flag) => f.severity === "advisory").length,
            };
          } catch {
            counts[d.id] = { blocking: 0, material: 0, advisory: 0 };
          }
        }
        setFlagCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-16 text-[#64748b] text-xs">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 text-[#64748b] text-xs">
        Project not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[10px] text-[#475569] mb-2 uppercase tracking-[0.12em]">
          <Link href="/projects" className="hover:text-[#ff8c00] transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{project.name}</span>
        </div>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          {project.name}
        </h1>
        <p className="text-[11px] text-[#64748b] mt-0.5">{project.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-[#ff8c00] uppercase tracking-[0.15em]">
            Deliverables
          </h2>
        </div>

        {deliverables.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <FileText className="h-7 w-7 text-[#1e293b] mx-auto mb-2" />
            <p className="text-xs text-[#64748b]">No deliverables yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliverables.map((d) => {
              const state = STATE_COLORS[d.state] || STATE_COLORS.wip;
              const fc = flagCounts[d.id] || { blocking: 0, material: 0, advisory: 0 };

              return (
                <Link
                  key={d.id}
                  href={`/deliverables/${d.id}`}
                  className="block glass-card p-4 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] text-[#475569] shrink-0 w-14">
                        {d.code}
                      </span>
                      <span className="text-sm text-white truncate group-hover:text-[#ff8c00] transition-colors">
                        {d.title}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider"
                        style={{
                          color: state.color,
                          backgroundColor: `${state.color}12`,
                          border: `1px solid ${state.color}25`,
                        }}
                      >
                        {state.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {fc.blocking > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-[#ef4444]">
                          <AlertCircle className="h-3 w-3" />
                          {fc.blocking}
                        </span>
                      )}
                      {fc.material > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-[#fbbf24]">
                          <AlertTriangle className="h-3 w-3" />
                          {fc.material}
                        </span>
                      )}
                      {fc.advisory > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-[#38bdf8]">
                          <Info className="h-3 w-3" />
                          {fc.advisory}
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-[#334155] group-hover:text-[#ff8c00] transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
