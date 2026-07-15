"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  XCircle,
  MessageSquare,
  DollarSign,
  Ruler,
  Scale,
  FileSearch,
  User,
  FileUp,
  History,
  ArrowLeftRight,
} from "lucide-react";
import { api, type Deliverable, type Flag, type Version } from "@/lib/api";

const SEVERITY_CONFIG = {
  blocking: { icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)", label: "Blocking" },
  material: { icon: AlertTriangle, color: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.15)", label: "Material" },
  advisory: { icon: Info, color: "#38bdf8", bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)", label: "Advisory" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "#fbbf24" },
  accepted: { label: "Accepted", color: "#22c55e" },
  dismissed: { label: "Dismissed", color: "#64748b" },
  clarification_requested: { label: "Clarification", color: "#a78bfa" },
};

interface FlagGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  flags: Flag[];
}

function groupFlags(flags: Flag[]): FlagGroup[] {
  const groups: FlagGroup[] = [
    { key: "financial", label: "Financial", icon: <DollarSign className="h-3.5 w-3.5" />, color: "#22c55e", flags: [] },
    { key: "technical", label: "Technical", icon: <Ruler className="h-3.5 w-3.5" />, color: "#38bdf8", flags: [] },
    { key: "compliance", label: "Compliance", icon: <Scale className="h-3.5 w-3.5" />, color: "#fbbf24", flags: [] },
    { key: "general", label: "General", icon: <FileSearch className="h-3.5 w-3.5" />, color: "#94a3b8", flags: [] },
  ];

  for (const flag of flags) {
    if (flag.check_type === "universal") groups[0].flags.push(flag);
    else if (flag.check_type === "benchmark") groups[1].flags.push(flag);
    else if (flag.check_type === "aace") groups[2].flags.push(flag);
    else groups[3].flags.push(flag);
  }

  return groups.filter((g) => g.flags.length > 0);
}

