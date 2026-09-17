"use client";

import { useEffect, useState, useId } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard for theme-dependent UI
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Icon button that flips between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={label}
          className={cn(
            "relative flex size-9 items-center justify-center overflow-hidden rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? "moon" : "sun"}
              initial={{ y: 14, rotate: -60, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: -14, rotate: 60, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex"
            >
              {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** Three-way segmented control: Light · Dark · System. */
export function ThemeSegmented({ className, fullWidth = false }: { className?: string; fullWidth?: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  // Unique per instance so two switchers on one page don't animate into each other.
  const pillId = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(fullWidth ? "grid w-full grid-cols-3" : "inline-flex", "rounded-full border bg-muted/60 p-0.5", className)}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "relative isolate flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 -z-10 rounded-full bg-background shadow-sm ring-1 ring-border"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export { useMounted };
