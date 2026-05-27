"use client";

import { Session } from "@veritas/shared";
import { cn } from "@/lib/utils";

interface BallotPanelProps {
  session: Session;
  loading: boolean;
  isStreaming: boolean;
  submitVote: (choice: "A" | "B" | "tie" | "both_bad") => void;
  revealSession: () => void;
  getDisplayHeader: (isModelA: boolean) => string;
}

export function BallotPanel({ 
  session, 
  loading, 
  isStreaming, 
  submitVote, 
  revealSession, 
  getDisplayHeader 
}: BallotPanelProps) {
  if (session.votedFor) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center space-y-2 max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="text-xs font-semibold text-neutral-300">
          Model Identities Revealed!
        </div>
        <div className="flex justify-center items-center gap-6 pt-1">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold">Assistant A</span>
            <strong className="text-sm text-neutral-200 mt-1 font-mono">{getDisplayHeader(true)}</strong>
            {session.eloDelta && (
              <span className={cn(
                "text-[10px] font-mono font-bold mt-0.5",
                session.eloDelta.modelA > 0 ? "text-emerald-500" : session.eloDelta.modelA < 0 ? "text-rose-500" : "text-neutral-500"
              )}>
                {session.eloDelta.modelA >= 0 ? `+${session.eloDelta.modelA}` : session.eloDelta.modelA} Elo
              </span>
            )}
          </div>
          <div className="w-px h-8 bg-neutral-800" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold">Assistant B</span>
            <strong className="text-sm text-neutral-200 mt-1 font-mono">{getDisplayHeader(false)}</strong>
            {session.eloDelta && (
              <span className={cn(
                "text-[10px] font-mono font-bold mt-0.5",
                session.eloDelta.modelB > 0 ? "text-emerald-500" : session.eloDelta.modelB < 0 ? "text-rose-500" : "text-neutral-500"
              )}>
                {session.eloDelta.modelB >= 0 ? `+${session.eloDelta.modelB}` : session.eloDelta.modelB} Elo
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-neutral-400 mt-2 font-medium">
          {session.votedFor === "tie" && "🤝 You designated this round as an equal Tie."}
          {session.votedFor === "both_bad" && "☠️ You audited both outputs as critically flawed."}
          {session.votedFor === "A" && "🏆 Voted Assistant A as the superior, highly coherent outputs."}
          {session.votedFor === "B" && "🏆 Voted Assistant B as the superior, highly coherent outputs."}
        </p>
      </div>
    );
  }

  if (loading || isStreaming) return null;

  return (
    <div className="space-y-3 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-[11px] text-neutral-400 font-mono tracking-tight font-medium">
        Which response was better? Select choice to reveal exact model names
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-2.5 bg-neutral-900/80 p-1.5 rounded-xl border border-neutral-800 shadow-xl">
        <button
          onClick={() => submitVote("A")}
          className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
        >
          ← A is better
        </button>
        <button
          onClick={() => submitVote("tie")}
          className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
        >
          ⇄ Both are good
        </button>
        <button
          onClick={() => submitVote("both_bad")}
          className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
        >
          ∅ Both are bad
        </button>
        <button
          onClick={() => submitVote("B")}
          className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
        >
          B is better →
        </button>
      </div>

      {!session.isRevealed && (
        <button
          onClick={revealSession}
          className="text-[10px] text-neutral-500 hover:text-neutral-300 block mx-auto underline mt-2 bg-transparent border-none cursor-pointer"
        >
          Skip voting & reveal details immediately
        </button>
      )}
    </div>
  );
}
