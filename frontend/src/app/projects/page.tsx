"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, ArrowRight } from "lucide-react";
import { api, type Project } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects
      .list()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Projects
          </h1>
          <p className="text-[10px] text-[#64748b] mt-0.5 uppercase tracking-[0.15em]">
            Manage feasibility study deliverable reviews
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff8c00]/15 text-[#ff8c00] text-[11px] hover:bg-[#ff8c00]/25 transition-all border border-[#ff8c00]/20">
          <Plus className="h-3 w-3" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#64748b] text-xs">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-10 w-10 text-[#1e293b] mx-auto mb-3" />
          <p className="text-xs text-[#64748b]">No projects found</p>
          <p className="text-[10px] text-[#475569] mt-1">
            Ensure the backend is running on port 8001
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block glass-card p-4 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white truncate group-hover:text-[#ff8c00] transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-[#64748b] mt-1 line-clamp-2">
                    {p.description}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#334155] group-hover:text-[#ff8c00] transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-[#475569]">
                <span>ID: {p.source_id || "—"}</span>
                <span>
                  Created:{" "}
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
