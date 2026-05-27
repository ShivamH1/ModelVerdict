"use client";

import React, { useEffect } from "react";
import { AlertCircle, X, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  message: string;
  type?: "error" | "warning" | "success" | "info";
  onClose: () => void;
  duration?: number;
}

export function Alert({ message, type = "error", onClose, duration = 5000 }: AlertProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    error: {
      bg: "bg-red-950/80 border-red-500/30 text-red-200",
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
      text: "text-red-400"
    },
    warning: {
      bg: "bg-amber-950/80 border-amber-500/30 text-amber-200",
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      text: "text-amber-400"
    },
    success: {
      bg: "bg-emerald-950/80 border-emerald-500/30 text-emerald-200",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      text: "text-emerald-400"
    },
    info: {
      bg: "bg-neutral-900/90 border-neutral-800 text-neutral-200",
      icon: <Info className="w-4 h-4 text-neutral-400" />,
      text: "text-neutral-400"
    }
  };

  const currentStyle = styles[type];

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={cn(
          "border rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-md max-w-sm transition-all select-none",
          currentStyle.bg
        )}
      >
        <div className="shrink-0">{currentStyle.icon}</div>
        <div className="flex-1 text-[11px] font-mono leading-relaxed break-words pr-2">
          {message}
        </div>
        <button
          onClick={onClose}
          className={cn(
            "p-1 hover:bg-white/10 rounded-lg transition-all shrink-0 cursor-pointer",
            currentStyle.text
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
