import type { Metadata } from "next";
import "./globals.css";
import { Shield } from "lucide-react";
import Link from "next/link";

import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "ModelVerdict",
  description: "Swiss Modern Evaluation Standards for LLMs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col selection:bg-neutral-800 selection:text-white">
        {/* GLOBAL ULTRA-MINIMALIST UTILITY NAVIGATION BAR */}
        <header className="bg-neutral-900/60 border-b border-neutral-900 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5 shrink-0 print:hidden select-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Logo Minimal Identifier */}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-semibold tracking-tight text-neutral-100 flex items-center gap-1.5 font-serif italic">
                ModelVerdict
              </span>
            </Link>

            {/* Navigation Action tabs (Clean flat pills using dynamic Nav) */}
            <Nav />

            {/* Inline active status badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-neutral-950/40 rounded-full px-3 py-1 border border-neutral-900/60 text-neutral-500 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="uppercase tracking-wider font-semibold">
                Active Evaluator
              </span>
            </div>
          </div>
        </header>

        {/* PRIMARY VIEWER CONTAINER */}
        <main className="flex-1 flex flex-col relative print:p-0 print:bg-white print:text-black">
          {children}
        </main>

        {/* STANDARD PERSISTENT FOOTER */}
        <footer className="bg-neutral-950 border-t border-neutral-900/50 py-3 px-4 text-center text-[10px] text-neutral-600 font-mono uppercase tracking-widest shrink-0 print:hidden select-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>ModelVerdict • Swiss Modern Evaluation Standards</span>
            <div className="flex gap-3 items-center">
              <span className="flex items-center gap-1 text-neutral-500">
                <Shield className="w-3 h-3 text-neutral-600" />
                Guarded Nodes
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-neutral-500">
                Impartial Advisor Judge
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
