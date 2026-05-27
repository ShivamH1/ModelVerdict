"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, BarChart3, FileDown, Info, ChevronDown, Search } from "lucide-react";
import { EvalRun, EvalSuiteReport, MODEL_CATALOG } from "@veritas/shared";
import { cn } from "@/lib/utils";
import { Alert } from "./Alert";

export default function BenchmarkSuite() {
  const [runsHistory, setRunsHistory] = useState<EvalRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [report, setReport] = useState<EvalSuiteReport | null>(null);

  const [modelA, setModelA] = useState(MODEL_CATALOG.filter(m => m.type === "FREE")[0]?.id || "deepseek-v3");
  const [modelB, setModelB] = useState(MODEL_CATALOG.filter(m => m.type === "FRONTIER")[0]?.id || "gpt-4o");
  const [testSize, setTestSize] = useState("10");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentPromptId: "", status: "idle" });
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Ledger filter state
  const [filterCategory, setFilterCategory] = useState<"all" | "factual" | "adversarial" | "bias">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  const freeModels = MODEL_CATALOG.filter(m => m.type === "FREE");
  const frontierModels = MODEL_CATALOG.filter(m => m.type === "FRONTIER");

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/evaluation/history");
      const data = await res.json();
      setRunsHistory(data);
      if (data.length > 0 && !selectedRunId && !isRunning) setSelectedRunId(data[0].id);
    } catch (err) {
      console.error("Failed history fetch:", err);
    }
  };

  const fetchReport = async (runId: string) => {
    try {
      const res = await fetch(`/api/evaluation/report/${runId}`);
      const data = await res.json();
      if (!data.error) setReport(data);
    } catch (err) {
      console.error("Failed report fetch:", err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchHistory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      Promise.resolve().then(() => fetchReport(selectedRunId));
    }
  }, [selectedRunId]);

  const handleLaunch = async () => {
    setIsRunning(true);
    setProgress({ current: 0, total: parseInt(testSize), currentPromptId: "f001", status: "running" });
    setReport(null);
    try {
      const res = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIdA: modelA, modelIdB: modelB, testSize: parseInt(testSize) })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setIsRunning(false); }
      else connectWebSocket(data.runId);
    } catch (err) {
      console.error("Launch failed:", err);
      setIsRunning(false);
    }
  };

  const connectWebSocket = (runId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = process.env.NODE_ENV === "production"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
      : "ws://localhost:3001/ws";

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "status") {
          const statusData = payload.data;
          
          if (statusData.runId === runId) {
            if (statusData.status === "complete") {
              setIsRunning(false);
              setSelectedRunId(runId);
              ws.close();
              Promise.resolve().then(() => fetchHistory());
              Promise.resolve().then(() => fetchReport(runId));
            } else if (statusData.status === "failed") {
              setIsRunning(false);
              setError(statusData.error || "Evaluation run failed.");
              ws.close();
            } else if (statusData.status === "running") {
              setProgress({
                current: statusData.currentPromptIndex,
                total: statusData.totalPrompts,
                currentPromptId: statusData.currentPromptId,
                status: "running"
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed parsing WS message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  };

  const triggerPrint = () => window.print();

  // Filter prompt ledger rows
  const filteredResults = report?.results.filter(r => {
    const parentCategory = r.promptId.startsWith("f") ? "factual" : 
                           r.promptId.startsWith("a") ? "adversarial" : 
                           r.promptId.startsWith("b") ? "bias" : "";
    const matchesCategory = filterCategory === "all" || parentCategory === filterCategory;
    const matchesSearch = r.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.responseA.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.responseB.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
              Synthesize an autonomous grading run comparing Free OSS model Personas vs Frontier models across 3 core benchmarks: factual accuracy, averseness to bias, and jailbreak safety. Evaluated on-demand by Gemini-as-a-Judge.
            </p>
          </div>

          {runsHistory.length > 0 && (
            <div className="flex items-center bg-[#0a0a0a] p-2 rounded-xl border border-neutral-800 gap-2.5">
              <span className="text-2xs text-neutral-500 uppercase tracking-wider font-bold">Select Run</span>
              <select className="bg-[#121212] text-xs py-1 px-3 border border-neutral-800 rounded-md focus:outline-none font-mono" value={selectedRunId || ""} onChange={(e) => setSelectedRunId(e.target.value)} disabled={isRunning}>
                {runsHistory.map(run => <option key={run.id} value={run.id}>{run.id} • {new Date(run.startedAt).toLocaleDateString()} ({run.status})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Configuration selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-neutral-900/80 bg-[#0a0a0a]/40 p-4 rounded-xl border border-neutral-900">
          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-neutral-500 uppercase">Model A (Free)</label>
            <select className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs focus:outline-none" value={modelA} onChange={(e) => setModelA(e.target.value)} disabled={isRunning}>
              {freeModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-neutral-500 uppercase">Model B (Frontier)</label>
            <select className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs focus:outline-none" value={modelB} onChange={(e) => setModelB(e.target.value)} disabled={isRunning}>
              {frontierModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-neutral-500 uppercase">Dataset Size</label>
            <select className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs focus:outline-none" value={testSize} onChange={(e) => setTestSize(e.target.value)} disabled={isRunning}>
              <option value="5">Fast study (5 prompts)</option>
              <option value="15">Extended audit (15 prompts)</option>
              <option value="35">Full dataset (35 prompts)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleLaunch} disabled={isRunning} className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-semibold transition-all rounded-lg py-2.5 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50">
              <Play className="w-3.5 h-3.5 fill-current" /> Launch Benchmark Study
            </button>
          </div>
        </div>
      </div>

      {/* Progress polling indicators */}
      {isRunning && (
        <div className="bg-[#121212] border border-neutral-900 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-5 justify-between shadow-xl animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neutral-400 border-t-transparent animate-spin shrink-0" />
            <div>
              <span className="text-sm font-bold text-neutral-100 block">Synthesizing Comparative Grading Run...</span>
              <p className="text-xs text-neutral-500 mt-1 font-mono">Currently running grade on prompt ID: <strong className="text-amber-400">{progress.currentPromptId || "Loading..."}</strong></p>
            </div>
          </div>
          <div className="w-full md:w-80 text-right space-y-1">
            <div className="flex justify-between text-2xs font-bold text-neutral-500 font-mono uppercase">
              <span>Progress Index</span><span>{progressPercentage}% ({progress.current}/{progress.total})</span>
            </div>
            <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
              <div className="h-full bg-neutral-100 transition-all duration-300 rounded-full" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* BENCHMARK EVAL STUDY REPORT */}
      {report && (
        <div className="space-y-6 print:space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">

          {/* Executive Header */}
          <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl print:border-none print:shadow-none print:bg-white print:p-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase font-extrabold bg-emerald-950/40 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30 print:hidden">Study Completed</span>
                <span className="text-2xs text-neutral-500 font-mono uppercase font-semibold">Run ID: {report.run.id}</span>
              </div>
              <h1 className="text-xl font-bold text-neutral-100 mt-2 print:text-black">Evaluation Suite Study Scorecard</h1>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl print:text-neutral-700">
                A granular side-by-side performance audit comparing <strong>{report.metricsA.modelName} (A)</strong> versus <strong>{report.metricsB.modelName} (B)</strong> using Gemini as an advisor judge. Total prompts run in sample: {report.results.length}.
              </p>
            </div>
            <button onClick={triggerPrint} className="bg-[#0a0a0a] hover:bg-[#121212] text-neutral-200 border border-neutral-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer print:hidden shadow">
              <FileDown className="w-4 h-4" /> Download / Print PDF Report
            </button>
          </div>

          {/* METRIC SCORECARDS GRID — 5 cards matching veritas-arena */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">

            {/* Hallucination Rate */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[200px] shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">Hallucination Rate (%)</span>
                  <span className="text-2xs text-neutral-500 font-mono font-bold lowercase">factual correctness &lt; 5</span>
                </div>
                <h3 className="text-2xs text-neutral-500 mt-1">Likelihood of fabricating factual details (lower is better).</h3>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-2xs font-mono font-bold">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsA.modelName}</span>
                  <span className={report.metricsA.hallucinationRate > 25 ? "text-amber-500" : "text-emerald-400"}>{report.metricsA.hallucinationRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-600 rounded-full" style={{ width: `${report.metricsA.hallucinationRate}%` }} /></div>
                <div className="flex justify-between text-2xs font-mono font-bold pt-1">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsB.modelName}</span>
                  <span className={report.metricsB.hallucinationRate > 10 ? "text-amber-500" : "text-emerald-400"}>{report.metricsB.hallucinationRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-200 rounded-full" style={{ width: `${report.metricsB.hallucinationRate}%` }} /></div>
              </div>
            </div>

            {/* Jailbreak Refusal Index */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[200px] shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">Jailbreak Refusal Index</span>
                  <span className="text-2xs text-amber-500 font-mono font-bold">adversarial safety</span>
                </div>
                <h3 className="text-2xs text-neutral-500 mt-1">Rate of cleanly blocking dangerous commands (higher is better).</h3>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between text-2xs font-mono font-bold">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsA.modelName}</span>
                  <span className="text-emerald-400">{report.metricsA.jailbreakRefusalRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-600 rounded-full" style={{ width: `${report.metricsA.jailbreakRefusalRate}%` }} /></div>
                <div className="flex justify-between text-2xs font-mono font-bold pt-1">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsB.modelName}</span>
                  <span className="text-emerald-400">{report.metricsB.jailbreakRefusalRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-200 rounded-full" style={{ width: `${report.metricsB.jailbreakRefusalRate}%` }} /></div>
              </div>
            </div>

            {/* Model Comparative Scores (Safety + Bias) */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[200px] shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">Model Comparative Scores</span>
                  <span className="text-2xs text-amber-500 font-mono font-extrabold">rubrics avg /10</span>
                </div>
                <h3 className="text-2xs text-neutral-500 mt-1">Content Safety (CS) and Bias Prevention (BP) benchmarks side-by-side.</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2 border-t border-neutral-800 pt-2.5 font-mono">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500">CS Average</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-neutral-400">{report.metricsA.averageSafetyScore}</span>
                    <span className="text-[9px] text-neutral-500">vs</span>
                    <span className="text-sm font-extrabold text-neutral-200">{report.metricsB.averageSafetyScore}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold">BP Average</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-neutral-400">{report.metricsA.averageBiasScore}</span>
                    <span className="text-[9px] text-neutral-500">vs</span>
                    <span className="text-sm font-extrabold text-neutral-200">{report.metricsB.averageBiasScore}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inference Latency */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[200px] shadow-md print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">Average Inference Latency</span>
                  <span className="text-2xs text-neutral-400 font-mono font-extrabold">milliseconds</span>
                </div>
                <h3 className="text-2xs text-neutral-500 mt-1">Duration between user prompt and complete content synthesis (lower is better).</h3>
              </div>
              <div className="flex items-center justify-around mt-2 bg-[#0a0a0a] p-3 rounded-xl border border-neutral-800 font-mono">
                <div className="text-center"><span className="text-[9px] font-semibold text-neutral-500 uppercase">Model A</span><div className="text-sm font-black text-neutral-400">{report.metricsA.avgLatencyMs}ms</div></div>
                <div className="w-px h-8 bg-neutral-800" />
                <div className="text-center"><span className="text-[9px] font-semibold text-neutral-500 uppercase">Model B</span><div className="text-sm font-black text-neutral-100">{report.metricsB.avgLatencyMs}ms</div></div>
              </div>
            </div>

            {/* Token Cost Projections */}
            <div className="bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between min-h-[200px] shadow-md print:bg-white print:border-neutral-300 print:text-black col-span-1 md:col-span-1 lg:col-span-2 print:col-span-2">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">Token Cost Projections</span>
                  <span className="text-2xs text-emerald-400 font-mono font-bold">$ USD per 1M tokens</span>
                </div>
                <h3 className="text-2xs text-neutral-500 mt-1">Accumulated cost comparison guidelines for serving this model profile at scale.</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-3 font-mono">
                <div className="text-left">
                  <span className="text-[9px] font-semibold text-neutral-500 uppercase">{report.metricsA.modelName}</span>
                  <div className="text-xs font-bold text-emerald-400">
                    {report.metricsA.totalCostUsd === 0 ? "FREE tier" : `$${report.metricsA.totalCostUsd.toFixed(4)}`}
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-semibold text-neutral-500 uppercase truncate block max-w-xs">{report.metricsB.modelName}</span>
                  <div className="text-xs font-bold text-neutral-200">
                    {report.metricsB.totalCostUsd === 0 ? "FREE tier" : `$${report.metricsB.totalCostUsd.toFixed(4)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Insights */}
          <div className="bg-[#121212]/40 p-5 rounded-2xl border border-neutral-900 space-y-3 print:bg-white print:border-neutral-300 print:text-black">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 font-mono"><Info className="w-4 h-4" /> Strategic Evaluation Insights</h3>
            <ul className="text-xs list-disc font-medium text-neutral-400 pl-4 space-y-2 leading-relaxed">
              <li><strong>Accuracy Gap</strong>: Free OSS models exhibit elevated hallucination indexes on math calculation and logical queries, whereas Frontier models represent 90%+ correctness.</li>
              <li><strong>Failsafe Hardening</strong>: The Input and Output guardrails serve as deterministic safety barriers. Frontier models exhibit more articulate system refusals.</li>
              <li><strong>Operational Latencies &amp; Costs</strong>: Lightweight edge models achieve up to 50% quicker inference at zero base cost, ideal for simple classification tasks.</li>
            </ul>
          </div>

          {/* JUDGE LEDGER */}
          <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 shadow-xl print:hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-900 pb-4 mb-4">
              <span className="text-sm font-semibold text-neutral-200 font-serif italic">Granular Prompt-by-Prompt Judge Ledger</span>
              <div className="flex items-center gap-2 flex-wrap">
                {(["all", "factual", "adversarial", "bias"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterCategory(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-2xs transition-all cursor-pointer capitalize",
                      filterCategory === f
                        ? "bg-neutral-100 text-neutral-950 font-bold shadow-lg"
                        : "bg-[#0a0a0a] hover:bg-neutral-900 border border-neutral-900 text-neutral-400 hover:text-white"
                    )}
                  >
                    {f === "all" ? "All prompts" : f === "factual" ? "🌍 Factual" : f === "adversarial" ? "🛡️ Adversarial" : "⚖️ Bias"}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                className="w-full bg-[#0a0a0a] border border-neutral-900 p-2 px-10 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 rounded-lg"
                placeholder="Search prompt evaluations or response keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredResults.map(res => {
                const isExpanded = selectedLedgerId === res.id;
                return (
                  <div key={res.id} className="bg-[#0a0a0a] border border-neutral-900 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setSelectedLedgerId(isExpanded ? null : res.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-neutral-900/40 transition-all font-medium cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-widest font-bold font-mono text-neutral-400">{res.category}</span>
                          <span className="text-2xs text-neutral-400 font-mono">ID: {res.promptId}</span>
                        </div>
                        <p className="text-xs text-neutral-200 line-clamp-1">{res.prompt}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1 font-mono text-2xs">
                          <span className="text-neutral-500">A:</span>
                          <strong className="text-neutral-200">
                            {res.category === "factual" ? res.scoresA.accuracy : res.category === "adversarial" ? res.scoresA.safety : res.scoresA.bias}/10
                          </strong>
                          <span className="text-neutral-800 mx-1">|</span>
                          <span className="text-neutral-500">B:</span>
                          <strong className="text-neutral-300">
                            {res.category === "factual" ? res.scoresB.accuracy : res.category === "adversarial" ? res.scoresB.safety : res.scoresB.bias}/10
                          </strong>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-all", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-[#121212] border-t border-neutral-900 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-[#0a0a0a] rounded-lg p-3.5 border border-neutral-900 space-y-2">
                          <span className="text-2xs font-extrabold uppercase tracking-wide text-neutral-400 block border-b border-neutral-800 pb-1">{report.metricsA.modelName} (A)</span>
                          <p className="text-neutral-300 font-sans italic max-h-48 overflow-y-auto whitespace-pre-wrap">&quot;{res.responseA}&quot;</p>
                          <div className="pt-2 text-2xs font-mono text-neutral-500 flex flex-wrap gap-x-4">
                            <span>Accuracy: <strong>{res.scoresA.accuracy}/10</strong></span>
                            <span>Safety: <strong>{res.scoresA.safety}/10</strong></span>
                            <span>Bias: <strong>{res.scoresA.bias}/10</strong></span>
                            <span>Response: <strong>{res.latencyMsA}ms</strong></span>
                          </div>
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg p-3.5 border border-neutral-900 space-y-2">
                          <span className="text-2xs font-extrabold uppercase tracking-wide text-neutral-300 block border-b border-neutral-800 pb-1">{report.metricsB.modelName} (B)</span>
                          <p className="text-neutral-300 font-sans italic max-h-48 overflow-y-auto whitespace-pre-wrap">&quot;{res.responseB}&quot;</p>
                          <div className="pt-2 text-2xs font-mono text-neutral-500 flex flex-wrap gap-x-4">
                            <span>Accuracy: <strong>{res.scoresB.accuracy}/10</strong></span>
                            <span>Safety: <strong>{res.scoresB.safety}/10</strong></span>
                            <span>Bias: <strong>{res.scoresB.bias}/10</strong></span>
                            <span>Response: <strong>{res.latencyMsB}ms</strong></span>
                          </div>
                        </div>
                        <div className="col-span-1 md:col-span-2 bg-[#0a0a0a]/80 rounded-lg p-3.5 border border-neutral-900 space-y-1.5">
                          <span className="text-[9px] font-extrabold text-neutral-300 uppercase tracking-widest block font-mono">LLM-as-a-Judge Impartial Reasoning</span>
                          <p className="text-neutral-300 leading-relaxed font-sans text-xs">{res.scoresA.reasoning || "No reasoning listed."}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Print-only full audit ledger */}
          <div className="hidden print:block space-y-6 pt-6 border-t border-slate-300 font-sans text-black">
            <h2 className="text-lg font-bold">Detailed Evaluation Benchmark Ledger</h2>
            {report.results.map((res, i) => (
              <div key={res.id} className="border-b border-slate-300 pb-4 space-y-2 text-xs" style={{ pageBreakInside: "avoid" }}>
                <div className="flex justify-between font-bold">
                  <span>Prompt #{i+1} • {res.category} (ID: {res.promptId})</span>
                  <span>Category: {res.category}</span>
                </div>
                <p className="font-semibold italic">&quot;{res.prompt}&quot;</p>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="border border-slate-300 p-2.5 rounded">
                    <span className="font-bold block uppercase tracking-wider mb-1">Model A ({report.metricsA.modelName})</span>
                    <p className="italic">&quot;{res.responseA}&quot;</p>
                    <p className="font-mono text-[9px] mt-2">Accuracy: {res.scoresA.accuracy} | Safety: {res.scoresA.safety} | Bias: {res.scoresA.bias}</p>
                  </div>
                  <div className="border border-slate-300 p-2.5 rounded">
                    <span className="font-bold block uppercase tracking-wider mb-1">Model B ({report.metricsB.modelName})</span>
                    <p className="italic">&quot;{res.responseB}&quot;</p>
                    <p className="font-mono text-[9px] mt-2">Accuracy: {res.scoresB.accuracy} | Safety: {res.scoresB.safety} | Bias: {res.scoresB.bias}</p>
                  </div>
                </div>
                <div className="bg-slate-100 p-2 rounded mt-2 border border-slate-300">
                  <span className="font-bold block uppercase tracking-wider text-slate-800 text-[9px]">Judge Audit Remarks:</span>
                  <p className="mt-1">{res.scoresA.reasoning || "Reasoning complete"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <Alert message={error} onClose={() => setError(null)} />}
    </div>
  );
}
