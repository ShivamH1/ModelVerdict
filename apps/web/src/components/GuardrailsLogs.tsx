"use client";

import React, { useState, useEffect } from "react";
import { Shield, Search, RefreshCw, FileJson } from "lucide-react";
import { InferenceLog } from "@/types";
import { cn } from "@/lib/utils";
import { StatsGrid } from "./logs/StatsGrid";
import { LogTable } from "./logs/LogTable";

export default function GuardrailsLogs() {
  const [logs, setLogs] = useState<InferenceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTriggered, setFilterTriggered] = useState<"all" | "triggered" | "clean">("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Failed logs fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.prompt.toLowerCase().includes(search.toLowerCase()) ||
                          log.response.toLowerCase().includes(search.toLowerCase()) ||
                          log.modelName.toLowerCase().includes(search.toLowerCase());
    if (filterTriggered === "triggered") return matchesSearch && log.guardrailTriggered;
    if (filterTriggered === "clean") return matchesSearch && !log.guardrailTriggered;
    return matchesSearch;
  });

  const totalCalls = logs.length;
  const triggeredAlarms = logs.filter(l => l.guardrailTriggered).length;
  const totalCost = logs.reduce((sum, l) => sum + (l.estimatedCostUsd || 0), 0);
  const avgLatency = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / logs.length) : 0;

  const exportLogsAsJson = () => {
    const rawStr = JSON.stringify(logs, null, 2);
    const url = URL.createObjectURL(new Blob([rawStr], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_log_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-left bg-[#0a0a0a] text-[#e0e0e0]">
      <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2 font-serif italic"><Shield className="w-5 h-5 text-neutral-400" />Security Guardrails & Inference Auditing</h2>
          <p className="text-xs text-neutral-400 max-w-xl">Inspect pre-LLM regex filters and post-LLM output decodes.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-[#0a0a0a] px-3.5 py-1.5 rounded-xl border border-neutral-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xs font-extrabold text-neutral-300 uppercase font-mono">Logger: ONLINE</span>
          </div>
          <button onClick={exportLogsAsJson} disabled={logs.length === 0} className="bg-[#0a0a0a]/80 hover:bg-[#121212]/80 text-neutral-200 border border-neutral-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow disabled:opacity-40"><FileJson className="w-4 h-4 text-neutral-500" />Export Audit</button>
          <button onClick={fetchLogs} disabled={loading} className="bg-neutral-100 hover:bg-white text-neutral-950 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow disabled:opacity-40"><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />Sync Logs</button>
        </div>
      </div>

      <StatsGrid totalCalls={totalCalls} triggeredAlarms={triggeredAlarms} avgLatency={avgLatency} totalCost={totalCost} />

      <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-600 absolute left-3.5 top-3" />
          <input type="text" className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl py-2 px-10 text-xs text-neutral-300 placeholder-neutral-700 focus:outline-none" placeholder="Search prompts or models..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          {["all", "triggered", "clean"].map((f) => (
            <button key={f} onClick={() => setFilterTriggered(f as any)} className={cn("px-3 py-1.5 rounded-lg text-2xs transition-all cursor-pointer capitalize", filterTriggered === f ? "bg-neutral-100 font-bold text-neutral-950 shadow-lg" : "bg-[#0a0a0a] hover:bg-neutral-800 text-neutral-300")}>
              {f === "all" ? "All logs" : f === "triggered" ? "Alarms" : "Normal"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#121212] border border-neutral-900 rounded-2xl shadow-xl overflow-hidden">
        <LogTable logs={filteredLogs} />
      </div>
    </div>
  );
}
