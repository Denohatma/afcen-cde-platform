"use client";

import { useEffect, useState } from "react";
import { Vault, FileText, Download, Eye } from "lucide-react";
import { api, type Project, type DataRoom } from "@/lib/api";

export default function DataRoomPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [datarooms, setDatarooms] = useState<Record<string, DataRoom>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.list()
      .then(async (projs) => {
        setProjects(projs);
        const rooms: Record<string, DataRoom> = {};
        for (const p of projs) {
          try {
            rooms[p.id] = await api.dataroom.get(p.id);
          } catch {}
        }
        setDatarooms(rooms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Vault className="h-5 w-5 text-[#a78bfa]" />
        <div>
          <h1 className="text-xl font-semibold text-[var(--surface-text-strong)] tracking-tight">Data Room</h1>
          <p className="text-[11px] text-[var(--surface-text-faint)]">Published deliverables available for review</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--surface-text-faint)] text-[11px]">Loading data room...</div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Vault className="h-8 w-8 text-[var(--surface-text-dim)] mx-auto mb-3" />
          <p className="text-[11px] text-[var(--surface-text-faint)]">No projects available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => {
            const room = datarooms[project.id];
            const docs = room?.documents || [];
            return (
              <div key={project.id} className="glass-card overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--surface-border)]">
                  <h2 className="text-[13px] font-medium text-[var(--surface-text-strong)]">{project.name}</h2>
                  <p className="text-[10px] text-[var(--surface-text-faint)] mt-0.5">{docs.length} published document{docs.length !== 1 ? "s" : ""}</p>
                </div>
                {docs.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-[11px] text-[var(--surface-text-dim)]">No published documents yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {docs.map((doc) => (
                      <div key={doc.deliverable_id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-input)] transition-colors">
                        <FileText className="h-4 w-4 text-[var(--surface-text-faint)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--surface-text-faint)] mono">{doc.code}</span>
                            <span className="text-[12px] text-[var(--surface-text)]">{doc.title}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[var(--surface-text-dim)]">
                            <span>{doc.file_name || "—"}</span>
                            <span>v{doc.version}</span>
                            {doc.published_at && <span>{new Date(doc.published_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {doc.version_id && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={api.deliverables.fileUrl(doc.version_id)}
                              target="_blank"
                              rel="noopener"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-[var(--surface-text-muted)] hover:text-[#a78bfa] hover:bg-[#a78bfa]/5 border border-[var(--surface-border)] transition-all"
                            >
                              <Eye className="h-3 w-3" /> View
                            </a>
                            <a
                              href={api.deliverables.fileUrl(doc.version_id)}
                              download
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-[var(--surface-text-muted)] hover:text-[#22c55e] hover:bg-[#22c55e]/5 border border-[var(--surface-border)] transition-all"
                            >
                              <Download className="h-3 w-3" /> Download
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
