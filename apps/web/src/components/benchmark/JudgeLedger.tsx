"use client";

import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { EvalResult, EvalSuiteReport } from "@veritas/shared";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface JudgeLedgerProps {
  report: EvalSuiteReport;
}

export function JudgeLedger({ report }: JudgeLedgerProps) {
  const [filterCategory, setFilterCategory] = useState<"all" | "factual" | "adversarial" | "bias">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  const filteredResults = report.results.filter(r => {
    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    const matchesSearch = r.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.responseA.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.responseB.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 shadow-xl print:hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-800 pb-4 mb-4">
        <span className="text-sm font-semibold text-neutral-200 font-serif italic">
          Prompt-by-Prompt Judge Ledger
        </span>

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
  );
}
