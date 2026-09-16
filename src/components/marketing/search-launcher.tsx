"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "@/components/command-menu";
import { cn } from "@/lib/utils";

/** Big glassy "search bar" that opens the command palette. */
export function SearchLauncher({ className }: { className?: string }) {
  const { open } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "group flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-4 text-left text-white/55 shadow-[0_0_40px_-12px_rgba(167,139,250,0.7)] backdrop-blur-md transition hover:border-violet-400/60 hover:text-white/80",
        className,
      )}
    >
      <Search className="size-5 text-violet-300" aria-hidden />
      <span className="flex-1">Search “ethical hacking”, “SQL”, “Unity”…</span>
      <kbd className="hidden rounded-md border border-white/15 px-2 py-0.5 font-mono text-xs sm:inline">Ctrl K</kbd>
    </button>
  );
}
