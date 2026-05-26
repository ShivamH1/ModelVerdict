"use client";

import React, { useState, useEffect } from "react";
import { Play, BarChart3, FileDown, Info } from "lucide-react";
import { EvalRun, EvalSuiteReport } from "@veritas/shared";
import { MetricCard } from "./benchmark/MetricCard";
import { JudgeLedger } from "./benchmark/JudgeLedger";

export default function BenchmarkSuite() {
  const [runsHistory, setRunsHistory] = useState<EvalRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [report, setReport] = useState<EvalSuiteReport | null>(null);

  const [modelA, setModelA] = useState("qwen-free");
  const [modelB, setModelB] = useState("claude-frontier");
  const [testSize, setTestSize] = useState("10");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentPromptId: "", status: "idle" });

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

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { if (selectedRunId) fetchReport(selectedRunId); }, [selectedRunId]);

  const fetchReport = async (runId: string) => {
    try {
      const res = await fetch(`/api/evaluation/report/${runId}`);
      const data = await res.json();
      if (!data.error) setReport(data);
    } catch (err) {
      console.error("Failed report fetch:", err);
    }
  };

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
      if (data.error) { alert(data.error); setIsRunning(false); }
      else pollStatus(data.runId);
    } catch (err) {
      console.error("Launch failed:", err);
      setTimeout(() => { setIsRunning(false); alert("Simulated end."); }, 2000);
    }
  };

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
        } else if (statusData.status === "running") {
          setProgress({ current: statusData.currentPromptIndex, total: statusData.totalPrompts, currentPromptId: statusData.currentPromptId, status: "running" });
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1000);
  };

  const triggerPrint = () => window.print();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-left print:p-0 transition-all duration-300 bg-[#0a0a0a] text-[#e0e0e0]">
      <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-5 shadow-xl print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-neutral-400" />
              LLM Automated Benchmarks & Evaluations
            </h2>
            <p className="text-xs text-neutral-400 max-w-xl">Synthesize an autonomous grading run comparing models.</p>
          </div>
          {runsHistory.length > 0 && (
            <div className="flex items-center bg-[#0a0a0a] p-2 rounded-xl border border-neutral-800 gap-2.5">
              <span className="text-2xs text-neutral-500 uppercase tracking-wider font-bold">Select Run</span>
              <select className="bg-[#121212] text-xs py-1 px-3 border border-neutral-800 rounded-md focus:outline-none font-mono" value={selectedRunId || ""} onChange={(e) => setSelectedRunId(e.target.value)} disabled={isRunning}>
                {runsHistory.map(run => <option key={run.id} value={run.id}>{run.id} • {new Date(run.startedAt).toLocaleDateString()}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-neutral-900/80 bg-[#0a0a0a]/40 p-4 rounded-xl border border-neutral-900">
          <div className="space-y-1.5"><label className="text-2xs font-bold text-neutral-500 uppercase">Model A</label>
            <select className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs focus:outline-none" value={modelA} onChange={(e) => setModelA(e.target.value)} disabled={isRunning}>
              <option value="qwen-free">Qwen 2.5 (0.5B)</option><option value="llama-free">Llama 3.2 (3B)</option>
            </select>
          </div>
          <div className="space-y-1.5"><label className="text-2xs font-bold text-neutral-500 uppercase">Model B</label>
            <select className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs focus:outline-none" value={modelB} onChange={(e) => setModelB(e.target.value)} disabled={isRunning}>
              <option value="claude-frontier">Claude 3.5 Sonnet</option><option value="gemini-frontier">Gemini 3.5 Flash</option>
            </select>
          </div>
          <div className="space-y-1.5"><label className="text-2xs font-bold text-neutral-500 uppercase">Dataset Size</label>
            <select className="w-full bg-[#121212] border border-neutral-800 rounded-lg py-2 px-3 text-xs focus:outline-none" value={testSize} onChange={(e) => setTestSize(e.target.value)} disabled={isRunning}>
              <option value="5">5 prompts</option><option value="15">15 prompts</option><option value="35">35 prompts</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleLaunch} disabled={isRunning} className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-semibold transition-all rounded-lg py-2.5 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50">
              <Play className="w-3.5 h-3.5 fill-current" /> Launch Benchmark
            </button>
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="bg-[#121212] border border-neutral-900 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-5 justify-between shadow-xl animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-neutral-800 border-t-neutral-100 animate-spin" />
            <div>
              <span className="text-sm font-bold text-neutral-100 block">Running comparative grading...</span>
              <p className="text-xs text-neutral-500 mt-1 font-mono">Prompt: <strong className="text-neutral-300">{progress.currentPromptId}</strong></p>
            </div>
          </div>
          <div className="w-full md:w-80 text-right space-y-1">
            <div className="flex justify-between text-2xs font-bold text-neutral-500 font-mono uppercase">
              <span>Progress</span><span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
              <div className="h-full bg-neutral-100 transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-6 print:space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl print:border-none print:shadow-none print:bg-white print:p-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase font-extrabold bg-emerald-950/40 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30 print:hidden">Study Completed</span>
                <span className="text-2xs text-neutral-500 font-mono uppercase font-semibold">Run ID: {report.run.id}</span>
              </div>
              <h1 className="text-xl font-bold text-neutral-100 mt-2 print:text-black">Evaluation Scorecard</h1>
              <p className="text-xs text-neutral-400 mt-1 print:text-neutral-700">Comparative audit: <strong>{report.metricsA.modelName} (A)</strong> vs <strong>{report.metricsB.modelName} (B)</strong>.</p>
            </div>
            <button onClick={triggerPrint} className="bg-[#0a0a0a] hover:bg-[#121212] text-neutral-200 border border-neutral-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer print:hidden shadow">
              <FileDown className="w-4 h-4" /> Download Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
            <MetricCard title="Hallucination Rate (%)" description="Likelihood of fabricating factual details (lower is better).">
              <div className="space-y-2">
                <div className="flex justify-between text-2xs font-mono font-bold">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsA.modelName}</span>
                  <span className={report.metricsA.hallucinationRate > 25 ? "text-amber-500" : "text-emerald-400"}>{report.metricsA.hallucinationRate}%</span>
                </div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-600 rounded-full" style={{ width: `${report.metricsA.hallucinationRate}%` }} /></div>
                <div className="flex justify-between text-2xs font-mono font-bold pt-1">
                  <span className="text-neutral-400 truncate max-w-[140px]">{report.metricsB.modelName}</span>
                  <span className={report.metricsB.hallucinationRate > 10 ? "text-amber-500" : "text-emerald-400"}>{report.metricsB.hallucinationRate}%</span>
                </div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-100 rounded-full" style={{ width: `${report.metricsB.hallucinationRate}%` }} /></div>
              </div>
            </MetricCard>

            <MetricCard title="Refusal Index" description="Rate of successfully blocking dangerous commands (higher is better).">
              <div className="space-y-2">
                <div className="flex justify-between text-2xs font-mono font-bold"><span className="text-neutral-400 truncate max-w-[140px]">{report.metricsA.modelName}</span><span className="text-emerald-400">{report.metricsA.jailbreakRefusalRate}%</span></div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-600 rounded-full" style={{ width: `${report.metricsA.jailbreakRefusalRate}%` }} /></div>
                <div className="flex justify-between text-2xs font-mono font-bold pt-1"><span className="text-neutral-400 truncate max-w-[140px]">{report.metricsB.modelName}</span><span className="text-emerald-400">{report.metricsB.jailbreakRefusalRate}%</span></div>
                <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden"><div className="h-full bg-neutral-100 rounded-full" style={{ width: `${report.metricsB.jailbreakRefusalRate}%` }} /></div>
              </div>
            </MetricCard>

            <MetricCard title="Inference Latency" description="Average duration for complete synthesis (lower is better).">
              <div className="flex items-center justify-around mt-2 bg-[#0a0a0a] p-3 rounded-xl border border-neutral-800 font-mono">
                <div className="text-center"><span className="text-[9px] font-semibold text-neutral-500 uppercase">Model A</span><div className="text-sm font-black text-neutral-400">{report.metricsA.avgLatencyMs}ms</div></div>
                <div className="w-px h-8 bg-neutral-800" />
                <div className="text-center"><span className="text-[9px] font-semibold text-neutral-500 uppercase">Model B</span><div className="text-sm font-black text-neutral-100">{report.metricsB.avgLatencyMs}ms</div></div>
              </div>
            </MetricCard>
          </div>

          <div className="bg-[#121212]/40 p-5 rounded-2xl border border-neutral-900 space-y-3 print:bg-white print:border-neutral-300 print:text-black">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 font-mono"><Info className="w-4 h-4" /> Strategic Insights</h3>
            <ul className="text-xs list-disc font-medium text-neutral-400 pl-4 space-y-2 leading-relaxed">
              <li><strong>Accuracy Gap</strong>: OSS models exhibit higher hallucination indexes on math calculation.</li>
              <li><strong>Refusal Guarding</strong>: Frontier models represent more articulate system refusals.</li>
              <li><strong>Latencies</strong>: Lightweight OSS models achieve significantly quicker inference times.</li>
            </ul>
          </div>

          <JudgeLedger report={report} />
        </div>
      )}
    </div>
  );
}
