"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

interface BenchmarkEntry {
  id: string;
  metric: string;
  asset: { voltage_kv_min?: number; voltage_kv_max?: number; circuits?: string; technology?: string };
  value: { low: number; high: number; unit: string; n: number; central: number };
  basis: { price_year?: number; currency?: string; scope?: string; market?: string; kind?: string };
  geography: { region?: string; countries?: string[] };
  source_id: string;
  confidence: string;
  notes?: string;
}

export default function BenchmarksPage() {
  const [entries, setEntries] = useState<BenchmarkEntry[]>([]);
  const [validation, setValidation] = useState<{ status: string; benchmarks: number; sources: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.benchmarks.list(),
      api.benchmarks.validate(),
    ])
      .then(([list, val]) => {
        setEntries(list as unknown as BenchmarkEntry[]);
        setValidation(val as { status: string; benchmarks: number; sources: number });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Benchmark Library
          </h1>
          <p className="text-[10px] text-[#64748b] mt-0.5 uppercase tracking-[0.15em]">
            Transmission line cost benchmarks from tiered sources
          </p>
        </div>
        {validation && (
          <div className="flex items-center gap-2">
            {validation.status === "ok" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-[#fbbf24]" />
            )}
            <span className="text-[10px] text-[#64748b]">
              {validation.benchmarks} entries &middot; {validation.sources} sources
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#64748b] text-xs">
          Loading library...
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/6 text-[#ff8c00]">
                  <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Metric</th>
                  <th className="text-right px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Central</th>
                  <th className="text-right px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Range</th>
                  <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Unit</th>
                  <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Source</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">kV</th>
                  <th className="text-left px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Circuits</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Year</th>
                  <th className="text-center px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/[0.03] hover:bg-[#ff8c00]/[0.03] transition-colors"
                  >
                    <td className="px-3 py-2 text-[#c8d0dc]">{e.metric?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-right text-[#ff8c00] tabular-nums">
                      {e.value?.central?.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#64748b] tabular-nums">
                      {e.value?.low === e.value?.high ? "—" : `${e.value?.low?.toFixed(3)}–${e.value?.high?.toFixed(3)}`}
                    </td>
                    <td className="px-3 py-2 text-[#64748b]">{e.value?.unit?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-[#64748b]">{e.source_id}</td>
                    <td className="px-3 py-2 text-center text-[#64748b]">
                      {e.asset?.voltage_kv_min ? `${e.asset.voltage_kv_min}–${e.asset.voltage_kv_max}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-[#64748b]">
                      {e.asset?.circuits || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-[#64748b]">
                      {e.basis?.price_year || "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded mono ${
                        e.confidence === "high" ? "text-[#22c55e] bg-[#22c55e]/8" :
                        e.confidence === "medium" ? "text-[#fbbf24] bg-[#fbbf24]/8" :
                        "text-[#64748b] bg-white/5"
                      }`}>{e.confidence}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
