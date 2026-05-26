"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, Settings } from "lucide-react";
import { Session } from "@veritas/shared";
import { ArenaWelcome } from "./arena/ArenaWelcome";
import { BallotPanel } from "./arena/BallotPanel";
import { BattlePanel } from "./arena/BattlePanel";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ArenaChat() {
  const [session, setSession] = useState<Session | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [blindMode, setBlindMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom Provider State
  const [customApiKey, setCustomApiKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModelName, setCustomModelName] = useState("");

  // Live streaming states
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedTextA, setStreamedTextA] = useState("");
  const [streamedTextB, setStreamedTextB] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const initSession = async () => {
    setLoading(true);
    setIsStreaming(false);
    setStreamedTextA("");
    setStreamedTextB("");
    try {
      const res = await fetch("/api/sessions/init", { method: "POST" });
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error("Failed to start battle session:", err);
      setSession({
        id: "dev-session",
        messagesA: [],
        messagesB: [],
        modelIdA: "gemini-frontier",
        modelIdB: "claude-frontier",
        isRevealed: false,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messagesA, session?.messagesB, streamedTextA, streamedTextB]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading || isStreaming || !session) return;

    const userPrompt = prompt;
    setPrompt("");
    setLoading(true);

    const updatedMsgsA = [
      ...session.messagesA,
      { id: `opt-usr-a`, role: "user" as const, content: userPrompt },
    ];
    const updatedMsgsB = [
      ...session.messagesB,
      { id: `opt-usr-b`, role: "user" as const, content: userPrompt },
    ];

    setSession({
      ...session,
      messagesA: updatedMsgsA,
      messagesB: updatedMsgsB,
    });

    try {
      const res = await fetch(`/api/sessions/${session.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          customApiKey: customApiKey || undefined,
          customBaseUrl: customBaseUrl || undefined,
          customModelName: customModelName || undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        setLoading(false);
      } else {
        const lastIndexA = data.messagesA.length - 1;
        const lastIndexB = data.messagesB.length - 1;
        const fullTxtA =
          data.messagesA[lastIndexA]?.role === "assistant"
            ? data.messagesA[lastIndexA].content
            : "";
        const fullTxtB =
          data.messagesB[lastIndexB]?.role === "assistant"
            ? data.messagesB[lastIndexB].content
            : "";

        const initialSession = { ...data };
        if (
          lastIndexA >= 0 &&
          initialSession.messagesA[lastIndexA].role === "assistant"
        ) {
          initialSession.messagesA[lastIndexA] = {
            ...initialSession.messagesA[lastIndexA],
            content: "",
          };
        }
        if (
          lastIndexB >= 0 &&
          initialSession.messagesB[lastIndexB].role === "assistant"
        ) {
          initialSession.messagesB[lastIndexB] = {
            ...initialSession.messagesB[lastIndexB],
            content: "",
          };
        }

        setSession(initialSession);
        setIsStreaming(true);
        setLoading(false);

        let charIdxA = 0;
        let charIdxB = 0;

        const interval = setInterval(() => {
          const doneA = charIdxA >= fullTxtA.length;
          const doneB = charIdxB >= fullTxtB.length;

          if (doneA && doneB) {
            clearInterval(interval);
            setIsStreaming(false);
            setSession(data);
            return;
          }

          if (!doneA) {
            charIdxA = Math.min(charIdxA + 4, fullTxtA.length);
            const sliceA = fullTxtA.slice(0, charIdxA);
            setStreamedTextA(sliceA);
            setSession((prev) => {
              if (!prev) return prev;
              const copy = { ...prev };
              if (copy.messagesA[lastIndexA])
                copy.messagesA[lastIndexA] = {
                  ...copy.messagesA[lastIndexA],
                  content: sliceA,
                };
              return copy;
            });
          }

          if (!doneB) {
            charIdxB = Math.min(charIdxB + 4, fullTxtB.length);
            const sliceB = fullTxtB.slice(0, charIdxB);
            setStreamedTextB(sliceB);
            setSession((prev) => {
              if (!prev) return prev;
              const copy = { ...prev };
              if (copy.messagesB[lastIndexB])
                copy.messagesB[lastIndexB] = {
                  ...copy.messagesB[lastIndexB],
                  content: sliceB,
                };
              return copy;
            });
          }
        }, 12);
      }
    } catch (error) {
      console.error("Chat failure:", error);
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitVote = async (choice: "A" | "B" | "tie" | "both_bad") => {
    if (!session || session.votedFor) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: choice }),
      });
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error("Failed to commit vote:", err);
    }
  };

  const revealSession = async () => {
    if (!session || session.isRevealed) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}/reveal`, {
        method: "POST",
      });
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error("Reveal failure:", err);
    }
  };

  const getDisplayHeader = (isModelA: boolean) => {
    if (!session) return "";
    if (blindMode && !session.isRevealed)
      return isModelA ? "Assistant A" : "Assistant B";
    const targetModelId = isModelA ? session.modelIdA : session.modelIdB;
    const cleanNames: { [key: string]: string } = {
      "qwen-free": "qwen-2.5-instruct-0.5b",
      "llama-free": "llama-3.2-3b-instruct",
      "gemini-frontier": "gemini-3.5-flash",
      "claude-frontier": "claude-3.5-sonnet",
    };
    return cleanNames[targetModelId] || targetModelId;
  };

  const getModelSubtext = (isModelA: boolean) => {
    if (!session) return "";
    if (blindMode && !session.isRevealed) return "Anonymous Model Persona";
    const targetModelId = isModelA ? session.modelIdA : session.modelIdB;
    const desc: { [key: string]: string } = {
      "qwen-free": "Alibaba OSS • Lightweight Sim",
      "llama-free": "Meta OSS • 3B Parameter Model",
      "gemini-frontier": "Google Frontier State",
      "claude-frontier": "Anthropic Frontier Pro",
    };
    return desc[targetModelId] || "External Endpoint Override";
  };

  const renderBrandLogo = (isModelA: boolean) => {
    if (!session || (blindMode && !session.isRevealed)) {
      return (
        <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-mono text-neutral-400 font-bold select-none">
          ?
        </div>
      );
    }
    const targetModelId = isModelA ? session.modelIdA : session.modelIdB;
    const brands = {
      gemini: { bg: "bg-blue-600", char: "G" },
      claude: { bg: "bg-amber-600", char: "C" },
      llama: { bg: "bg-teal-600", char: "L" },
    };
    const brand = Object.entries(brands).find(([key]) =>
      targetModelId.includes(key),
    )?.[1] || { bg: "bg-purple-600", char: "Q" };
    return (
      <div
        className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center text-[11px] text-white font-black shadow-sm font-sans select-none",
          brand.bg,
        )}
      >
        {brand.char}
      </div>
    );
  };

  const hasMessages =
    session &&
    ((session.messagesA && session.messagesA.length > 0) ||
      (session.messagesB && session.messagesB.length > 0));

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0a0a0a] text-[#e0e0e0] font-sans antialiased relative">
      <div className="px-4 py-3 bg-[#121212]/30 border-b border-neutral-900 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono tracking-tight font-medium select-none">
            <span>⚔️ Battle Arena</span>
          </div>
          <button
            onClick={() => setBlindMode(!blindMode)}
            className={cn(
              "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-all",
              blindMode
                ? "bg-neutral-900 border-neutral-800 text-neutral-300 cursor-pointer"
                : "bg-neutral-900/10 border-neutral-800/30 text-neutral-500 cursor-pointer",
            )}
          >
            {blindMode ? "Blind: Enabled" : "Blind: Revealed"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "text-xs px-2.5 py-1 rounded transition-all flex items-center gap-1.5",
              showSettings
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white",
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={initSession}
            disabled={loading}
            className="text-xs text-neutral-300 hover:text-white px-2.5 py-1 rounded transition-all flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                loading && !hasMessages && "animate-spin",
              )}
            />
            <span>Reset Arena</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#121212] border-b border-neutral-900 overflow-hidden"
          >
            <div className="max-w-4xl mx-auto p-4 space-y-3">
              <div className="text-xs font-semibold text-neutral-200">
                Configure External OpenAI Endpoint
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <input
                  type="text"
                  className="bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  placeholder="Base URL"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                />
                <input
                  type="password"
                  className="bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  placeholder="Api Key"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                />
                <input
                  type="text"
                  className="bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  placeholder="Model Name"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col justify-between overflow-y-auto w-full max-w-7xl mx-auto px-4 py-6 md:px-8">
        {!hasMessages ? (
          <ArenaWelcome
            prompt={prompt}
            setPrompt={setPrompt}
            loading={loading}
            handleSend={handleSend}
          />
        ) : (
          <BattlePanel
            session={session!}
            loading={loading}
            isStreaming={isStreaming}
            streamedTextA={streamedTextA}
            streamedTextB={streamedTextB}
            copiedId={copiedId}
            handleCopy={handleCopy}
            renderBrandLogo={renderBrandLogo}
            getDisplayHeader={getDisplayHeader}
            getModelSubtext={getModelSubtext}
          />
        )}

        {hasMessages && (
          <div className="w-full flex justify-center py-4 select-none">
            <BallotPanel
              session={session!}
              loading={loading}
              isStreaming={isStreaming}
              submitVote={submitVote}
              revealSession={revealSession}
              getDisplayHeader={getDisplayHeader}
            />
          </div>
        )}

        {hasMessages && (
          <div className="pt-3 border-t border-neutral-900 w-full max-w-3xl mx-auto select-none">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 bg-neutral-900/80 rounded-[16px] border border-neutral-800 p-2 focus-within:border-neutral-700 transition-all"
            >
              <input
                type="text"
                className="flex-1 bg-transparent text-neutral-200 placeholder-neutral-500 text-xs py-1.5 px-2 focus:outline-none"
                placeholder={
                  isStreaming
                    ? "Streaming live outputs..."
                    : loading
                      ? "Resolving parallel generations..."
                      : "Prompt both models simultaneously..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading || isStreaming}
              />
              <button
                type="submit"
                disabled={loading || isStreaming || !prompt.trim()}
                className="w-7 h-7 rounded-full bg-neutral-200 hover:bg-white text-neutral-950 flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer shrink-0"
              >
                <Send className="w-3 h-3 fill-current" />
              </button>
            </form>
          </div>
        )}
      </div>
      <div ref={chatEndRef} />
    </div>
  );
}
