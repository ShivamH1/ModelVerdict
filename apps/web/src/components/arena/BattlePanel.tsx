"use client";

import { Session } from "@/types";
import { cn } from "@/lib/utils";
import { Check, Copy, Maximize2, Shield, Clock, HardDrive, Coins } from "lucide-react";

interface BattlePanelProps {
  session: Session;
  loading: boolean;
  isStreaming: boolean;
  streamedTextA: string;
  streamedTextB: string;
  copiedId: string | null;
  handleCopy: (text: string, id: string) => void;
  renderBrandLogo: (isModelA: boolean) => React.ReactNode;
  getDisplayHeader: (isModelA: boolean) => string;
  getModelSubtext: (isModelA: boolean) => string;
}

export function BattlePanel({
  session,
  loading,
  isStreaming,
  streamedTextA,
  streamedTextB,
  copiedId,
  handleCopy,
  renderBrandLogo,
  getDisplayHeader,
  getModelSubtext,
}: BattlePanelProps) {
  const renderColumn = (isModelA: boolean) => {
    const messages = isModelA ? session.messagesA : session.messagesB;
    const streamedText = isModelA ? streamedTextA : streamedTextB;
    const modelId = isModelA ? session.modelIdA : session.modelIdB;
    const panelId = isModelA ? "A" : "B";

    return (
      <div 
        className={cn(
          "bg-neutral-900/40 rounded-[20px] p-5 flex flex-col border transition-all duration-300 relative",
          session.isRevealed && session.votedFor === panelId 
            ? "border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-950/20" 
            : "border-neutral-800"
        )}
      >
        <div className="border-b border-neutral-800 pb-3 flex items-center justify-between mb-4 select-none">
          <div className="flex items-center gap-2.5">
            {renderBrandLogo(isModelA)}
            <div className="text-left">
              <h3 className="font-semibold text-[13px] text-neutral-200 tracking-tight leading-none flex items-center gap-1.5">
                {getDisplayHeader(isModelA)}
                {session.isRevealed && modelId.includes("frontier") && (
                  <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">FRONTIER</span>
                )}
              </h3>
              <p className="text-[10px] text-neutral-500 font-medium leading-none mt-1">
                {getModelSubtext(isModelA)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(messages[messages.length - 1]?.content || "", panelId)}
              className="text-neutral-500 hover:text-white p-1 rounded transition-all cursor-pointer"
              title="Copy response text"
            >
              {copiedId === panelId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <Maximize2 className="w-3.5 h-3.5 text-neutral-600 hover:text-white cursor-pointer" />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto mb-2 text-[13px] md:text-sm pr-1">
          {loading && !messages.some(m => m.role === "assistant") ? (
            <div className="flex items-center gap-2 text-neutral-400 font-medium font-sans text-xs pt-1">
              <span className="w-2 h-2 rounded-full bg-neutral-200 animate-ping" />
              <span>Generating...</span>
            </div>
          ) : (
            messages.filter(m => m.role === "assistant").map((msg, i) => (
              <div key={msg.id || i} className="text-left text-[#dfdfdf] space-y-3 leading-relaxed font-sans whitespace-pre-wrap">
                {msg.guardrailTriggered && (
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase border border-amber-900/40 bg-amber-950/20 p-2.5 rounded-lg select-none mb-2">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Guardrail check: Prompt analysis rule active</span>
                  </div>
                )}
                <div>{msg.content || (isStreaming && i === messages.filter(m => m.role === "assistant").length - 1 ? streamedText : <span className="opacity-40 italic">Synthesizing...</span>)}</div>

                {!isStreaming && msg.latencyMs && (
                  <div className="pt-2 border-t border-neutral-800 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-neutral-500 select-none uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-neutral-500" /> {msg.latencyMs}ms</span>
                    {msg.tokensUsed && <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-neutral-500" /> {msg.tokensUsed} tokens</span>}
                    {msg.costUsd !== undefined && <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-neutral-500" /> ${msg.costUsd.toFixed(6)}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <div className="flex justify-end pt-2 select-none">
        <div className="max-w-[70%] bg-neutral-900 text-neutral-100 rounded-2xl px-4 py-2 text-xs md:text-sm font-medium leading-relaxed border border-neutral-800">
          {session.messagesA.filter(m => m.role === "user").slice(-1)[0]?.content || "Active Query"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {renderColumn(true)}
        {renderColumn(false)}
      </div>
    </div>
  );
}
