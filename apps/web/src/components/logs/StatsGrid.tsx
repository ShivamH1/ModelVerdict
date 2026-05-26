"use client";

import { cn } from "@/lib/utils";

interface StatsGridProps {
  totalCalls: number;
  triggeredAlarms: number;
  avgLatency: number;
  totalCost: number;
}

export function StatsGrid({ totalCalls, triggeredAlarms, avgLatency, totalCost }: StatsGridProps) {
  const stats = [
    { label: "Total Logs", value: `${totalCalls} calls` },
    { label: "Active Triggers", value: `${triggeredAlarms} alerts`, color: triggeredAlarms > 0 ? "text-amber-500" : "text-emerald-400" },
    { label: "Avg Latency", value: `${avgLatency} ms` },
    { label: "Estimated Cost", value: `$${totalCost.toFixed(6)}`, color: "text-emerald-400" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-[#121212]/40 border border-neutral-900 rounded-xl p-4 text-left font-mono">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">{stat.label}</span>
          <span className={cn("text-lg font-bold text-neutral-100", stat.color)}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
