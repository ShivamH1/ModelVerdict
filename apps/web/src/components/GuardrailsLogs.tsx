"use client";

import React, { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, Search, RefreshCw, Clock, Terminal, HardDrive, FileJson, AlertCircle, Bot } from "lucide-react";
import { InferenceLog } from "@/types";
import { cn } from "@/lib/utils";

export default function GuardrailsLogs() {
  const [logs, setLogs] = useState<InferenceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTriggered, setFilterTriggered] = useState<"all" | "triggered" | "clean">("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load observability logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter conditions
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.prompt.toLowerCase().includes(search.toLowerCase()) ||
                          log.response.toLowerCase().includes(search.toLowerCase()) ||
                          log.modelName.toLowerCase().includes(search.toLowerCase());
    
    if (filterTriggered === "triggered") {
      return matchesSearch && log.guardrailTriggered;
    } else if (filterTriggered === "clean") {
      return matchesSearch && !log.guardrailTriggered;
    }
    return matchesSearch;
  });

  // Calculate cumulative stats
  const totalCalls = logs.length;
  const triggeredAlarms = logs.filter(l => l.guardrailTriggered).length;
  const totalCost = logs.reduce((sum, l) => sum + (l.estimatedCostUsd || 0), 0);
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / logs.length)
    : 0;

  const exportLogsAsJson = () => {
    const rawStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([rawStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_log_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-left bg-[#0a0a0a] text-[#e0e0e0]">
      
      {/* Informative Stats Header Panel */}
      <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2 font-serif italic">
            <Shield className="w-5 h-5 text-neutral-400" />
            Security Guardrails & Inference Auditing
          </h2>
          <p className="text-xs text-neutral-400 max-w-xl">
            Inspect pre-LLM regex filters and post-LLM output decodes. Track cost and safety metrics.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-[#0a0a0a] px-3.5 py-1.5 rounded-xl border border-neutral-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xs font-extrabold text-neutral-300 uppercase tracking-widest font-mono">Logger: ONLINE</span>
          </div>

          <button
            onClick={exportLogsAsJson}
            disabled={logs.length === 0}
            className="bg-[#0a0a0a]/80 hover:bg-[#121212]/80 text-neutral-200 border border-neutral-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-40"
          >
            <FileJson className="w-4 h-4 text-neutral-500" />
            Export Audit
          </button>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="bg-neutral-100 hover:bg-white text-neutral-950 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Sync Logs
          </button>
        </div>
      </div>

      {/* Aggregate metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Logs", value: `${totalCalls} calls` },
          { label: "Active Triggers", value: `${triggeredAlarms} alerts`, color: triggeredAlarms > 0 ? "text-amber-500" : "text-emerald-400" },
          { label: "Avg Latency", value: `${avgLatency} ms` },
          { label: "Estimated Cost", value: `$${totalCost.toFixed(6)}`, color: "text-emerald-400" }
        ].map((stat, i) => (
          <div key={i} className="bg-[#121212]/40 border border-neutral-900 rounded-xl p-4 text-left font-mono">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">{stat.label}</span>
            <span className={cn("text-lg font-bold text-neutral-100", stat.color)}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Search and category filters */}
      <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-600 absolute left-3.5 top-3" />
          <input
            type="text"
            className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl py-2 px-10 text-xs text-neutral-300 placeholder-neutral-700 focus:outline-none focus:border-neutral-700"
            placeholder="Search matching prompts or models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto font-mono">
          {["all", "triggered", "clean"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterTriggered(f as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-2xs transition-all cursor-pointer capitalize",
                filterTriggered === f 
                  ? "bg-neutral-100 font-bold text-neutral-950 shadow-lg" 
                  : "bg-[#0a0a0a] hover:bg-neutral-800 text-neutral-300"
              )}
            >
              {f === "all" ? "All logs" : f === "triggered" ? "Alarms" : "Normal"}
            </button>
          ))}
        </div>
      </div>

      {/* Structured data list */}
      <div className="bg-[#121212] border border-neutral-900 rounded-2xl shadow-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-neutral-500 text-center gap-3">
            <Terminal className="w-10 h-10 text-neutral-800 animate-pulse" />
            <p className="text-neutral-500 text-xs max-w-xs font-mono">
              No matching log records registered in active memory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-neutral-900 text-neutral-500 text-left font-bold select-none">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Model Name</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Tokens</th>
                  <th className="py-3 px-4">Cost (USD)</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={cn(
                          "hover:bg-neutral-800/40 transition-all cursor-pointer",
                          log.guardrailTriggered && "bg-amber-950/5 border-l-2 border-l-amber-500"
                        )}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <td className="py-3.5 px-4 font-bold">
                          {log.guardrailTriggered ? (
                            <span className="text-amber-500 flex items-center gap-1">
                              <ShieldAlert className="w-4 h-4" />
                              TRIGGERED
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-4 h-4" />
                              PASS
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-neutral-200 font-semibold truncate max-w-[160px]">
                          {log.modelName}
                        </td>

                        <td className="py-3.5 px-4 text-neutral-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-600" />
                            {log.latencyMs} ms
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-neutral-300">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5 text-neutral-600" />
                            {log.inputTokens + log.outputTokens} t
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono">
                          ${(log.estimatedCostUsd || 0).toFixed(6)}
                        </td>

                        <td className="py-3.5 px-4 text-neutral-500 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-neutral-500 hover:text-white">
                          {isExpanded ? "Hide" : "Inspect"}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-4 bg-[#0a0a0a] border-t border-neutral-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
                              
                              <div className="space-y-1 bg-[#121212] p-3.5 rounded-lg border border-neutral-800 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-neutral-500 flex items-center gap-1">
                                  <Terminal className="w-3.5 h-3.5 text-neutral-600" />
                                  Prompt Payload
                                </span>
                                <p className="text-xs text-neutral-300 whitespace-pre-wrap mt-2 select-all font-mono leading-relaxed max-h-60 overflow-y-auto">
                                  {log.prompt}
                                </p>
                              </div>

                              <div className="space-y-1 bg-[#121212] p-3.5 rounded-lg border border-neutral-800 animate-in fade-in slide-in-from-right-2 duration-300">
                                <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-neutral-500 flex items-center gap-1">
                                  <Bot className="w-3.5 h-3.5 text-neutral-600 animate-pulse" />
                                  Synthesized Output
                                </span>
                                <p className="text-xs text-neutral-300 whitespace-pre-wrap mt-2 select-all font-mono leading-relaxed max-h-60 overflow-y-auto">
                                  {log.response}
                                </p>
                              </div>

                              {log.guardrailTriggered && log.guardrailReason && (
                                <div className="col-span-1 md:col-span-2 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3.5 flex items-start gap-2.5 animate-in zoom-in-95 duration-300">
                                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <strong className="text-xs text-amber-200 block font-bold leading-none">Guardrail Rule Violation Summary</strong>
                                    <p className="text-xs text-amber-500 font-mono mt-1 font-semibold">{log.guardrailReason}</p>
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