export default function DeliverableReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["financial", "technical", "compliance", "general"]));
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [del, fl, vers] = await Promise.all([
        api.deliverables.get(id),
        api.flags.list(id),
        api.deliverables.versions(id),
      ]);
      setDeliverable(del);
      setFlags(fl);
      setVersions(vers);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.deliverables.uploadVersion(id, file);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTransition = async (toState: string) => {
    setTransitioning(true);
    try {
      await api.deliverables.transition(id, { to_state: toState, actor: "admin", reason: `Transition to ${toState}` });
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  const handleResolve = async (flagId: string, status: string) => {
    setResolving(flagId);
    try {
      await api.flags.resolve(flagId, { status, resolved_by: "admin", resolution_note: `${status} by reviewer` });
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setResolving(null);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) return <div className="text-center py-16 text-[#64748b] text-xs">Loading review...</div>;
  if (!deliverable) return <div className="text-center py-16 text-[#64748b] text-xs">Deliverable not found</div>;

  const openFlags = flags.filter((f) => f.status === "open");
  const resolvedFlags = flags.filter((f) => f.status !== "open");
  const hasBlockingOpen = openFlags.some((f) => f.severity === "blocking");
  const latestVersion = versions[0] || null;
  const stateColor = deliverable.state === "published" ? "#22c55e" : deliverable.state === "shared" ? "#ff8c00" : "#64748b";
  const openGroups = groupFlags(openFlags);
  const resolvedGroups = groupFlags(resolvedFlags);

  return (
    <div className="h-[calc(100vh-2.75rem)] flex flex-col">
      {/* Header */}
      <div className="glass-elevated flex items-center justify-between px-5 py-2.5 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${deliverable.project_id}`} className="text-[10px] text-[#475569] hover:text-[#ff8c00] transition-colors uppercase tracking-wider">
            &larr; Back
          </Link>
          <div className="h-3.5 w-px bg-white/10" />
          <span className="text-[10px] text-[#475569]">{deliverable.code}</span>
          <span className="text-sm font-medium text-white">{deliverable.title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ color: stateColor, backgroundColor: `${stateColor}12`, border: `1px solid ${stateColor}25` }}>
            {deliverable.state}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {deliverable.state === "wip" && (
            <button onClick={() => handleTransition("shared")} disabled={transitioning} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff8c00]/15 text-[#ff8c00] text-[11px] hover:bg-[#ff8c00]/25 transition-all border border-[#ff8c00]/20 disabled:opacity-50">
              <ArrowLeftRight className="h-3 w-3" /> Submit for Review
            </button>
          )}
          {deliverable.state === "shared" && (
            <>
              <button onClick={() => handleTransition("wip")} disabled={transitioning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#64748b] text-[11px] hover:text-white hover:bg-white/5 transition-all border border-white/6 disabled:opacity-50">
                Withdraw
              </button>
              <button onClick={() => handleTransition("published")} disabled={transitioning || hasBlockingOpen} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22c55e]/15 text-[#22c55e] text-[11px] hover:bg-[#22c55e]/25 transition-all border border-[#22c55e]/20 disabled:opacity-50" title={hasBlockingOpen ? "Cannot publish with open blocking flags" : "Publish"}>
                <CheckCircle2 className="h-3 w-3" /> Publish
              </button>
            </>
          )}
          {deliverable.state === "published" && (
            <button onClick={() => handleTransition("shared")} disabled={transitioning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#fbbf24] text-[11px] hover:bg-[#fbbf24]/10 transition-all border border-[#fbbf24]/20 disabled:opacity-50">
              Revoke
            </button>
          )}
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Document */}
        <div className="w-1/2 border-r border-white/[0.04] overflow-y-auto">
          <div className="p-4 space-y-3">
            <div className="glass rounded-xl overflow-hidden">
              {latestVersion && latestVersion.file_name.endsWith(".pdf") ? (
                <embed
                  src={api.deliverables.fileUrl(latestVersion.id)}
                  type="application/pdf"
                  className="w-full"
                  style={{ height: "520px" }}
                />
              ) : latestVersion ? (
                <div className="p-8 text-center">
                  <FileText className="h-8 w-8 text-[#1e293b] mx-auto mb-2" />
                  <p className="text-sm text-white">{latestVersion.file_name}</p>
                  <p className="text-[10px] text-[#64748b] mt-1">{latestVersion.file_type || "Unknown"} &middot; v{latestVersion.version_number}</p>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <FileText className="h-8 w-8 text-[#1e293b] mx-auto mb-2" />
                  <p className="text-xs text-[#64748b]">No document uploaded</p>
                  <p className="text-[10px] text-[#475569] mt-1">Upload a deliverable to begin review</p>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" accept=".pdf,.docx,.xlsx,.csv" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/8 hover:border-[#ff8c00]/25 text-[#64748b] text-[11px] hover:text-[#ff8c00] hover:bg-[#ff8c00]/[0.02] transition-all disabled:opacity-50">
              <FileUp className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload New Version"}
            </button>

            {latestVersion && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#ff8c00] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <User className="h-3 w-3" /> Submission Details
                </h3>
                <div className="space-y-2 text-[11px]">
                  {[
                    ["Submitted by", latestVersion.uploaded_by],
                    ["Version", `v${latestVersion.version_number}`],
                    ["File", latestVersion.file_name],
                    ["Uploaded", new Date(latestVersion.created_at).toLocaleString()],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[#64748b]">{label}</span>
                      <span className="text-[#c8d0dc] truncate ml-4">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Extraction</span>
                    <span className={latestVersion.extraction_confirmed ? "text-[#22c55e]" : "text-[#fbbf24]"}>
                      {latestVersion.extraction_confirmed ? "Confirmed" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {versions.length > 1 && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-[10px] font-semibold text-[#64748b] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <History className="h-3 w-3" /> Version History
                </h3>
                <div className="space-y-1">
                  {versions.map((v) => (
                    <div key={v.id} className={`flex items-center justify-between text-[11px] py-1.5 px-2 rounded-md ${v.id === latestVersion?.id ? "bg-[#ff8c00]/5 border border-[#ff8c00]/10" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[#c8d0dc]">v{v.version_number}</span>
                        <span className="text-[#334155]">&middot;</span>
                        <span className="text-[#64748b]">{v.file_name}</span>
                      </div>
                      <span className="text-[#475569]">{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Evaluation */}
        <div className="w-1/2 overflow-y-auto bg-[#04060a]">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4 px-1">
              <span className="text-[10px] text-[#ff8c00] uppercase tracking-[0.15em] font-semibold">Evaluation Summary</span>
              <div className="flex-1" />
              {openFlags.filter((f) => f.severity === "blocking").length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-[#ef4444]"><AlertCircle className="h-3 w-3" />{openFlags.filter((f) => f.severity === "blocking").length} blocking</span>
              )}
              {openFlags.filter((f) => f.severity === "material").length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-[#fbbf24]"><AlertTriangle className="h-3 w-3" />{openFlags.filter((f) => f.severity === "material").length} material</span>
              )}
              {openFlags.filter((f) => f.severity === "advisory").length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-[#38bdf8]"><Info className="h-3 w-3" />{openFlags.filter((f) => f.severity === "advisory").length} advisory</span>
              )}
            </div>

            {flags.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-7 w-7 text-[#1e293b] mx-auto mb-2" />
                <p className="text-xs text-[#64748b]">No flags raised</p>
                <p className="text-[10px] text-[#475569] mt-1">Submit for review to trigger automated checks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.key);
                  return (
                    <div key={group.key} className="glass rounded-xl overflow-hidden">
                      <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <span style={{ color: group.color }}>{group.icon}</span>
                        <span className="text-[11px] font-semibold text-white uppercase tracking-[0.12em] flex-1 text-left">{group.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ color: group.color, backgroundColor: `${group.color}12` }}>
                          {group.flags.length} open
                        </span>
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[#334155]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#334155]" />}
                      </button>
                      {isExpanded && (
                        <div className="px-2 pb-2 space-y-1.5">
                          {group.flags.map((flag) => (
                            <FlagCard key={flag.id} flag={flag} expanded={expandedFlag === flag.id} onToggle={() => setExpandedFlag(expandedFlag === flag.id ? null : flag.id)} onResolve={handleResolve} resolving={resolving === flag.id} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {resolvedFlags.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-[10px] text-[#475569] uppercase tracking-[0.15em] mb-2 px-1">Resolved ({resolvedFlags.length})</h3>
                    <div className="space-y-1.5 opacity-50">
                      {resolvedGroups.map((group) => (
                        <div key={group.key} className="space-y-1.5">
                          {group.flags.map((flag) => (
                            <FlagCard key={flag.id} flag={flag} expanded={expandedFlag === flag.id} onToggle={() => setExpandedFlag(expandedFlag === flag.id ? null : flag.id)} onResolve={handleResolve} resolving={resolving === flag.id} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlagCard({ flag, expanded, onToggle, onResolve, resolving }: {
  flag: Flag; expanded: boolean; onToggle: () => void; onResolve: (flagId: string, status: string) => void; resolving: boolean;
}) {
  const sev = SEVERITY_CONFIG[flag.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.advisory;
  const SevIcon = sev.icon;
  const statusInfo = STATUS_LABELS[flag.status] || STATUS_LABELS.open;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}>
      <button onClick={onToggle} className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-white/[0.02] transition-colors">
        <SevIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: sev.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-white">{flag.title}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}12` }}>{statusInfo.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] px-1 rounded" style={{ color: sev.color, backgroundColor: `${sev.color}12` }}>{sev.label}</span>
            <span className="text-[9px] text-[#475569]">{flag.check_id}</span>
          </div>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-[#334155] shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-[#334155] shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/[0.03]">
          <p className="text-[11px] text-[#94a3b8] mt-3 leading-relaxed">{flag.description}</p>
          {flag.chain && (
            <details className="mt-3">
              <summary className="text-[9px] text-[#475569] cursor-pointer hover:text-[#94a3b8] uppercase tracking-wider">Evidence chain</summary>
              <pre className="mt-2 text-[9px] text-[#64748b] bg-black/20 rounded-lg p-2 overflow-x-auto">{JSON.stringify(flag.chain, null, 2)}</pre>
            </details>
          )}
          {flag.status === "open" && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.03]">
              <button onClick={() => onResolve(flag.id, "accepted")} disabled={resolving} className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] text-[#22c55e] border border-[#22c55e]/15 hover:bg-[#22c55e]/10 disabled:opacity-50 transition-all">
                <CheckCircle2 className="h-3 w-3" /> Accept
              </button>
              <button onClick={() => onResolve(flag.id, "dismissed")} disabled={resolving} className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] text-[#64748b] border border-white/6 hover:bg-white/5 disabled:opacity-50 transition-all">
                <XCircle className="h-3 w-3" /> Dismiss
              </button>
              <button onClick={() => onResolve(flag.id, "clarification_requested")} disabled={resolving} className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] text-[#a78bfa] border border-[#a78bfa]/15 hover:bg-[#a78bfa]/10 disabled:opacity-50 transition-all">
                <MessageSquare className="h-3 w-3" /> Clarification
              </button>
            </div>
          )}
          {flag.resolution_note && (
            <div className="mt-2 text-[9px] text-[#475569]">
              Resolution: {flag.resolution_note}{flag.resolved_by && ` (by ${flag.resolved_by})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
