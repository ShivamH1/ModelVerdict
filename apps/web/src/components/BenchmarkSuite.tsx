"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, BarChart3, FileDown, Search, ChevronDown, 
  Info, Clock, HardDrive, Coins, RefreshCw 
} from "lucide-react";
import { EvalRun, EvalSuiteReport } from "@/types";
import { cn } from "@/lib/utils";

export default function BenchmarkSuite() {
  const [runsHistory, setRunsHistory] = useState<EvalRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [report, setReport] = useState<EvalSuiteReport | null>(null);

  // Configuration forms
  const [modelA, setModelA] = useState("qwen-free");
  const [modelB, setModelB] = useState("claude-frontier");
  const [testSize, setTestSize] = useState("10"); // prompt limit

  // Polling / running states
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentPromptId: "",
    status: "idle"
  });

  // Filter keys for Prompt ledger
  const [filterCategory, setFilterCategory] = useState<"all" | "factual" | "adversarial" | "bias">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  // Fetch previous runs list
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/evaluation/history");
      const data = await res.json();
      setRunsHistory(data);
      if (data.length > 0 && !selectedRunId && !isRunning) {
        setSelectedRunId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load study history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch report details when selection shifts
  useEffect(() => {
    if (selectedRunId) {
      fetchReport(selectedRunId);
    }
  }, [selectedRunId]);

  const fetchReport = async (runId: string) => {
    try {
      const res = await fetch(`/api/evaluation/report/${runId}`);
      const data = await res.json();
      if (!data.error) {
        setReport(data);
      }
    } catch (err) {
      console.error("Failed to load report keys:", err);
    }
  };

  // Launch the automated benchmark evaluation suite
  const handleLaunch = async () => {
    setIsRunning(true);
    setProgress({ current: 0, total: parseInt(testSize), currentPromptId: "f001", status: "running" });
    setReport(null);

    try {
      const res = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIdA: modelA,
          modelIdB: modelB,
          testSize: parseInt(testSize)
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setIsRunning(false);
      } else {
        pollStatus(data.runId);
      }
    } catch (err) {
      console.error("Launch command failed:", err);
      // Simulate for development
      setTimeout(() => {
        setIsRunning(false);
        alert("Development Mode: API not detected. Simulation ended.");
      }, 2000);
    }
  };

  // Poll progress state
  const pollStatus = (runId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/evaluation/status");
        const statusData = await res.json();

        if (statusData.status === "complete") {
          clearInterval(interval);
          setIsRunning(false);
          setSelectedRunId(runId);
          await fetchHistory();
          await fetchReport(runId);
        } else if (statusData.status === "failed") {
          clearInterval(interval);
          setIsRunning(false);
          alert("Benchmark process failed.");
        } else if (statusData.status === "running") {
          setProgress({
            current: statusData.currentPromptIndex,
            total: statusData.totalPrompts,
            currentPromptId: statusData.currentPromptId,
            status: "running"
          });
        }
      } catch (err) {
        console.error("Error polling study status:", err);
      }
    }, 1000);
  };

  const triggerPrint = () => {
    window.print();
  };

  const filteredResults = report?.results.filter(r => {
    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    const matchesSearch = r.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.responseA.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.responseB.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-left print:p-0 transition-all duration-300 bg-[#0a0a0a] text-[#e0e0e0]">
      
      {/* Configuration Header Dashboard */}
      <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 shadow-xl print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-neutral-400" />
              LLM Automated Benchmarks & Evaluations
            </h2>
            <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
              Synthesize an autonomous grading run comparing Free OSS model Personas vs Frontier models across 3 core benchmarks.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {runsHistory.length > 0 && (
              <div className="flex items-center bg-[#0a0a0a] p-2 rounded-xl border border-neutral-800 gap-2.5">
                <span className="text-2xs text-neutral-500 uppercase tracking-wider font-bold">Select Run Study</span>
                <select
                  className="bg-[#121212] text-xs text-neutral-200 py-1 px-3 border border-neutral-800 rounded-md focus:outline-none focus:border-neutral-700 font-mono"
                  value={selectedRunId || ""}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  disabled={isRunning}
                >
                  {runsHistory.map(run => (
                    <option key={run.id} value={run.id}>
                      {run.id} • {new Date(run.startedAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Configurations selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-neutral-900/80 bg-[#0a0a0a]/40 p-4 rounded-xl border border-neutral-900">
          <div className="space-y-1.5 text-left">
            <label className="text-2xs font-bold text-neutral-500 uppercase tracking-wider">Model A (OSS Sim)</label>
            <select
              className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 font-medium"
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              disabled={isRunning}
            >
              <option value="qwen-free">Qwen 2.5 (0.5B)</option>
              <option value="llama-free">Llama 3.2 (3B)</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-2xs font-bold text-neutral-500 uppercase tracking-wider">Model B (Frontier)</label>
            <select
              className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 font-medium"
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              disabled={isRunning}
            >
              <option value="claude-frontier">Claude 3.5 Sonnet</option>
              <option value="gemini-frontier">Gemini 3.5 Flash</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-2xs font-bold text-neutral-500 uppercase tracking-wider">Dataset Size</label>
            <select
              className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 font-medium"
              value={testSize}
              onChange={(e) => setTestSize(e.target.value)}
              disabled={isRunning}
            >
              <option value="5">Fast study (5 prompts)</option>
              <option value="15">Extended audit (15 prompts)</option>
              <option value="35">Full dataset (35 prompts)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleLaunch}
              disabled={isRunning}
              className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-semibold transform hover:-translate-y-px transition-all rounded-lg py-2.5 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Benchmark
            </button>
          </div>
        </div>
      </div>

      {/* Progress polling indicators */}
      {isRunning && (
        <div className="bg-[#121212] border border-neutral-900 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-5 justify-between shadow-xl animate-pulse">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 rounded-full border-4 border-neutral-800 border-t-neutral-100 animate-spin shrink-0" />
            <div>
              <span className="text-sm font-bold text-neutral-100 block">Synthesizing comparative grading run...</span>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                Prompt ID: <strong className="text-neutral-300">{progress.currentPromptId}</strong>
              </p>
            </div>
          </div>

          <div className="w-full md:w-80 text-right space-y-1">
            <div className="flex justify-between text-2xs font-bold text-neutral-500 font-mono uppercase tracking-wider">
              <span>Progress Index</span>
              <span>{Math.round((progress.current / progress.total) * 100)}% ({progress.current}/{progress.total})</span>
            </div>
            <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-100 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* BENCHMARK EVAL STUDY METRICS REPORT */}
      {report && (
        <div className="space-y-6 print:space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          
          {/* Executive Header block */}
          <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl print:border-none print:shadow-none print:bg-white print:p-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase font-extrabold tracking-widest bg-emerald-950/40 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30 print:hidden">
                  Study Completed
                </span>
                <span className="text-2xs text-neutral-500 font-mono uppercase tracking-widest font-semibold print:text-neutral-800">
                  Run ID: {report.run.id}
                </span>
              </div>
              <h1 className="text-xl font-bold text-neutral-100 mt-2 flex items-center gap-2 print:text-black">
                Evaluation Suite Study Scorecard
              </h1>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl print:text-neutral-700">
                A side-by-side audit comparing <strong>{report.metricsA.modelName} (A)</strong> versus <strong>{report.metricsB.modelName} (B)</strong>.
              </p>
            </div>

            <button
              onClick={triggerPrint}
              className="bg-[#0a0a0a] hover:bg-[#121212] text-neutral-200 border border-neutral-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer print:hidden shadow"
            >
              <FileDown className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>

          {/* METRIC SCORECARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
            
            {/* Hallucination index */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between h-40 shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-500 print:text-neutral-600">Hallucination Rate (%)</span>
                </div>
                <h3 className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Likelihood of fabricating factual details (lower is better).
                </h3>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-2xs font-mono font-bold">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsA.modelName}</span>
                  <span className={report.metricsA.hallucinationRate > 25 ? "text-amber-500" : "text-emerald-400"}>{report.metricsA.hallucinationRate}%</span>
                </div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-600 rounded-full" style={{ width: `${report.metricsA.hallucinationRate}%` }} />
                </div>

                <div className="flex justify-between text-2xs font-mono font-bold pt-1">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsB.modelName}</span>
                  <span className={report.metricsB.hallucinationRate > 10 ? "text-amber-500" : "text-emerald-400"}>{report.metricsB.hallucinationRate}%</span>
                </div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-100 rounded-full" style={{ width: `${report.metricsB.hallucinationRate}%` }} />
                </div>
              </div>
            </div>

            {/* Jailbreak Refusal metrics */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between h-40 shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-500 print:text-neutral-600">Refusal Index</span>
                </div>
                <h3 className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Rate of successfully blocking dangerous commands (higher is better).
                </h3>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-2xs font-mono font-bold">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsA.modelName}</span>
                  <span className="text-emerald-400">{report.metricsA.jailbreakRefusalRate}%</span>
                </div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-600 rounded-full" style={{ width: `${report.metricsA.jailbreakRefusalRate}%` }} />
                </div>

                <div className="flex justify-between text-2xs font-mono font-bold pt-1">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsB.modelName}</span>
                  <span className="text-emerald-400">{report.metricsB.jailbreakRefusalRate}%</span>
                </div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-100 rounded-full" style={{ width: `${report.metricsB.jailbreakRefusalRate}%` }} />
                </div>
              </div>
            </div>

            {/* Price Efficiency */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between h-40 shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-500 print:text-neutral-600">Inference Latency</span>
                </div>
                <h3 className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Average duration for complete synthesis (lower is better).
                </h3>
              </div>
              <div className="flex items-center justify-around mt-2 bg-[#0a0a0a] p-3 rounded-xl border border-neutral-800 font-mono">
                <div className="text-center">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">Model A</span>
                  <div className="text-sm font-black text-neutral-400">{report.metricsA.avgLatencyMs}ms</div>
                </div>
                <div className="w-px h-8 bg-neutral-800" />
                <div className="text-center">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">Model B</span>
                  <div className="text-sm font-black text-neutral-100">{report.metricsB.avgLatencyMs}ms</div>
                </div>
              </div>
            </div>

          </div>

          {/* DESIGN STRATEGY SUMMARY CARD */}
          <div className="bg-[#121212]/40 p-5 rounded-2xl border border-neutral-900 space-y-3 print:bg-white print:border-neutral-300 print:text-black">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Info className="w-4 h-4" />
              Strategic Evaluation Insights
            </h3>
            <ul className="text-xs list-disc font-medium text-neutral-400 pl-4 space-y-2 leading-relaxed">
              <li><strong>Accuracy Gap</strong>: OSS models exhibit higher hallucination indexes on math calculation compared to Frontier models.</li>
              <li><strong>Refusal Guarding</strong>: Frontier models represent more articulate system refusals for adversarial prompts.</li>
              <li><strong>Latencies</strong>: Lightweight OSS models achieve significantly quicker inference times.</li>
            </ul>
          </div>

          {/* LEDGER TAB CONTROL PANEL */}
          <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 shadow-xl print:hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-800 pb-4 mb-4">
              <span className="text-sm font-semibold text-neutral-200 font-serif italic">
                Prompt-by-Prompt Judge Ledger
              </span>

              {/* Ledger filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {["all", "factual", "adversarial", "bias"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-2xs transition-all cursor-pointer capitalize",
                      filterCategory === cat 
                        ? "bg-neutral-100 text-neutral-950 font-bold" 
                        : "bg-[#0a0a0a] hover:bg-neutral-800 border border-neutral-800 text-neutral-400"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-neutral-600 absolute left-3 top-3" />
              <input
                type="text"
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-2 px-10 text-xs text-neutral-300 placeholder-neutral-700 focus:outline-none focus:border-neutral-700 rounded-lg"
                placeholder="Search prompt evaluations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* List grid */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredResults.map(res => {
                const isExpanded = selectedLedgerId === res.id;
                return (
                  <div key={res.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden transition-all">
                    <button
                      onClick={() => setSelectedLedgerId(isExpanded ? null : res.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-all cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-widest font-bold font-mono text-neutral-500">{res.category}</span>
                        </div>
                        <p className="text-xs text-neutral-200 line-clamp-1">{res.prompt}</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="text-neutral-500">A:</span>
                          <strong className="text-neutral-200">
                            {res.category === "factual" ? res.scoresA.accuracy : res.category === "adversarial" ? res.scoresA.safety : res.scoresA.bias}/10
                          </strong>
                          <span className="text-neutral-800 mx-1">|</span>
                          <span className="text-neutral-500">B:</span>
                          <strong className="text-neutral-100">
                            {res.category === "factual" ? res.scoresB.accuracy : res.category === "adversarial" ? res.scoresB.safety : res.scoresB.bias}/10
                          </strong>
                        </div>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-600 transition-all", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[#121212] border-t border-neutral-800"
                        >
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-[#0a0a0a] rounded-lg p-3 border border-neutral-800 space-y-2">
                              <span className="text-[9px] font-extrabold uppercase text-neutral-500 block border-b border-neutral-800 pb-1">{report.metricsA.modelName}</span>
                              <p className="text-neutral-300 italic whitespace-pre-wrap">"{res.responseA}"</p>
                            </div>
                            <div className="bg-[#0a0a0a] rounded-lg p-3 border border-neutral-800 space-y-2">
                              <span className="text-[9px] font-extrabold uppercase text-neutral-500 block border-b border-neutral-800 pb-1">{report.metricsB.modelName}</span>
                              <p className="text-neutral-300 italic whitespace-pre-wrap">"{res.responseB}"</p>
                            </div>
                            <div className="col-span-1 md:col-span-2 bg-[#0a0a0a]/50 rounded-lg p-3 border border-neutral-800">
                              <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">Judge Reasoning</span>
                              <p className="text-neutral-300 leading-relaxed">{res.scoresA.reasoning || "No detailed reasoning provided."}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
}
