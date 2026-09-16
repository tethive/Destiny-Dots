"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Award, Check, ChevronRight } from "lucide-react";
import { DomainIcon } from "@/components/domain";
import { GridBackdrop } from "@/components/effects/orbit";
import { SplitText } from "@/components/motion/reveal";
import { ProgressRing } from "@/components/progress-ring";
import { Globe } from "@/components/three/globe";
import { Button } from "@/components/ui/button";
import { domains } from "@/lib/catalog";
import type { DomainCounts } from "@/server/catalog";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHero({ stats, domainCounts }: { stats: { domains: number; paths: number; dots: number }; domainCounts: DomainCounts }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setActive((i) => (i + 1) % domains.length), 3400);
    return () => clearInterval(id);
  }, [reduce]);

  const domain = domains[active];
  const { paths: pathCount, dots } = domainCounts[domain.tag] ?? { paths: 0, dots: 0 };

  const fade = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease, delay } };

  return (
    <section className="relative isolate -mt-16 overflow-hidden border-b pt-16">
      <GridBackdrop />

      <div className="container-page grid items-center gap-6 pt-12 pb-16 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-4 lg:py-10">
        {/* Copy */}
        <div className="relative z-10">
          <motion.div {...fade(0.05)}>
            <Link
              href="/resources"
              className="group inline-flex items-center gap-2 rounded-full border bg-background/70 py-1 pr-3 pl-1 text-xs backdrop-blur transition-colors hover:border-primary/40 sm:text-sm"
            >
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">New</span>
              <span className="text-muted-foreground">
                {stats.domains} domains · {stats.paths} career paths
              </span>
              <ChevronRight className="size-3.5 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </motion.div>

          <h1 className="mt-6 text-[clamp(2.6rem,6.4vw,4.6rem)] leading-[1.02] font-semibold tracking-[-0.045em]">
            <SplitText text="Find your path." delay={0.1} />
            <br />
            <SplitText text="Connect the dots." wordClassName="text-brand-gradient" delay={0.25} />
          </h1>

          <motion.p {...fade(0.4)} className="mt-6 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">
            Structured career roadmaps across {stats.domains} tech domains — from cybersecurity and AI to 5G and AR/VR.
            Every milestone mapped. Every resource hand-picked.
          </motion.p>

          <motion.div {...fade(0.5)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 rounded-full px-6 text-[0.95rem] shadow-lg shadow-primary/25">
              <Link href="/signup">
                Start free <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6 text-[0.95rem]">
              <Link href="/resources">Explore resources</Link>
            </Button>
          </motion.div>

          <motion.ul {...fade(0.6)} className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {["First 2 dots free", "No card required", "UPI supported"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* 3D globe with floating product cards */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease, delay: 0.15 }}
          className="relative mx-auto aspect-square w-full max-w-[560px] lg:max-w-none"
        >
          <Globe activeIndex={active} className="absolute inset-0" />

          {/* Active domain card */}
          <div className="absolute bottom-[8%] left-0 w-[min(250px,62%)] animate-float motion-reduce:animate-none sm:left-[2%]">
            <div className="surface-glass rounded-2xl p-3.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Now exploring</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={domain.tag}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="mt-2 flex items-center gap-3"
                >
                  <DomainIcon tag={domain.tag} className="size-9 [&_svg]:size-4" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{domain.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pathCount} {pathCount === 1 ? "path" : "paths"} · {dots} dots
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="mt-3 flex gap-1" aria-hidden>
                {domains.map((d, i) => (
                  <span key={d.tag} className={`h-1 flex-1 rounded-full transition-colors ${i === active ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Continue learning card */}
          <div
            className="absolute top-[10%] right-0 hidden w-[230px] animate-float motion-reduce:animate-none sm:block"
            style={{ animationDelay: "-3.5s" }}
          >
            <div className="surface-glass flex items-center gap-3 rounded-2xl p-3.5">
              <ProgressRing value={20} size={44} stroke={4} label="2/10" barClassName="stroke-success" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Continue learning</p>
                <p className="truncate text-sm font-semibold">SQL basics</p>
                <p className="text-[11px] text-muted-foreground">Data Analyst · Dot 2</p>
              </div>
            </div>
          </div>

          {/* Certification chip */}
          <div
            className="absolute right-[6%] bottom-[22%] hidden animate-float motion-reduce:animate-none md:block"
            style={{ animationDelay: "-1.8s" }}
          >
            <div className="surface-glass flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Award className="size-3.5" aria-hidden />
              </span>
              <span className="text-xs font-medium">AWS SAA-C03 milestone</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
