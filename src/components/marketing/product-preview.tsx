"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { DotMap } from "@/components/dot-map";
import type { CareerPath } from "@/lib/catalog";

/**
 * A product window that starts tilted back in 3D and settles flat as it
 * scrolls into view, revealing a live, interactive dot map.
 */
export function ProductPreview({ path, domainName }: { path: CareerPath; domainName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 25%"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const glow = useTransform(scrollYProgress, [0, 1], [0.2, 1]);

  return (
    <div ref={ref} className="relative mx-auto mt-14 max-w-4xl [perspective:1400px]">
      <motion.div
        aria-hidden
        className="absolute inset-x-[10%] -top-10 -bottom-10 -z-10 rounded-full bg-primary/20 blur-3xl"
        style={{ opacity: reduce ? 1 : glow }}
      />
      <motion.div
        style={reduce ? undefined : { rotateX, scale, y, transformOrigin: "50% 0%" }}
        className="rounded-2xl border bg-card p-1.5 shadow-2xl shadow-foreground/10"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-green-400/80" />
          </span>
          <span className="mx-auto hidden rounded-md border bg-muted/60 px-3 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
            destinydots.com/resources/{path.domainTag}/{path.slug}
          </span>
        </div>
        <div className="rounded-xl border bg-background p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <div>
              <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">{domainName}</p>
              <p className="text-xl font-semibold tracking-tight">{path.title}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {path.dots.length} dots · {path.duration}
            </p>
          </div>
          <DotMap path={path} limit={5} />
        </div>
      </motion.div>
    </div>
  );
}
