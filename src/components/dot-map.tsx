"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  ChevronRight,
  CirclePlay,
  Clock,
  FileText,
  FolderKanban,
  Link2,
  ListChecks,
  Lock,
  type LucideIcon,
} from "lucide-react";
import type { CareerPath, Dot, Resource, ResourceType } from "@/lib/catalog";
import { pathHref } from "@/lib/catalog";
import type { Prices } from "@/lib/pricing";
import { PaywallModal, type PaywallTarget } from "@/components/paywall-modal";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const resourceIcons: Record<ResourceType, LucideIcon> = {
  video: CirclePlay,
  doc: FileText,
  project: FolderKanban,
  quiz: ListChecks,
  link: Link2,
};

/**
 * The core visual: a vertical, subway-style timeline of dots. The whole map is
 * always visible — locked dots included — so students see where they're going.
 *
 * Visitor behaviour: free dots expand to show their resources; opening a
 * resource asks for a free account; locked dots / premium resources open the
 * paywall.
 */
export function DotMap({
  path,
  limit,
  defaultOpen = 1,
  prices,
}: {
  path: CareerPath;
  prices?: Prices;
  /** Show only the first N dots (landing preview). */
  limit?: number;
  /** Order of the dot expanded initially. */
  defaultOpen?: number | null;
}) {
  const [expanded, setExpanded] = useState<number | null>(defaultOpen);
  const [paywall, setPaywall] = useState<PaywallTarget | null>(null);
  const [authPrompt, setAuthPrompt] = useState<Resource | null>(null);

  const href = pathHref(path);
  const visible = limit ? path.dots.slice(0, limit) : path.dots;
  const hidden = path.dots.length - visible.length;

  const openPaywall = (dot: Dot) =>
    setPaywall({ pathTitle: path.title, pathHref: href, pathSlug: path.slug, dotOrder: dot.order, dotTitle: dot.title });

  return (
    <>
      <ol className="relative">
        {visible.map((dot, i) => {
          const isLast = i === visible.length - 1 && hidden === 0;
          const isOpen = expanded === dot.order && dot.isFree;
          const nextIsFree = path.dots[i + 1]?.isFree;

          return (
            <li key={dot.order} className="relative flex gap-4 sm:gap-5">
              {/* Rail */}
              <div className="relative flex w-9 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "relative z-10 mt-3 flex size-9 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    dot.isFree
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                      : "border-2 border-locked bg-card text-muted-foreground",
                    
                  )}
                  aria-hidden
                >
                  {dot.isFree ? dot.order : <Lock className="size-3.5" />}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      "absolute top-12 bottom-0 w-0.5",
                      dot.isFree && nextIsFree ? "bg-primary/60" : "bg-[repeating-linear-gradient(to_bottom,var(--locked)_0_4px,transparent_4px_9px)]",
                    )}
                    aria-hidden
                  />
                )}
              </div>

              {/* Card */}
              <div className="min-w-0 flex-1 pb-4">
                <button
                  type="button"
                  onClick={() => (dot.isFree ? setExpanded(isOpen ? null : dot.order) : openPaywall(dot))}
                  aria-expanded={dot.isFree ? isOpen : undefined}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden",
                    dot.isFree ? "hover:border-primary/40 hover:shadow-sm" : "hover:bg-muted/50",
                    isOpen && "rounded-b-none border-primary/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        Dot {String(dot.order).padStart(2, "0")}
                      </span>
                      {dot.isFree ? (
                        <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/25 ring-inset">
                          FREE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          <Lock className="size-3" aria-hidden /> LOCKED
                        </span>
                      )}
                      {dot.certification && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-500/25 ring-inset dark:text-amber-400">
                          <Award className="size-3" aria-hidden /> Certification
                        </span>
                      )}
                    </div>
                    <p className={cn("mt-1.5 font-semibold", !dot.isFree && "text-foreground/75")}>{dot.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{dot.description}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden /> ~{dot.hours}h
                      </span>
                      <span>{dot.resourceCount} resources</span>
                      {dot.hasCheckpoint && <span>Checkpoint quiz</span>}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90 text-primary",
                    )}
                    aria-hidden
                  />
                </button>

                {isOpen && dot.resources && (
                  <ul className="divide-y rounded-b-xl border border-t-0 border-primary/40 bg-card">
                    {dot.resources.map((res) => {
                      const Icon = resourceIcons[res.type];
                      return (
                        <li key={res.title}>
                          <button
                            type="button"
                            onClick={() => (res.isPremium ? openPaywall(dot) : setAuthPrompt(res))}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-hidden"
                          >
                            <Icon
                              className={cn("size-5 shrink-0", res.isPremium ? "text-muted-foreground" : "text-primary")}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{res.title}</span>
                              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                                {res.type} · {res.duration}
                              </span>
                            </span>
                            {res.isPremium ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                <Lock className="size-3" aria-hidden /> PREMIUM
                              </span>
                            ) : (
                              <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">
                                FREE
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <div className="flex gap-4 sm:gap-5">
          <div className="flex w-9 shrink-0 justify-center" aria-hidden>
            <span className="flex gap-1 pt-2">
              <span className="size-1.5 rounded-full bg-locked" />
              <span className="size-1.5 rounded-full bg-locked" />
              <span className="size-1.5 rounded-full bg-locked" />
            </span>
          </div>
          <Link href={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            +{hidden} more dots — see the full {path.title} path
          </Link>
        </div>
      )}

      <PaywallModal target={paywall} prices={prices} onOpenChange={(o) => !o && setPaywall(null)} />

      <ResponsiveModal
        open={authPrompt !== null}
        onOpenChange={(o) => !o && setAuthPrompt(null)}
        title="Open free resources"
        description="Create a free account to open resources, track progress and bookmark what you find useful."
      >
        {authPrompt && (
          <div className="space-y-3">
            <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">
              <span className="font-medium">{authPrompt.title}</span>
              <span className="text-muted-foreground"> · {authPrompt.duration}</span>
            </p>
            <Button asChild size="lg" className="h-10 w-full">
              <Link href={`/signup?next=${encodeURIComponent(href)}`}>Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-10 w-full">
              <Link href={`/login?next=${encodeURIComponent(href)}`}>Log in</Link>
            </Button>
          </div>
        )}
      </ResponsiveModal>
    </>
  );
}
