"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck,
  LayoutDashboard,
  FolderOpen,
  Database,
  Vault,
  Brain,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";
import "./globals.css";

type Role = "developer" | "consultant" | "afcen_lead" | "investor" | null;

interface RoleContextType {
  role: Role;
  setRole: (r: Role) => void;
  hasPermission: (p: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  developer: ["projects.read", "projects.create", "deliverables.read", "deliverables.upload", "versions.read", "flags.read", "dataroom.read"],
  consultant: ["projects.read", "deliverables.read", "deliverables.upload", "deliverables.transition", "versions.read", "flags.read", "flags.respond", "extractions.read"],
  afcen_lead: ["projects.read", "projects.create", "deliverables.read", "deliverables.upload", "deliverables.transition", "deliverables.publish", "versions.read", "flags.read", "flags.resolve", "extractions.read", "extractions.confirm", "benchmarks.read", "benchmarks.manage", "dataroom.read", "dataroom.manage", "intelligence.read", "export.read", "audit.read"],
  investor: ["projects.read", "deliverables.read", "dataroom.read", "intelligence.read"],
};

const ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  consultant: "Consultant",
  afcen_lead: "AfCEN Lead",
  investor: "Investor",
};

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
  hasPermission: () => false,
});

export const useRole = () => useContext(RoleContext);

export default function RootLayout({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("cde_role") as Role;
    if (saved && ROLE_PERMISSIONS[saved]) setRoleState(saved);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (r) localStorage.setItem("cde_role", r);
    else localStorage.removeItem("cde_role");
  };

  const hasPermission = (p: string) => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(p) ?? false;
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "projects.read" },
    { href: "/projects", label: "Projects", icon: FolderOpen, perm: "projects.read" },
    { href: "/benchmarks", label: "Benchmarks", icon: Database, perm: "benchmarks.read" },
    { href: "/dataroom", label: "Data Room", icon: Vault, perm: "dataroom.read" },
  ];

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <title>AfCEN CDE</title>
        <meta name="description" content="AfCEN Common Data Environment" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full bg-[#08090d] text-[#c8d0dc] terminal-grid">
        <RoleContext value={{ role, setRole, hasPermission }}>
          {!role ? (
            <main className="min-h-screen">{children}</main>
          ) : (
            <>
              <nav className="glass-elevated sticky top-0 z-50">
                <div className="mx-auto max-w-[1600px] flex items-center justify-between px-5 h-12">
                  <div className="flex items-center gap-5">
                    <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#ff8c00]/10 border border-[#ff8c00]/15">
                        <FileCheck className="h-3.5 w-3.5 text-[#ff8c00]" />
                      </div>
                      <span className="text-[13px] font-semibold tracking-tight text-[#ff8c00]">
                        AfCEN
                      </span>
                    </Link>
                    <div className="h-5 w-px bg-white/8" />
                    <div className="flex items-center gap-1 text-[11px]">
                      {navItems.filter(n => hasPermission(n.perm)).map((item) => {
                        const Icon = item.icon;
                        const active = pathname?.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                              active
                                ? "text-[#ff8c00] bg-[#ff8c00]/8"
                                : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.03]"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-[#94a3b8] hover:bg-white/[0.03] transition-all"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>{ROLE_LABELS[role] || role}</span>
                      <ChevronDown className="h-3 w-3 text-[#475569]" />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-56 glass-elevated rounded-xl overflow-hidden z-50 p-1">
                          {Object.entries(ROLE_LABELS).map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => { setRole(key as Role); setMenuOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all ${
                                role === key ? "text-[#ff8c00] bg-[#ff8c00]/8" : "text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                          <div className="border-t border-white/6 mt-1 pt-1">
                            <button
                              onClick={() => { setRole(null); setMenuOpen(false); }}
                              className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-all flex items-center gap-2"
                            >
                              <LogOut className="h-3 w-3" /> Sign Out
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </nav>
              <main className="min-h-[calc(100vh-3rem)]">{children}</main>
            </>
          )}
        </RoleContext>
      </body>
    </html>
  );
}
