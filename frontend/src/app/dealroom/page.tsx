"use client";

import { useEffect, useState, useRef } from "react";
import {
  Handshake,
  Send,
  Bot,
  User as UserIcon,
  FileText,
  Database,
  Vault,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { api, type Project } from "@/lib/api";
import { useRole } from "@/components/client-shell";

interface Message {
  id: string;
  role: "user" | "bot" | "system";
  text: string;
  author?: string;
  timestamp: Date;
  sources?: string[];
}

interface ProjectData {
  project: Project;
  deliverables: Array<{
    id: string;
    code: string;
    title: string;
    state: string;
    due_date: string | null;
  }>;
  intelligence: {
    stages: Array<{
      code: string;
      title: string;
      pass_status: string;
      flags: { blocking: number; material: number; advisory: number };
      open_count: number;
    }>;
    summary: {
      total_open: number;
      total_resolved: number;
    };
  } | null;
  sla: {
    deliverables: Array<{
      code: string;
      title: string;
      sla_status: string;
      days_remaining: number | null;
    }>;
    summary: { overdue: number; urgent: number; warning: number; on_track: number };
  } | null;
  extractions: Map<string, Array<{ metric: string; value: number; unit: string; source_location: string }>>;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function answerFromData(query: string, data: ProjectData[]): { text: string; sources: string[] } {
  const q = query.toLowerCase();
  const sources: string[] = [];

  // CAPEX / cost queries
  if (q.match(/capex|capital cost|total cost|investment|how much/)) {
    for (const pd of data) {
      for (const [code, exts] of pd.extractions) {
        const capex = exts.find(e => e.metric === "total_capex");
        const perKw = exts.find(e => e.metric === "capex_per_kw");
        if (capex) {
          sources.push(`${code}: ${capex.source_location}`);
          let text = `The total CAPEX for **${pd.project.name}** is **$${(capex.value / 1e6).toFixed(1)}M**`;
          if (perKw) text += ` ($${perKw.value.toLocaleString()}/kW)`;
          text += `. Source: ${capex.source_location}`;
          return { text, sources };
        }
      }
    }
    return { text: "No CAPEX data found in the approved documents. The financial model may not have been published yet.", sources: [] };
  }

  // LCOE / tariff queries
  if (q.match(/lcoe|levelized|tariff|electricity cost|price/)) {
    for (const pd of data) {
      for (const [code, exts] of pd.extractions) {
        const lcoe = exts.find(e => e.metric === "lcoe");
        const tariff = exts.find(e => e.metric === "tariff_required");
        if (lcoe || tariff) {
          sources.push(`${code}: Financial Model`);
          let text = "";
          if (lcoe) text += `LCOE is **$${lcoe.value}/kWh** (${lcoe.source_location})`;
          if (lcoe && tariff) text += `. `;
          if (tariff) text += `Required tariff is **$${tariff.value}/kWh** (${tariff.source_location})`;
          return { text, sources };
        }
      }
    }
    return { text: "LCOE data not found in the current document set. Check if the Financial Model has been uploaded.", sources: [] };
  }

  // IRR / return queries
  if (q.match(/irr|return|npv|payback|financial return|viable/)) {
    for (const pd of data) {
      for (const [code, exts] of pd.extractions) {
        const pirr = exts.find(e => e.metric === "project_irr");
        const eirr = exts.find(e => e.metric === "equity_irr");
        const npv = exts.find(e => e.metric === "npv_at_10pct");
        const payback = exts.find(e => e.metric === "payback_period");
        if (pirr || eirr) {
          sources.push(`${code}: Feasibility Report`);
          let text = `Financial returns for **${pd.project.name}**:\n`;
          if (pirr) text += `- Project IRR: **${pirr.value}%**\n`;
          if (eirr) text += `- Equity IRR: **${eirr.value}%**\n`;
          if (npv) text += `- NPV (10%): **$${(npv.value / 1e6).toFixed(1)}M**\n`;
          if (payback) text += `- Payback period: **${payback.value} years**`;
          return { text, sources };
        }
      }
    }
    return { text: "Financial return data not yet available. The Feasibility Report may need to be published first.", sources: [] };
  }

  // Capacity / generation queries
  if (q.match(/capacity|generation|mw|energy|output|power/)) {
    for (const pd of data) {
      for (const [code, exts] of pd.extractions) {
        const cap = exts.find(e => e.metric === "installed_capacity");
        const gen = exts.find(e => e.metric === "annual_generation");
        const cf = exts.find(e => e.metric === "capacity_factor");
        if (cap) {
          sources.push(`${code}: Feasibility Report`);
          let text = `**${pd.project.name}** — Installed capacity: **${cap.value} ${cap.unit}**`;
          if (gen) text += `, annual generation: **${gen.value.toLocaleString()} ${gen.unit}**`;
          if (cf) text += `, capacity factor: **${cf.value}%**`;
          return { text, sources };
        }
      }
    }
    return { text: "Capacity data not found in the published documents.", sources: [] };
  }

  // Environmental / ESIA queries
  if (q.match(/environment|esia|impact|co2|carbon|emission|household|resettle|land/)) {
    for (const pd of data) {
      for (const [code, exts] of pd.extractions) {
        const co2 = exts.find(e => e.metric === "co2_avoided");
        const hh = exts.find(e => e.metric === "affected_households");
        const land = exts.find(e => e.metric === "land_area_required");
        const resetCost = exts.find(e => e.metric === "resettlement_cost");
        if (co2 || hh || land) {
          sources.push(`${code}: ESIA Report`);
          let text = `Environmental & Social data for **${pd.project.name}**:\n`;
          if (co2) text += `- CO2 avoided: **${co2.value.toLocaleString()} ${co2.unit}**\n`;
          if (hh) text += `- Affected households: **${hh.value}**\n`;
          if (land) text += `- Land required: **${land.value} ${land.unit}**\n`;
          if (resetCost) text += `- Resettlement cost: **$${(resetCost.value / 1e6).toFixed(1)}M**`;
          return { text, sources };
        }
      }
    }
    return { text: "No environmental data found. The ESIA report may not have been uploaded yet.", sources: [] };
  }

  // Status / progress queries
  if (q.match(/status|progress|how.*going|update|state|deliverable/)) {
    const parts: string[] = [];
    for (const pd of data) {
      const published = pd.deliverables.filter(d => d.state === "published").length;
      const shared = pd.deliverables.filter(d => d.state === "shared").length;
      const wip = pd.deliverables.filter(d => d.state === "wip").length;
      parts.push(`**${pd.project.name}**: ${published} published, ${shared} under review, ${wip} in progress`);
      if (pd.intelligence) {
        parts.push(`  Flags: ${pd.intelligence.summary.total_open} open, ${pd.intelligence.summary.total_resolved} resolved`);
      }
      sources.push("Project Dashboard");
    }
    return { text: parts.join("\n"), sources };
  }

  // SLA / deadline queries
  if (q.match(/sla|deadline|overdue|urgent|due|when|schedule/)) {
    const parts: string[] = [];
    for (const pd of data) {
      if (!pd.sla) continue;
      if (pd.sla.summary.overdue > 0 || pd.sla.summary.urgent > 0) {
        parts.push(`**${pd.project.name}**: ${pd.sla.summary.overdue} overdue, ${pd.sla.summary.urgent} urgent`);
        const alerts = pd.sla.deliverables.filter(d => d.sla_status === "overdue" || d.sla_status === "urgent");
        for (const a of alerts) {
          parts.push(`  - ${a.code} ${a.title}: ${a.days_remaining !== null ? `${Math.abs(a.days_remaining)}d ${a.days_remaining < 0 ? "overdue" : "remaining"}` : "no deadline"}`);
        }
      } else {
        parts.push(`**${pd.project.name}**: All deliverables on track`);
      }
      sources.push("SLA Tracking");
    }
    return { text: parts.length > 0 ? parts.join("\n") : "No SLA data available.", sources };
  }

  // Flags / issues queries
  if (q.match(/flag|issue|block|problem|concern|risk/)) {
    const parts: string[] = [];
    for (const pd of data) {
      if (!pd.intelligence) continue;
      const openStages = pd.intelligence.stages.filter(s => s.open_count > 0);
      if (openStages.length > 0) {
        parts.push(`**${pd.project.name}** — open flags:`);
        for (const s of openStages) {
          const tags = [];
          if (s.flags.blocking > 0) tags.push(`${s.flags.blocking} blocking`);
          if (s.flags.material > 0) tags.push(`${s.flags.material} material`);
          if (s.flags.advisory > 0) tags.push(`${s.flags.advisory} advisory`);
          parts.push(`  - ${s.code} ${s.title}: ${tags.join(", ")}`);
        }
      }
      sources.push("Intelligence Review");
    }
    return { text: parts.length > 0 ? parts.join("\n") : "No open flags found across all projects.", sources };
  }

  // Project list
  if (q.match(/project|list|what.*have|show me/)) {
    const parts = data.map(pd => {
      const count = pd.deliverables.length;
      return `- **${pd.project.name}**: ${count} deliverables (${pd.deliverables.filter(d => d.state === "published").length} published)`;
    });
    sources.push("Project Database");
    return { text: `Available projects:\n${parts.join("\n")}`, sources };
  }

  // Benchmark queries
  if (q.match(/benchmark|comparison|industry|standard|range/)) {
    sources.push("Benchmark Library");
    return {
      text: "The Benchmark Library contains transmission line and energy project cost benchmarks from tiered sources. You can access it from the **Benchmarks** section in the sidebar to compare project costs against industry standards.\n\nKey benchmarks checked:\n- CAPEX range per kW for technology and geography\n- LCOE plausibility range\n- AACE accuracy class verification\n- O&M cost benchmarks",
      sources,
    };
  }

  // Default response
  return {
    text: "I can answer questions about the project documents. Try asking about:\n- **Financial data** (CAPEX, LCOE, IRR, NPV)\n- **Technical specs** (capacity, generation, capacity factor)\n- **Environmental data** (CO2, land use, resettlement)\n- **Project status** (deliverable progress, flags)\n- **SLA deadlines** (overdue items, schedules)\n- **Benchmarks** (cost comparisons, industry standards)\n- **Issues & flags** (blocking items, review concerns)",
    sources: [],
  };
}

export default function DealRoomPage() {
  const { role } = useRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadProjectData();
  }, []);

  async function loadProjectData() {
    try {
      const projects = await api.projects.list();
      const allData: ProjectData[] = [];

      for (const proj of projects) {
        const [deliverables, intelligence, sla] = await Promise.all([
          api.projects.deliverables(proj.id).catch(() => []),
          api.intelligence.summary(proj.id).catch(() => null),
          api.sla.status(proj.id).catch(() => null),
        ]);

        const extractions = new Map<string, Array<{ metric: string; value: number; unit: string; source_location: string }>>();
        for (const del of deliverables) {
          try {
            const versions = await api.deliverables.versions(del.id);
            for (const v of versions) {
              try {
                const exts = await api.extractions.list(v.id);
                if (exts.length > 0) {
                  const existing = extractions.get(del.code) || [];
                  extractions.set(del.code, [...existing, ...exts]);
                }
              } catch {}
            }
          } catch {}
        }

        allData.push({
          project: proj,
          deliverables,
          intelligence,
          sla,
          extractions,
        });
      }

      setProjectData(allData);
      setMessages([{
        id: generateId(),
        role: "system",
        text: `Connected to ${projects.length} project(s) with ${allData.reduce((s, d) => s + d.deliverables.length, 0)} deliverables. Data room, benchmarks, and approved documents are loaded.`,
        timestamp: new Date(),
      }, {
        id: generateId(),
        role: "bot",
        text: `Welcome to the Deal Room. I have access to all project documents, data rooms, benchmarks, and approved deliverables.\n\nAsk me anything about the projects — financials, technical specs, environmental data, review status, or deadlines. Developers and consultants can also ask questions here for the team to discuss.`,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages([{
        id: generateId(),
        role: "bot",
        text: "Unable to connect to the project database. Please ensure the backend is running.",
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const roleLabel = role === "afcen_lead" ? "AfCEN Lead" : role === "consultant" ? "Consultant" : role === "developer" ? "Developer" : "Investor";

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text,
      author: roleLabel,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    const { text: answer, sources } = answerFromData(text, projectData);

    const botMsg: Message = {
      id: generateId(),
      role: "bot",
      text: answer,
      timestamp: new Date(),
      sources,
    };
    setMessages(prev => [...prev, botMsg]);
    setThinking(false);
  };

  const suggestedQuestions = [
    "What is the total CAPEX?",
    "Show project status",
    "What are the open flags?",
    "What is the project IRR?",
    "Any overdue deadlines?",
    "Environmental impact data",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-6 w-6 text-[#ff8c00] mx-auto mb-3 animate-spin" />
          <p className="text-[11px] text-[var(--surface-text-muted)]">Loading project documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#ff8c00]/10 border border-[#ff8c00]/15">
                <Handshake className="h-4 w-4 text-[#ff8c00]" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-[var(--surface-text-strong)] tracking-tight">
                  Deal Room
                </h1>
                <p className="text-[10px] text-[var(--surface-text-faint)]">
                  Ask questions about project documents, data rooms & benchmarks
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--surface-text-faint)]">
            <span className="flex items-center gap-1"><Vault className="h-3 w-3" /> Data Room</span>
            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Benchmarks</span>
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Documents</span>
            <span className="flex items-center gap-1 text-[#22c55e]">
              <Sparkles className="h-3 w-3" /> Connected
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] ${msg.role === "system" ? "w-full max-w-full" : ""}`}>
              {msg.role === "system" ? (
                <div className="text-center py-2">
                  <span className="text-[9px] text-[var(--surface-text-dim)] bg-[var(--surface-input)] px-3 py-1 rounded-full border border-[var(--surface-border)]">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[#ff8c00]/10 border border-[#ff8c00]/15"
                    : "bg-[var(--surface-card)] border border-[var(--surface-border)]"
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {msg.role === "bot" ? (
                      <Bot className="h-3.5 w-3.5 text-[#ff8c00]" />
                    ) : (
                      <UserIcon className="h-3.5 w-3.5 text-[#38bdf8]" />
                    )}
                    <span className="text-[10px] font-medium text-[var(--surface-text-muted)]">
                      {msg.role === "bot" ? "Deal Room AI" : msg.author || "You"}
                    </span>
                    <span className="text-[9px] text-[var(--surface-text-dim)]">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--surface-text)] leading-relaxed whitespace-pre-wrap deal-room-content">
                    {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                      part.startsWith("**") && part.endsWith("**")
                        ? <strong key={i} className="text-[var(--surface-text-strong)] font-semibold">{part.slice(2, -2)}</strong>
                        : <span key={i}>{part}</span>
                    )}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[var(--surface-border)]">
                      <span className="text-[9px] text-[var(--surface-text-dim)]">Sources:</span>
                      {msg.sources.map((s, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-input)] text-[var(--surface-text-faint)] border border-[var(--surface-border)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-[var(--surface-card)] border border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-[#ff8c00] animate-spin" />
                <span className="text-[11px] text-[var(--surface-text-muted)]">Searching documents...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div className="shrink-0 px-5 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] text-[var(--surface-text-muted)] bg-[var(--surface-input)] border border-[var(--surface-border)] hover:border-[#ff8c00]/20 hover:text-[#ff8c00] transition-all"
              >
                <MessageSquare className="h-3 w-3" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-5 py-3 border-t border-[var(--surface-border)]">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about the project documents..."
            className="flex-1 bg-[var(--surface-input)] border border-[var(--surface-border)] rounded-xl px-4 py-2.5 text-[12px] text-[var(--surface-text)] placeholder-[var(--surface-text-dim)] outline-none focus:border-[#ff8c00]/30 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ff8c00]/15 text-[#ff8c00] hover:bg-[#ff8c00]/25 disabled:opacity-30 transition-all border border-[#ff8c00]/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[9px] text-[var(--surface-text-dim)] mt-1.5 text-center">
          Answers are sourced from data rooms, benchmarks, and approved documents
        </p>
      </div>
    </div>
  );
}
