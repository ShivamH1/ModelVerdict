"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Terminal,
  HardDrive,
  FileJson,
  AlertCircle,
  Bot,
} from "lucide-react";
import { InferenceLog } from "@veritas/shared";
import { cn } from "@/lib/utils";

export default function GuardrailsLogs() {
  const [logs, setLogs] = useState<InferenceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTriggered, setFilterTriggered] = useState<
    "all" | "triggered" | "clean"
  >("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch (err) {
      console.error("Failed to load observability logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchLogs());
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.prompt.toLowerCase().includes(search.toLowerCase()) ||
      log.response.toLowerCase().includes(search.toLowerCase()) ||
      log.modelName.toLowerCase().includes(search.toLowerCase());
    if (filterTriggered === "triggered")
      return matchesSearch && log.guardrailTriggered;
    if (filterTriggered === "clean")
      return matchesSearch && !log.guardrailTriggered;
    return matchesSearch;
  });

  const totalCalls = logs.length;
  const triggeredAlarms = logs.filter((l) => l.guardrailTriggered).length;
  const totalCost = logs.reduce((sum, l) => sum + (l.estimatedCostUsd || 0), 0);
  const avgLatency =
    logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / logs.length)
      : 0;

  const exportLogsAsJson = () => {
    const rawStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([rawStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guardrail_audit_log_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-left bg-neutral-950 text-[#e0e0e0]">
      {/* Header Panel */}
      <div className="bg-neutral-900 border border-neutral-900 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2 font-serif italic">
            <Shield className="w-5 h-5 text-neutral-400" />
            Security Guardrails & Inference Auditing
          </h2>
          <p className="text-xs text-neutral-400 max-w-xl">
            Live inspect pre-LLM regex filters and post-LLM output decodes.
            Track execution cost, prompt context safety, refusal quality, and
            downstream rate limits.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-neutral-950 px-3.5 py-1.5 rounded-xl border border-neutral-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xs font-extrabold text-neutral-300 uppercase tracking-widest font-mono">
              Logger: ONLINE
            </span>
          </div>
          <button
            onClick={exportLogsAsJson}
            disabled={logs.length === 0}
            className="bg-neutral-950/80 hover:bg-neutral-900/80 text-neutral-200 border border-neutral-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow disabled:opacity-40 cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-neutral-500" />
            Export Audit JSON
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="bg-neutral-100 hover:bg-white text-neutral-950 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", loading && "animate-spin")}
            />
            Sync Logs
          </button>
        </div>
      </div>

      {/* Aggregate Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 text-left font-mono">
          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block mb-1">
            Total Logs Evaluated
          </span>
          <span className="text-lg font-bold text-neutral-100">
            {totalCalls} calls
          </span>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 text-left font-mono">
          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block mb-1">
            Active Guardrail Triggers
          </span>
          <span
            className={cn(
              "text-lg font-bold",
              triggeredAlarms > 0 ? "text-amber-500" : "text-emerald-400",
            )}
          >
            {triggeredAlarms} alerts
          </span>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 text-left font-mono">
          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block mb-1">
            Avg Latency Speed
          </span>
          <span className="text-lg font-bold text-neutral-100">
            {avgLatency} ms
          </span>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 text-left font-mono">
          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block mb-1">
            Estimated Operating Costs
          </span>
          <span className="text-lg font-bold text-emerald-400">
            ${totalCost.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-neutral-900 border border-neutral-900 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-600 absolute left-3.5 top-3" />
          <input
            type="text"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-10 text-xs text-neutral-300 placeholder-neutral-700 focus:outline-none"
            placeholder="Search matching prompts, model names, or status overrides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          <button
            onClick={() => setFilterTriggered("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-2xs transition-all cursor-pointer",
              filterTriggered === "all"
                ? "bg-neutral-100 font-bold text-neutral-950 shadow-lg"
                : "bg-neutral-950 hover:bg-neutral-800 text-neutral-300",
            )}
          >
            All logs
          </button>
          <button
            onClick={() => setFilterTriggered("triggered")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-2xs transition-all flex items-center gap-1 cursor-pointer",
              filterTriggered === "triggered"
                ? "bg-amber-600 font-bold text-white shadow-lg"
                : "bg-neutral-950 hover:bg-neutral-800 text-neutral-300",
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Guardrail Alarms
          </button>
          <button
            onClick={() => setFilterTriggered("clean")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-2xs transition-all flex items-center gap-1 cursor-pointer",
              filterTriggered === "clean"
                ? "bg-emerald-600 font-bold text-white shadow-lg"
                : "bg-neutral-950 hover:bg-neutral-800 text-neutral-300",
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Normal Pass
          </button>
        </div>
      </div>

      {/* Log Table with Expandable Rows */}
      <div className="bg-neutral-900 border border-neutral-900 rounded-2xl shadow-xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-neutral-500 text-center gap-3">
            <Terminal className="w-10 h-10 text-neutral-700 animate-pulse" />
            <p className="text-neutral-400 text-xs max-w-xs font-mono">
              No matching log records were registered in active database memory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-neutral-950 border-b border-neutral-900 text-neutral-400 text-left font-bold select-none">
                  <th className="py-3 px-4">Alarm Status</th>
                  <th className="py-3 px-4">Model Name</th>
                  <th className="py-3 px-4">Response Latency</th>
                  <th className="py-3 px-4">Token Usage</th>
                  <th className="py-3 px-4">Cost (USD)</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 shrink-0">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={cn(
                          "hover:bg-neutral-900/40 transition-all cursor-pointer",
                          log.guardrailTriggered &&
                            "bg-amber-950/10 border-l-2 border-l-amber-500",
                        )}
                        onClick={() =>
                          setExpandedLogId(isExpanded ? null : log.id)
                        }
                      >
                        <td className="py-3.5 px-4 font-bold">
                          {log.guardrailTriggered ? (
                            <span className="text-amber-500 flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="w-4 h-4 shrink-0" />{" "}
                              TRIGGERED
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-4 h-4 shrink-0" /> PASS
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-200 font-semibold truncate max-w-40">
                          {log.modelName}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />{" "}
                            {log.latencyMs} ms
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5 text-neutral-500" />{" "}
                            {log.inputTokens + log.outputTokens} t
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">
                          ${(log.estimatedCostUsd || 0).toFixed(6)}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500 text-[9px] font-medium">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-neutral-400 hover:text-white shrink-0">
                          {isExpanded ? "Collapse" : "Inspect"}
                        </td>
                      </tr>

                      {/* Expandable inspector row */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-4 bg-neutral-950 border-t border-neutral-900"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
                              <div className="space-y-1 bg-neutral-900 p-3.5 rounded-lg border border-neutral-900">
                                <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-neutral-400 flex items-center gap-1">
                                  <Terminal className="w-3.5 h-3.5 text-neutral-400" />{" "}
                                  Prompt Payload Preview
                                </span>
                                <p className="text-xs text-neutral-300 whitespace-pre-wrap mt-2 select-all font-mono leading-relaxed max-h-60 overflow-y-auto">
                                  {log.prompt}
                                </p>
                              </div>
                              <div className="space-y-1 bg-neutral-900 p-3.5 rounded-lg border border-neutral-900">
                                <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-neutral-400 flex items-center gap-1">
                                  <Bot className="w-3.5 h-3.5 text-neutral-500 animate-pulse" />{" "}
                                  Synthesized Output Payload
                                </span>
                                <p className="text-xs text-neutral-300 whitespace-pre-wrap mt-2 select-all font-mono leading-relaxed max-h-60 overflow-y-auto">
                                  {log.response}
                                </p>
                              </div>
                              {log.guardrailTriggered &&
                                log.guardrailReason && (
                                  <div className="col-span-1 md:col-span-2 bg-amber-950/10 border border-amber-900/30 rounded-lg p-3.5 flex items-start gap-2.5">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      <strong className="text-xs text-amber-200 block font-bold leading-none">
                                        Guardrail Rule Violation Summary
                                      </strong>
                                      <p className="text-xs text-amber-500 font-mono mt-1 font-semibold">
                                        {log.guardrailReason}
                                      </p>
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
