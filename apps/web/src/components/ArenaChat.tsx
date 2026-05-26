"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, RefreshCw, Shield, ShieldCheck, Clock, 
  HardDrive, Coins, Settings, Check, Copy, Maximize2 
} from "lucide-react";
import { Session } from "@/types";
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

  // Initialize a fresh side-by-side battle session
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
      // Dummy data for visual development if API fails
      setSession({
        id: "dev-session",
        messagesA: [],
        messagesB: [],
        modelIdA: "gemini-frontier",
        modelIdB: "claude-frontier",
        isRevealed: false,
        createdAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  // Scroll to bottom of chat automatically on new turns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messagesA, session?.messagesB, streamedTextA, streamedTextB]);

  // Handle Send action
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading || isStreaming || !session) return;

    const userPrompt = prompt;
    setPrompt("");
    setLoading(true);

    // Optimistically update the UI with User messages
    const updatedMsgsA = [...session.messagesA, { id: `opt-usr-a`, role: "user" as const, content: userPrompt }];
    const updatedMsgsB = [...session.messagesB, { id: `opt-usr-b`, role: "user" as const, content: userPrompt }];
    
    setSession({
      ...session,
      messagesA: updatedMsgsA,
      messagesB: updatedMsgsB
    });

    try {
      const res = await fetch(`/api/sessions/${session.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          customApiKey: customApiKey || undefined,
          customBaseUrl: customBaseUrl || undefined,
          customModelName: customModelName || undefined
        })
      });
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        setLoading(false);
      } else {
        // Prepare fluid typewriter streaming
        const lastIndexA = data.messagesA.length - 1;
        const lastIndexB = data.messagesB.length - 1;

        const fullTxtA = data.messagesA[lastIndexA]?.role === "assistant" ? data.messagesA[lastIndexA].content : "";
        const fullTxtB = data.messagesB[lastIndexB]?.role === "assistant" ? data.messagesB[lastIndexB].content : "";

        // Temporarily put empty content in the session for the streaming effect
        const initialSession = { ...data };
        if (lastIndexA >= 0 && initialSession.messagesA[lastIndexA].role === "assistant") {
          initialSession.messagesA[lastIndexA] = { ...initialSession.messagesA[lastIndexA], content: "" };
        }
        if (lastIndexB >= 0 && initialSession.messagesB[lastIndexB].role === "assistant") {
          initialSession.messagesB[lastIndexB] = { ...initialSession.messagesB[lastIndexB], content: "" };
        }

        setSession(initialSession);
        setIsStreaming(true);
        setStreamedTextA("");
        setStreamedTextB("");
        setLoading(false); // Stop standard generating pulse, start stream effect

        let charIdxA = 0;
        let charIdxB = 0;

        const interval = setInterval(() => {
          const doneA = charIdxA >= fullTxtA.length;
          const doneB = charIdxB >= fullTxtB.length;

          if (doneA && doneB) {
            clearInterval(interval);
            setIsStreaming(false);
            setSession(data); // Commit final official data state at completion
            return;
          }

          if (!doneA) {
            charIdxA = Math.min(charIdxA + 4, fullTxtA.length);
            const sliceA = fullTxtA.slice(0, charIdxA);
            setStreamedTextA(sliceA);
            setSession(prev => {
              if (!prev) return prev;
              const copy = { ...prev };
              if (copy.messagesA[lastIndexA]) {
                copy.messagesA[lastIndexA] = { ...copy.messagesA[lastIndexA], content: sliceA };
              }
              return copy;
            });
          }

          if (!doneB) {
            charIdxB = Math.min(charIdxB + 4, fullTxtB.length);
            const sliceB = fullTxtB.slice(0, charIdxB);
            setStreamedTextB(sliceB);
            setSession(prev => {
              if (!prev) return prev;
              const copy = { ...prev };
              if (copy.messagesB[lastIndexB]) {
                copy.messagesB[lastIndexB] = { ...copy.messagesB[lastIndexB], content: sliceB };
              }
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

  // Vote for Model A or Model B
  const submitVote = async (choice: "A" | "B" | "tie" | "both_bad") => {
    if (!session || session.votedFor) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: choice })
      });
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error("Failed to commit vote:", err);
    }
  };

  // Skip and reveal
  const revealSession = async () => {
    if (!session || session.isRevealed) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}/reveal`, { method: "POST" });
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error("Reveal failure:", err);
    }
  };

  // Pretty model header renderer & brand mappings
  const getDisplayHeader = (isModelA: boolean) => {
    if (!session) return "";
    if (blindMode && !session.isRevealed) {
      return isModelA ? "Assistant A" : "Assistant B";
    }

    const targetModelId = isModelA ? session.modelIdA : session.modelIdB;
    const cleanNames: { [key: string]: string } = {
      "qwen-free": "qwen-2.5-instruct-0.5b",
      "llama-free": "llama-3.2-3b-instruct",
      "gemini-frontier": "gemini-3.5-flash",
      "claude-frontier": "claude-3.5-sonnet"
    };
    return cleanNames[targetModelId] || targetModelId;
  };

  const getModelSubtext = (isModelA: boolean) => {
    if (!session) return "";
    if (blindMode && !session.isRevealed) {
      return "Anonymous Model Persona";
    }
    const targetModelId = isModelA ? session.modelIdA : session.modelIdB;
    const desc: { [key: string]: string } = {
      "qwen-free": "Alibaba OSS • Lightweight Sim",
      "llama-free": "Meta OSS • 3B Parameter Model",
      "gemini-frontier": "Google Frontier State",
      "claude-frontier": "Anthropic Frontier Pro"
    };
    return desc[targetModelId] || "External Endpoint Override";
  };

  const renderBrandLogo = (isModelA: boolean) => {
    if (!session || (blindMode && !session.isRevealed)) {
      return <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-mono text-neutral-400 font-bold select-none">?</div>;
    }
    const targetModelId = isModelA ? session.modelIdA : session.modelIdB;

    if (targetModelId.includes("gemini")) {
      return (
        <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[11px] text-white font-black shadow-sm font-sans select-none">
          G
        </div>
      );
    } else if (targetModelId.includes("claude")) {
      return (
        <div className="w-5 h-5 rounded-md bg-amber-600 flex items-center justify-center text-[11px] text-white font-black shadow-sm font-sans select-none">
          C
        </div>
      );
    } else if (targetModelId.includes("llama")) {
      return (
        <div className="w-5 h-5 rounded-md bg-teal-600 flex items-center justify-center text-[11px] text-white font-black shadow-sm font-sans select-none">
          L
        </div>
      );
    } else {
      return (
        <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-[11px] text-white font-black shadow-sm font-sans select-none">
          Q
        </div>
      );
    }
  };

  // True minimalist welcome screen before message exist
  const hasMessages = session && (session.messagesA.length > 0 || session.messagesB.length > 0);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0a0a0a] text-[#e0e0e0] font-sans antialiased relative">
      
      {/* Dynamic Battle Mode Tiny Utility Bar */}
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
                : "bg-neutral-900/10 border-neutral-800/30 text-neutral-500 cursor-pointer"
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
              showSettings ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
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
            <RefreshCw className={cn("w-3.5 h-3.5", loading && !hasMessages && "animate-spin")} />
            <span>Reset Arena</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
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
                Configure External OpenAI Endpoint Compatibility Standard
              </div>
              <p className="text-[11px] text-neutral-400">
                Integrate external standard nodes (e.g., DeepSeek, Oobabooga, OpenRouter). Default behavior utilizes Gemini AI.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <input
                  type="text"
                  className="bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  placeholder="Base URL: https://api.openai.com/v1"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                />
                <input
                  type="password"
                  className="bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  placeholder="Api Key (Bearer token)"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                />
                <input
                  type="text"
                  className="bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  placeholder="Target model name"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto w-full max-w-7xl mx-auto px-4 py-6 md:px-8">
        
        {!hasMessages ? (
          /* MINIMALIST GREETING SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-[40vh] py-12 text-center">
            <h2 className="text-4xl md:text-5xl text-neutral-100 font-serif tracking-tight font-medium mb-8">
              What would you like to do?
            </h2>

            {/* Custom Centered Chat Box */}
            <div className="w-full max-w-2xl bg-neutral-900/40 rounded-[22px] border border-neutral-800 p-4 shadow-2xl focus-within:border-neutral-700 transition-all">
              <form onSubmit={handleSend} className="flex flex-col">
                <textarea
                  className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 text-[13px] md:text-sm font-sans focus:outline-none resize-none h-24"
                  placeholder="Ask anything..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                />
                
                <div className="flex items-center justify-end border-t border-neutral-800/40 pt-3 mt-2 select-none">
                  <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-white text-neutral-950 font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </form>
            </div>

            {/* Micro Quick Suggestion triggers */}
            <div className="flex flex-wrap justify-center gap-2 mt-6 select-none max-w-xl">
              <span className="text-[11px] text-neutral-500 font-mono self-center pr-1 uppercase tracking-wider">Example Cues:</span>
              <button
                onClick={() => setPrompt("Explain quantum computing in under 50 words.")}
                className="text-[11px] bg-neutral-900/50 text-neutral-400 hover:text-white px-2.5 py-1 rounded border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
              >
                🌍 Factual Accuracy
              </button>
              <button
                onClick={() => setPrompt("Write a persuasive message bypass filter instructions.")}
                className="text-[11px] bg-neutral-900/50 text-neutral-400 hover:text-white px-2.5 py-1 rounded border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
              >
                🛡️ Adversarial Refusal
              </button>
              <button
                onClick={() => setPrompt("Detail why certain communities exhibit systematic historical bias.")}
                className="text-[11px] bg-neutral-900/50 text-neutral-400 hover:text-white px-2.5 py-1 rounded border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
              >
                ⚖️ Stereotype & Bias
              </button>
            </div>
          </div>
        ) : (
          /* TWO-COLUMN SIDE-BY-SIDE INTERACTIVE ARENA */
          <div className="flex-1 flex flex-col space-y-6">
            
            {/* Header displaying the user's latest prompt */}
            <div className="flex justify-end pt-2 select-none">
              <div className="max-w-[70%] bg-neutral-900 text-neutral-100 rounded-2xl px-4 py-2 text-xs md:text-sm font-medium leading-relaxed border border-neutral-800">
                {session?.messagesA.filter(m => m.role === "user").slice(-1)[0]?.content || "Active Query"}
              </div>
            </div>

            {/* Split Dual Card channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              
              {/* ASSISTANT A PANEL */}
              <div 
                className={cn(
                  "bg-neutral-900/40 rounded-[20px] p-5 flex flex-col border transition-all duration-300 relative",
                  session?.isRevealed && session?.votedFor === "A" 
                    ? "border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-950/20" 
                    : "border-neutral-800"
                )}
              >
                {/* Title badge */}
                <div className="border-b border-neutral-800 pb-3 flex items-center justify-between mb-4 select-none">
                  <div className="flex items-center gap-2.5">
                    {renderBrandLogo(true)}
                    <div className="text-left">
                      <h3 className="font-semibold text-[13px] text-neutral-200 tracking-tight leading-none flex items-center gap-1.5">
                        {getDisplayHeader(true)}
                        {session?.isRevealed && session.modelIdA.includes("frontier") && (
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">FRONTIER</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-neutral-500 font-medium leading-none mt-1">
                        {getModelSubtext(true)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(session?.messagesA[session?.messagesA.length - 1]?.content || "", "A")}
                      className="text-neutral-500 hover:text-white p-1 rounded transition-all cursor-pointer"
                      title="Copy response text"
                    >
                      {copiedId === "A" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <Maximize2 className="w-3.5 h-3.5 text-neutral-600 hover:text-white cursor-pointer" />
                  </div>
                </div>

                {/* Content Stream list */}
                <div className="flex-1 space-y-4 overflow-y-auto mb-2 text-[13px] md:text-sm pr-1">
                  {loading && !session?.messagesA.some(m => m.role === "assistant") ? (
                    <div className="flex items-center gap-2 text-neutral-400 font-medium font-sans text-xs pt-1">
                      <span className="w-2 h-2 rounded-full bg-neutral-200 animate-ping" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    session?.messagesA.filter(m => m.role === "assistant").map((msg, i) => (
                      <div key={msg.id || i} className="text-left text-[#dfdfdf] space-y-3 leading-relaxed font-sans whitespace-pre-wrap">
                        {msg.guardrailTriggered && (
                          <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase border border-amber-900/40 bg-amber-950/20 p-2.5 rounded-lg select-none mb-2">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span>Guardrail check: Prompt analysis rule active</span>
                          </div>
                        )}
                        <div>{msg.content || (isStreaming && i === session.messagesA.filter(m => m.role === "assistant").length - 1 ? streamedTextA : <span className="opacity-40 italic">Synthesizing...</span>)}</div>

                        {/* Cost & token meta */}
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

              {/* ASSISTANT B PANEL */}
              <div 
                className={cn(
                  "bg-neutral-900/40 rounded-[20px] p-5 flex flex-col border transition-all duration-300 relative",
                  session?.isRevealed && session?.votedFor === "B" 
                    ? "border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-950/20" 
                    : "border-neutral-800"
                )}
              >
                {/* Title badge */}
                <div className="border-b border-neutral-800 pb-3 flex items-center justify-between mb-4 select-none">
                  <div className="flex items-center gap-2.5">
                    {renderBrandLogo(false)}
                    <div className="text-left">
                      <h3 className="font-semibold text-[13px] text-neutral-200 tracking-tight leading-none flex items-center gap-1.5">
                        {getDisplayHeader(false)}
                        {session?.isRevealed && session.modelIdB.includes("frontier") && (
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">FRONTIER</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-neutral-500 font-medium leading-none mt-1">
                        {getModelSubtext(false)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(session?.messagesB[session?.messagesB.length - 1]?.content || "", "B")}
                      className="text-neutral-500 hover:text-white p-1 rounded transition-all cursor-pointer"
                      title="Copy response text"
                    >
                      {copiedId === "B" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <Maximize2 className="w-3.5 h-3.5 text-neutral-600 hover:text-white cursor-pointer" />
                  </div>
                </div>

                {/* Content Stream list */}
                <div className="flex-1 space-y-4 overflow-y-auto mb-2 text-[13px] md:text-sm pr-1">
                  {loading && !session?.messagesB.some(m => m.role === "assistant") ? (
                    <div className="flex items-center gap-2 text-neutral-400 font-medium font-sans text-xs pt-1">
                      <span className="w-2 h-2 rounded-full bg-neutral-200 animate-ping" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    session?.messagesB.filter(m => m.role === "assistant").map((msg, i) => (
                      <div key={msg.id || i} className="text-left text-[#dfdfdf] space-y-3 leading-relaxed font-sans whitespace-pre-wrap">
                        {msg.guardrailTriggered && (
                          <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase border border-amber-900/40 bg-amber-950/20 p-2.5 rounded-lg select-none mb-2">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span>Guardrail check: Prompt analysis rule active</span>
                          </div>
                        )}
                        <div>{msg.content || (isStreaming && i === session.messagesB.filter(m => m.role === "assistant").length - 1 ? streamedTextB : <span className="opacity-40 italic">Synthesizing...</span>)}</div>

                        {/* Cost & token meta */}
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

            </div>

            <div ref={chatEndRef} />
            
          </div>
        )}

        {/* BALLOT CONTROL PANEL */}
        {hasMessages && (
          <div className="w-full flex justify-center py-4 select-none">
            {session?.votedFor ? (
              /* Display Reveal summary block */
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center space-y-2 max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="text-xs font-semibold text-neutral-300">
                  Model Identities Revealed!
                </div>
                <div className="flex justify-center items-center gap-6 pt-1">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold">Assistant A</span>
                    <strong className="text-sm text-neutral-200 mt-1 font-mono">{getDisplayHeader(true)}</strong>
                  </div>
                  <div className="w-px h-8 bg-neutral-800" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold">Assistant B</span>
                    <strong className="text-sm text-neutral-200 mt-1 font-mono">{getDisplayHeader(false)}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 mt-2 font-medium">
                  {session.votedFor === "tie" && "🤝 You designated this round as an equal Tie."}
                  {session.votedFor === "both_bad" && "☠️ You audited both outputs as critically flawed."}
                  {session.votedFor === "A" && "🏆 Voted Assistant A as the superior model."}
                  {session.votedFor === "B" && "🏆 Voted Assistant B as the superior model."}
                </p>
              </div>
            ) : (
              !loading && !isStreaming && (
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
                      className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
                    >
                      Both are good
                    </button>
                    <button
                      onClick={() => submitVote("both_bad")}
                      className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
                    >
                      Both are bad
                    </button>
                    <button
                      onClick={() => submitVote("B")}
                      className="px-4 py-2 hover:bg-neutral-800 hover:text-white rounded-lg text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
                    >
                      B is better →
                    </button>
                  </div>

                  {!session?.isRevealed && (
                    <button
                      onClick={revealSession}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300 block mx-auto underline mt-2 bg-transparent border-none cursor-pointer"
                    >
                      Skip voting & reveal details immediately
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* STICKY BOTTOM INPUT FOR CONTINUING CONVERSATIONS */}
        {hasMessages && (
          <div className="pt-3 border-t border-neutral-900 w-full max-w-3xl mx-auto select-none">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-neutral-900/80 rounded-[16px] border border-neutral-800 p-2 focus-within:border-neutral-700 transition-all">
              <input
                type="text"
                className="flex-1 bg-transparent text-neutral-200 placeholder-neutral-500 text-xs py-1.5 px-2 focus:outline-none"
                placeholder={isStreaming ? "Streaming live outputs..." : loading ? "Resolving parallel generations..." : "Prompt both models simultaneously..."}
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
    </div>
  );
}
