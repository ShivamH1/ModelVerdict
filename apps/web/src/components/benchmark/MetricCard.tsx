"use client";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, description, children, className }: MetricCardProps) {
  return (
    <div className={cn("bg-[#121212]/80 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between h-44 shadow-md print:bg-white print:border-neutral-300 print:text-black", className)}>
      <div>
        <div className="flex justify-between items-center">
          <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-500 print:text-neutral-600">{title}</span>
        </div>
        <h3 className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
          {description}
        </h3>
      </div>
      <div className="mt-3">
        {children}
      </div>
    </div>
  );
}
