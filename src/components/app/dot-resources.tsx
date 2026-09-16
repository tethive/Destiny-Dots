"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CirclePlay, Eye, FileText, FolderKanban, Link2, ListChecks, type LucideIcon } from "lucide-react";
import { BookmarkButton, UnlockButton } from "@/components/app/learn";
import { ResourceViewer, type ViewerResource } from "@/components/viewer/resource-viewer";
import { Button } from "@/components/ui/button";
import type { Prices } from "@/lib/pricing";

const icons: Record<string, LucideIcon> = { VIDEO: CirclePlay, DOC: FileText, PROJECT: FolderKanban, QUIZ: ListChecks, LINK: Link2 };

export type DotResourceItem = ViewerResource & {
  isPremium: boolean;
  isSample: boolean;
  locked: boolean;
  bookmarked: boolean;
  level?: string;
};

type UnlockTarget = React.ComponentProps<typeof UnlockButton>["target"];

export function DotResources({
  resources,
  unlock,
}: {
  resources: DotResourceItem[];
  unlock?: { target: UnlockTarget; prices: Prices; ownedDots: number };
}) {
  const reduce = useReducedMotion();
  const viewable = resources.filter((r) => !r.locked);
  const [index, setIndex] = useState<number | null>(null);
  const open = useCallback((id: string) => setIndex(viewable.findIndex((r) => r.id === id)), [viewable]);

  return (
    <>
      <ul className="space-y-3">
        {resources.map((r, i) => {
          const Icon = icons[r.type] ?? Link2;
          return (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors hover:border-primary/30 sm:p-4"
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${r.locked ? "bg-muted text-muted-foreground" : "d-soft"}`}>
                <Icon className="size-5" />
              </span>
              <button
                type="button"
                disabled={r.locked}
                onClick={() => open(r.id)}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <p className="truncate font-medium group-hover:text-primary">{r.title}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono uppercase">{r.type.toLowerCase()}</span>
                  {r.duration && <span>· {r.duration}</span>}
                  {r.level && <span>· {r.level}</span>}
                  {r.isPremium && <span className="rounded-full bg-primary/10 px-1.5 font-medium text-primary">Premium</span>}
                  {r.isSample && <span className="rounded-full bg-amber-500/12 px-1.5 font-medium text-amber-700 dark:text-amber-400">Sample link</span>}
                </p>
              </button>
              {r.locked ? (
                unlock ? (
                  <UnlockButton variant="outline" label="Unlock" target={unlock.target} prices={unlock.prices} ownedDots={unlock.ownedDots} />
                ) : (
                  <span className="text-xs text-muted-foreground">Pro</span>
                )
              ) : (
                <>
                  <BookmarkButton resourceId={r.id} bookmarked={r.bookmarked} />
                  <Button size="lg" variant="outline" className="rounded-full" onClick={() => open(r.id)}>
                    <Eye data-icon="inline-start" /> View
                  </Button>
                </>
              )}
            </motion.li>
          );
        })}
      </ul>
      <ResourceViewer
        resources={viewable}
        index={index}
        onIndexChange={setIndex}
        actions={(r) => {
          const item = viewable.find((v) => v.id === r.id);
          return item ? <BookmarkButton key={r.id} resourceId={r.id} bookmarked={item.bookmarked} /> : null;
        }}
      />
    </>
  );
}
