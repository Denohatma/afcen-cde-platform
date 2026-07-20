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
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  ShieldCheck,
  Handshake,
  Settings,
  ClipboardCheck,
} from "lucide-react";
import Chatbot from "./chatbot";

type Role = "developer" | "consultant" | "afcen_lead" | "investor" | null;

interface RoleContextType {
  role: Role;
  setRole: (r: Role) => void;
  hasPermission: (p: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  developer: ["projects.read", "projects.create", "deliverables.read", "deliverables.upload", "versions.read", "flags.read", "dataroom.read", "dealroom.read", "reviews.read", "settings.read"],
  consultant: ["projects.read", "deliverables.read", "deliverables.upload", "deliverables.transition", "versions.read", "flags.read", "flags.respond", "extractions.read", "dealroom.read", "reviews.read", "settings.read"],
  afcen_lead: ["projects.read", "projects.create", "deliverables.read", "deliverables.upload", "deliverables.transition", "deliverables.publish", "versions.read", "flags.read", "flags.resolve", "extractions.read", "extractions.confirm", "benchmarks.read", "benchmarks.manage", "dataroom.read", "dataroom.manage", "intelligence.read", "export.read", "audit.read", "admin.read", "dealroom.read", "reviews.read", "settings.read"],
  investor: ["projects.read", "deliverables.read", "dataroom.read", "intelligence.read", "dealroom.read", "reviews.read", "settings.read"],
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

export default function ClientShell({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("cde_role") as Role;
    if (saved && ROLE_PERMISSIONS[saved]) setRoleState(saved);
    const savedTheme = localStorage.getItem("cde_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
    const savedCollapsed = localStorage.getItem("cde_sidebar_collapsed");
    if (savedCollapsed === "true") setSidebarCollapsed(true);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("cde_theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("cde_sidebar_collapsed", String(next));
  };

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
    { href: "/reminders", label: "Reminders", icon: Bell, perm: "projects.read" },
    { href: "/reviews", label: "Reviews", icon: ClipboardCheck, perm: "reviews.read" },
    { href: "/admin", label: "Admin", icon: ShieldCheck, perm: "admin.read" },
    { href: "/dealroom", label: "Deal Room", icon: Handshake, perm: "dealroom.read" },
    { href: "/settings", label: "Settings", icon: Settings, perm: "settings.read" },
  ];

  if (!mounted) return <main className="min-h-screen">{children}</main>;

  return (
    <RoleContext.Provider value={{ role, setRole, hasPermission }}>
      {!role ? (
        <main className="min-h-screen">{children}</main>
      ) : (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`glass-elevated flex flex-col border-r border-[var(--surface-border)] z-50 transition-all duration-200 shrink-0 ${
              sidebarCollapsed ? "w-[60px]" : "w-[220px]"
            }`}
          >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-[var(--surface-border)]">
              <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#ff8c00]/10 border border-[#ff8c00]/15 shrink-0">
                  <FileCheck className="h-4 w-4 text-[#ff8c00]" />
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[14px] font-semibold tracking-tight text-[#ff8c00]">
                    AfCEN
                  </span>
                )}
              </Link>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {navItems.filter(n => hasPermission(n.perm)).map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[12px] ${
                      active
                        ? "text-[#ff8c00] bg-[#ff8c00]/8 border border-[#ff8c00]/12"
                        : "text-[var(--surface-text-muted)] hover:text-[var(--surface-text-strong)] hover:bg-[var(--surface-hover)] border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom controls */}
            <div className="shrink-0 border-t border-[var(--surface-border)] p-2 space-y-1">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[12px] text-[var(--surface-text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)] transition-all"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                {!sidebarCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
              </button>

              {/* Collapse toggle */}
              <button
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[12px] text-[var(--surface-text-muted)] hover:text-[var(--surface-text-strong)] hover:bg-[var(--surface-hover)] transition-all"
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
                {!sidebarCollapsed && <span>Collapse</span>}
              </button>

              {/* Role / User */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[12px] text-[var(--surface-text-muted)] hover:bg-[var(--surface-hover)] transition-all"
                >
                  <User className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{ROLE_LABELS[role] || role}</span>
                      <ChevronDown className="h-3 w-3 text-[var(--surface-text-faint)] shrink-0" />
                    </>
                  )}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className={`absolute ${sidebarCollapsed ? "left-full ml-2" : "left-0"} bottom-full mb-1 w-56 glass-elevated rounded-xl overflow-hidden z-50 p-1`}>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setRole(key as Role); setMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all ${
                            role === key ? "text-[var(--primary)] bg-[var(--primary)]/8" : "text-[var(--surface-text-muted)] hover:text-[var(--surface-text-strong)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <div className="border-t border-[var(--surface-border)] mt-1 pt-1">
                        <button
                          onClick={() => { setRole(null); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-[var(--surface-text-muted)] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-all flex items-center gap-2"
                        >
                          <LogOut className="h-3 w-3" /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

          <Chatbot />
        </div>
      )}
    </RoleContext.Provider>
  );
}
