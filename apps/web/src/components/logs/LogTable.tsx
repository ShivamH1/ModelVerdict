"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Clock, HardDrive, Terminal, Bot, AlertCircle } from "lucide-react";
import { InferenceLog } from "@/types";
import { cn } from "@/lib/utils";

interface LogTableProps {
  logs: InferenceLog[];
}

export function LogTable({ logs }: LogTableProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-neutral-500 text-center gap-3">
        <Terminal className="w-10 h-10 text-neutral-800 animate-pulse" />
        <p className="text-neutral-500 text-xs max-w-xs font-mono">
          No matching log records registered in active memory.
        </p>
      </div>
    );
  }

  return (
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
          {logs.map(log => {
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
                  <td className="py-3.5 px-4 text-neutral-200 font-semibold truncate max-w-[160px]">{log.modelName}</td>
                  <td className="py-3.5 px-4 text-neutral-300">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-neutral-600" />{log.latencyMs} ms</span>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-300">
                    <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-neutral-600" />{log.inputTokens + log.outputTokens} t</span>
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono">${(log.estimatedCostUsd || 0).toFixed(6)}</td>
                  <td className="py-3.5 px-4 text-neutral-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3.5 px-4 font-bold text-neutral-500 hover:text-white">{isExpanded ? "Hide" : "Inspect"}</td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="p-4 bg-[#0a0a0a] border-t border-neutral-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
                        <div className="space-y-1 bg-[#121212] p-3.5 rounded-lg border border-neutral-800 animate-in fade-in slide-in-from-left-2 duration-300">
                          <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-neutral-500 flex items-center gap-1"><Terminal className="w-3.5 h-3.5 text-neutral-600" />Prompt Payload</span>
                          <p className="text-xs text-neutral-300 whitespace-pre-wrap mt-2 select-all font-mono leading-relaxed max-h-60 overflow-y-auto">{log.prompt}</p>
                        </div>
                        <div className="space-y-1 bg-[#121212] p-3.5 rounded-lg border border-neutral-800 animate-in fade-in slide-in-from-right-2 duration-300">
                          <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-neutral-500 flex items-center gap-1"><Bot className="w-3.5 h-3.5 text-neutral-600 animate-pulse" />Synthesized Output</span>
                          <p className="text-xs text-neutral-300 whitespace-pre-wrap mt-2 select-all font-mono leading-relaxed max-h-60 overflow-y-auto">{log.response}</p>
                        </div>
                        {log.guardrailTriggered && log.guardrailReason && (
                          <div className="col-span-1 md:col-span-2 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3.5 flex items-start gap-2.5 animate-in zoom-in-95 duration-300">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <strong className="text-xs text-amber-200 block font-bold leading-none">Guardrail Rule Violation</strong>
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
  );
}
