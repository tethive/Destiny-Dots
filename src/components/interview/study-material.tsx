"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Dumbbell, ExternalLink, FileText, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StudyMaterial = {
  id: string;
  round: "APTITUDE" | "TECHNICAL" | "CODING";
  kind: "VIDEO" | "DOC" | "PRACTICE" | "LINK";
  title: string;
  description: string | null;
  source: string | null;
  url: string;
  /** Set when the link can play inside the app (YouTube and friends). */
  embedSrc: string | null;
};

const icons = { VIDEO: PlayCircle, DOC: FileText, PRACTICE: Dumbbell, LINK: BookOpen };
const kindLabels = { VIDEO: "Video", DOC: "Notes", PRACTICE: "Practice", LINK: "Guide" };

/**
 * Hand-picked prep material. Videos play in place; everything else opens at
 * the source, so credit (and traffic) stays with whoever made it.
 */
export function StudyMaterialList({ items }: { items: StudyMaterial[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!items.length) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((m) => {
        const Icon = icons[m.kind];
        const open = playing === m.id;
        return (
          <li key={m.id} className={cn("rounded-2xl border bg-card p-4 shadow-xs", open && "sm:col-span-2")}>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{m.title}</h3>
                  <Badge variant="secondary" className="shrink-0">
                    {kindLabels[m.kind]}
                  </Badge>
                </div>
                {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {m.embedSrc ? (
                    <button
                      type="button"
                      onClick={() => setPlaying(open ? null : m.id)}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      aria-expanded={open}
                    >
                      {open ? "Hide video" : "Watch here"}
                      <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                    </button>
                  ) : null}
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {m.source ? `Open on ${m.source}` : "Open"} <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {open && m.embedSrc && (
              <div className="mt-3 aspect-video overflow-hidden rounded-xl border bg-black">
                <iframe
                  src={m.embedSrc}
                  title={m.title}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="size-full"
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
