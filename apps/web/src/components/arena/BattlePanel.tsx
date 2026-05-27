"use client";

import { Session, ChatMessage } from "@veritas/shared";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Maximize2,
  Shield,
  Clock,
  HardDrive,
  Coins,
} from "lucide-react";

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
  const userMessages = (session.messagesA || []).filter(
    (m) => m.role === "user",
  );
  const turns = userMessages.map((userMsg, index) => {
    const assistantMsgA = session.messagesA[index * 2 + 1];
    const assistantMsgB = session.messagesB[index * 2 + 1];
    return { userMsg, assistantMsgA, assistantMsgB };
  });

  const renderAssistantCard = (
    msg: ChatMessage | undefined,
    isModelA: boolean,
    isLastTurn: boolean,
  ) => {
    const streamedText = isModelA ? streamedTextA : streamedTextB;
    const panelId = isModelA ? "A" : "B";
    const modelId = isModelA ? session.modelIdA : session.modelIdB;
    const isGenerating = loading && !msg && isLastTurn;

    return (
      <div
        className={cn(
          "bg-neutral-900/40 rounded-[20px] p-5 flex flex-col border transition-all duration-300 relative h-full",
          session.isRevealed && session.votedFor === panelId
            ? "border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-950/20"
            : "border-neutral-800",
        )}
      >
        <div className="border-b border-neutral-800 pb-3 flex items-center justify-between mb-4 select-none">
          <div className="flex items-center gap-2.5">
            {renderBrandLogo(isModelA)}
            <div className="text-left">
              <h3 className="font-semibold text-[13px] text-neutral-200 tracking-tight leading-none flex items-center gap-1.5">
                {getDisplayHeader(isModelA)}
                {session.isRevealed && modelId.includes("frontier") && (
                  <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">
                    FRONTIER
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-neutral-500 font-medium leading-none mt-1">
                {getModelSubtext(isModelA)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(msg?.content || streamedText, panelId)}
              className="text-neutral-500 hover:text-white p-1 rounded transition-all cursor-pointer disabled:opacity-50"
              title="Copy response text"
              disabled={!msg?.content && !streamedText}
            >
              {copiedId === panelId ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <Maximize2 className="w-3.5 h-3.5 text-neutral-600 hover:text-white cursor-pointer" />
          </div>
        </div>

        <div className="flex-1 text-[13px] md:text-sm pr-1 text-left text-[#dfdfdf] whitespace-pre-wrap font-sans">
          {isGenerating ? (
            <div className="flex items-center gap-2 text-neutral-400 font-medium font-sans text-xs pt-1">
              <span className="w-2 h-2 rounded-full bg-neutral-200 animate-ping" />
              <span>Generating...</span>
            </div>
          ) : msg ? (
            <div className="space-y-3 leading-relaxed">
              {msg.guardrailTriggered && (
                <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase border border-amber-900/40 bg-amber-950/20 p-2.5 rounded-lg select-none mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Guardrail check: Prompt analysis rule active</span>
                </div>
              )}
              <div>
                {msg.content ||
                  (isStreaming && isLastTurn ? (
                    streamedText
                  ) : (
                    <span className="opacity-40 italic">Synthesizing...</span>
                  ))}
              </div>

              {!isStreaming && msg.latencyMs && (
                <div className="pt-2 border-t border-neutral-800 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-neutral-500 select-none uppercase tracking-wider mt-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-500" />{" "}
                    {msg.latencyMs}ms
                  </span>
                  {msg.tokensUsed && (
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-neutral-500" />{" "}
                      {msg.tokensUsed} tokens
                    </span>
                  )}
                  {msg.costUsd !== undefined && (
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-neutral-500" /> $
                      {msg.costUsd.toFixed(6)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 pb-4">
      {turns.map((turn, idx) => {
        const isLast = idx === turns.length - 1;
        return (
          <div key={idx} className="flex flex-col space-y-4">
            <div className="flex justify-center select-none mt-2 mb-2">
              <div className="max-w-[85%] bg-neutral-800 text-neutral-200 rounded-full px-5 py-2 text-[13px] md:text-sm font-medium leading-relaxed shadow-sm">
                {turn.userMsg.content}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAssistantCard(turn.assistantMsgA, true, isLast)}
              {renderAssistantCard(turn.assistantMsgB, false, isLast)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
