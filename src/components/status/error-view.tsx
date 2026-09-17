"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, RotateCcw, ServerCrash } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";

/** Body for error boundaries — retry, go somewhere safe, and a reference ID for support. */
export function ErrorView({
  error,
  reset,
  compact = false,
  homeHref = "/",
  homeLabel = "Go home",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  compact?: boolean;
  homeHref?: string;
  homeLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      compact={compact}
      tone="error"
      icon={ServerCrash}
      code={offline ? "You're offline" : "Error 500"}
      title={offline ? "No internet connection" : "Something went wrong on our side"}
      description={
        offline
          ? "Check your connection and try again — your progress is saved."
          : "It's not you. The problem has been logged; trying again usually fixes it. Your progress and purchases are safe."
      }
      actions={
        <>
          <Button size="lg" className="h-11 rounded-full px-6" onClick={() => reset()}>
            <RotateCcw data-icon="inline-start" /> Try again
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
        </>
      }
    >
      {error.digest && (
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(error.digest!);
            setCopied(true);
          }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          title="Copy reference ID"
        >
          Reference: {error.digest}
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </StatusScreen>
  );
}
