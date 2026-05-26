"use client";

import { Bot, BarChart3, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Chat Arena", icon: Bot },
    { href: "/benchmark", label: "Benchmark Studio", icon: BarChart3 },
    { href: "/logs", label: "Guardrail Logs", icon: Shield },
  ];

  return (
    <nav className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-900/80 font-mono text-[11px] font-medium leading-none shrink-0">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all text-2xs cursor-pointer",
              isActive
                ? "bg-neutral-800 text-neutral-100 font-semibold border-b border-neutral-700/40"
                : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", isActive ? "text-neutral-100" : "text-neutral-400")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
