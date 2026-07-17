"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck, Shield, Code, Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import { useRole } from "./layout";

const ROLES = [
  { key: "afcen_lead", label: "AfCEN Lead", description: "Full platform access — review deliverables, manage flags, publish documents", icon: Shield, color: "#ff8c00" },
  { key: "consultant", label: "Consultant", description: "Upload deliverables, respond to review flags, track submission status", icon: Briefcase, color: "#38bdf8" },
  { key: "developer", label: "Developer", description: "Create projects, upload feasibility studies, monitor progress", icon: Code, color: "#22c55e" },
  { key: "investor", label: "Investor", description: "Read-only access to data room and published deliverables", icon: TrendingUp, color: "#a78bfa" },
];

export default function RoleSelectorPage() {
  const { role, setRole } = useRole();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (role) router.replace("/dashboard");
  }, [role, router]);

  const handleSelect = (key: string) => {
    setSelected(key);
    setTimeout(() => {
      setRole(key as "developer" | "consultant" | "afcen_lead" | "investor");
      router.push("/dashboard");
    }, 200);
  };

  if (role) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12 animate-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ff8c00]/10 border border-[#ff8c00]/15">
              <FileCheck className="h-6 w-6 text-[#ff8c00]" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
            AfCEN Common Data Environment
          </h1>
          <p className="text-sm text-[#64748b]">
            Select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map((r, i) => {
            const Icon = r.icon;
            const isSelected = selected === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleSelect(r.key)}
                className="glass-card p-5 text-left group animate-in"
                style={{ animationDelay: `${i * 60}ms`, borderColor: isSelected ? `${r.color}40` : undefined }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                    style={{ backgroundColor: `${r.color}10`, border: `1px solid ${r.color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: r.color }} />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-[#334155] group-hover:text-[#64748b] transition-all group-hover:translate-x-0.5"
                  />
                </div>
                <h3 className="text-[13px] font-medium text-white mb-1">
                  {r.label}
                </h3>
                <p className="text-[11px] text-[#64748b] leading-relaxed">
                  {r.description}
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-[#334155] mt-8">
          Bulambuli-Moroto 132 kV IPT — Feasibility Study Review Platform
        </p>
      </div>
    </div>
  );
}
