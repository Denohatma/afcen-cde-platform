"use client";

import { useState } from "react";
import { Settings, Bell, Shield, Palette, Globe, Save } from "lucide-react";
import { useRole } from "@/components/client-shell";

export default function SettingsPage() {
  const { role } = useRole();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[800px] px-5 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--surface-text-strong)] tracking-tight">
          Settings
        </h1>
        <p className="text-[10px] text-[var(--surface-text-muted)] mt-0.5 uppercase tracking-[0.15em]">
          Platform preferences & configuration
        </p>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-[#ff8c00]" />
            <h2 className="text-[12px] font-medium text-[var(--surface-text-strong)]">Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[12px] text-[var(--surface-text)]">Current Role</p>
                <p className="text-[10px] text-[var(--surface-text-faint)]">Your access level on the platform</p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-lg bg-[#ff8c00]/8 text-[#ff8c00] border border-[#ff8c00]/12 mono">
                {role || "None"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-[var(--surface-border)]">
              <div>
                <p className="text-[12px] text-[var(--surface-text)]">Session</p>
                <p className="text-[10px] text-[var(--surface-text-faint)]">Role is stored in browser localStorage</p>
              </div>
              <span className="text-[10px] text-[#22c55e]">Active</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-[#38bdf8]" />
            <h2 className="text-[12px] font-medium text-[var(--surface-text-strong)]">Notifications</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[12px] text-[var(--surface-text)]">Platform Notifications</p>
                <p className="text-[10px] text-[var(--surface-text-faint)]">Receive alerts for flags, reviews, and SLA deadlines</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-10 h-5 rounded-full transition-all ${notifications ? "bg-[#22c55e]" : "bg-[var(--surface-border)]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${notifications ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-[var(--surface-border)]">
              <div>
                <p className="text-[12px] text-[var(--surface-text)]">Email Alerts</p>
                <p className="text-[10px] text-[var(--surface-text-faint)]">Send SLA reminders and flag notifications via email</p>
              </div>
              <button
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`w-10 h-5 rounded-full transition-all ${emailAlerts ? "bg-[#22c55e]" : "bg-[var(--surface-border)]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${emailAlerts ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="text-[12px] font-medium text-[var(--surface-text-strong)]">Appearance</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-[12px] text-[var(--surface-text)]">Theme</p>
              <p className="text-[10px] text-[var(--surface-text-faint)]">Toggle between dark and light mode using the sidebar button</p>
            </div>
            <span className="text-[10px] text-[var(--surface-text-muted)] mono">System / Manual</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-[#22c55e]" />
            <h2 className="text-[12px] font-medium text-[var(--surface-text-strong)]">Platform</h2>
          </div>
          <div className="space-y-2 text-[11px]">
            {[
              ["API Endpoint", "http://localhost:8001"],
              ["Database", "PostgreSQL 5434"],
              ["Version", "1.0.0-beta"],
              ["Environment", "Development"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1">
                <span className="text-[var(--surface-text-muted)]">{label}</span>
                <span className="text-[var(--surface-text)] mono">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff8c00]/15 text-[#ff8c00] text-[12px] hover:bg-[#ff8c00]/25 transition-all border border-[#ff8c00]/20"
        >
          <Save className="h-3.5 w-3.5" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
