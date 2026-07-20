"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Bot, ArrowRight } from "lucide-react";
import { useRole } from "./client-shell";

interface Message {
  role: "user" | "bot";
  text: string;
  links?: { label: string; href: string }[];
}

const QUICK_ACTIONS = [
  { label: "View my projects", keywords: ["project", "projects", "my project"] },
  { label: "Check deliverable status", keywords: ["deliverable", "status", "progress", "stage"] },
  { label: "Open data room", keywords: ["data room", "dataroom", "documents", "published"] },
  { label: "View benchmarks", keywords: ["benchmark", "benchmarks", "cost", "library"] },
  { label: "Check review flags", keywords: ["flag", "flags", "review", "blocked", "issue"] },
  { label: "Upload a document", keywords: ["upload", "submit", "file", "version"] },
  { label: "Check SLA deadlines", keywords: ["sla", "deadline", "due", "overdue", "reminder"] },
];

function getBotResponse(input: string, role: string | null): Message {
  const lower = input.toLowerCase().trim();

  if (lower.match(/hello|hi|hey|help|start|what can/)) {
    return {
      role: "bot",
      text: `Welcome to the AfCEN Project Manager! I can help you navigate the platform. Here are some things I can help with:`,
      links: [
        { label: "View projects", href: "/projects" },
        { label: "Dashboard overview", href: "/dashboard" },
        { label: "Data room", href: "/dataroom" },
        ...(role === "afcen_lead" ? [{ label: "Benchmark library", href: "/benchmarks" }] : []),
      ],
    };
  }

  if (lower.match(/project|projects/)) {
    return {
      role: "bot",
      text: "You can view all your projects and their deliverables from the Projects page. Click on any project to see its deliverables, upload new versions, and track review status.",
      links: [{ label: "Go to Projects", href: "/projects" }],
    };
  }

  if (lower.match(/deliverable|status|progress|stage|track/)) {
    return {
      role: "bot",
      text: "Each deliverable goes through three stages: WIP → Shared → Published. When a deliverable moves to Shared, the AfCEN intelligence layer runs automated checks. You can track status from any project's detail page.",
      links: [{ label: "View projects", href: "/projects" }],
    };
  }

  if (lower.match(/data\s?room|published doc/)) {
    return {
      role: "bot",
      text: "The Data Room contains all published deliverables available for review and download. Only deliverables that have passed review and been published appear here.",
      links: [{ label: "Open Data Room", href: "/dataroom" }],
    };
  }

  if (lower.match(/benchmark|cost|library/)) {
    if (role === "afcen_lead") {
      return {
        role: "bot",
        text: "The Benchmark Library contains transmission line cost benchmarks from tiered sources. You can view entries, check validation status, and compare against submitted cost estimates.",
        links: [{ label: "Open Benchmarks", href: "/benchmarks" }],
      };
    }
    return {
      role: "bot",
      text: "The Benchmark Library is available to AfCEN Lead users. Switch to the AfCEN Lead role to access benchmark data and cost comparisons.",
    };
  }

  if (lower.match(/flag|review|blocked|issue|check|intelligence/)) {
    return {
      role: "bot",
      text: "The Intelligence Review on your dashboard shows all deliverable flags — blocking (red), material (yellow), and advisory (blue). Click any deliverable to see detailed flag information and resolve issues.",
      links: [{ label: "Go to Dashboard", href: "/dashboard" }],
    };
  }

  if (lower.match(/upload|submit|file|version|document/)) {
    return {
      role: "bot",
      text: "To upload a document: go to Projects → select your project → click on a deliverable → use the 'Upload New Version' button. The platform will automatically run checks when the deliverable is transitioned to Shared.",
      links: [{ label: "Go to Projects", href: "/projects" }],
    };
  }

  if (lower.match(/sla|deadline|due|overdue|remind|reminder|email/)) {
    return {
      role: "bot",
      text: "SLA tracking monitors deliverable due dates and sends reminders when deadlines approach. Check the dashboard for overdue or urgent items. AfCEN Leads can configure email reminders for team members.",
      links: [{ label: "Go to Dashboard", href: "/dashboard" }],
    };
  }

  if (lower.match(/role|permission|access|switch/)) {
    return {
      role: "bot",
      text: "You can switch roles using the dropdown at the bottom of the sidebar. Each role has different access levels:\n• AfCEN Lead — Full access including publish & benchmarks\n• Consultant — Submit deliverables & respond to flags\n• Developer — Create projects & upload studies\n• Investor — Read-only data room access",
    };
  }

  if (lower.match(/workflow|process|how does/)) {
    return {
      role: "bot",
      text: "The workflow: 1) Developer/Consultant uploads a deliverable version. 2) Transition to Shared triggers intelligence checks. 3) AfCEN Lead reviews flags and resolves issues. 4) Once clear, the deliverable is Published to the Data Room for all stakeholders.",
      links: [
        { label: "View projects", href: "/projects" },
        { label: "Open Data Room", href: "/dataroom" },
      ],
    };
  }

  return {
    role: "bot",
    text: "I can help you with: viewing projects, checking deliverable status, accessing the data room, reviewing flags, uploading documents, or checking SLA deadlines. What would you like to do?",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Projects", href: "/projects" },
      { label: "Data Room", href: "/dataroom" },
    ],
  };
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm the AfCEN assistant. How can I help you navigate the platform today?",
      links: [
        { label: "View projects", href: "/projects" },
        { label: "Check dashboard", href: "/dashboard" },
        { label: "Open data room", href: "/dataroom" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { role } = useRole();

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { role: "user", text };
    const botMsg = getBotResponse(text, role);
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  const handleLink = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ff8c00] text-black shadow-lg shadow-[#ff8c00]/20 hover:shadow-[#ff8c00]/40 hover:scale-105 transition-all"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] h-[520px] flex flex-col glass-elevated rounded-2xl overflow-hidden shadow-2xl shadow-black/40 animate-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface-border)]">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#ff8c00]/10">
                <Bot className="h-3.5 w-3.5 text-[#ff8c00]" />
              </div>
              <div>
                <span className="text-[12px] font-medium text-[var(--surface-text-strong)]">AfCEN Assistant</span>
                <span className="text-[9px] text-[var(--surface-text-faint)] block">Platform navigation help</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-[var(--surface-text-muted)] hover:text-[var(--surface-text-strong)] hover:bg-[var(--surface-hover)] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#ff8c00]/15 text-[#ff8c00] border border-[#ff8c00]/20"
                      : "bg-[var(--surface-input)] text-[var(--surface-text)] border border-[var(--surface-border)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.links.map((link, j) => (
                        <button
                          key={j}
                          onClick={() => handleLink(link.href)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-[#ff8c00] bg-[#ff8c00]/8 hover:bg-[#ff8c00]/15 border border-[#ff8c00]/15 transition-all"
                        >
                          {link.label} <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          <div className="p-3 border-t border-[var(--surface-border)]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-[var(--surface-input)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-[11px] text-[var(--surface-text)] placeholder-[var(--surface-text-dim)] outline-none focus:border-[#ff8c00]/30 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#ff8c00]/15 text-[#ff8c00] hover:bg-[#ff8c00]/25 disabled:opacity-30 disabled:hover:bg-[#ff8c00]/15 transition-all border border-[#ff8c00]/20"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
