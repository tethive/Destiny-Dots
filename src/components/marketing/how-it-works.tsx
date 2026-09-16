"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Award, Briefcase, Check, Lock } from "lucide-react";
import { DomainIcon } from "@/components/domain";
import { TiltCard } from "@/components/motion/tilt-card";
import type { DomainTag } from "@/lib/catalog";

const steps = [
  {
    title: "Pick your domain",
    body: "Tell us where you are and what excites you. We suggest two or three paths that fit your time and goals.",
    visual: <PickVisual />,
  },
  {
    title: "Follow the dots",
    body: "Each dot is one clear milestone with hand-picked resources and a checkpoint. Finish it and the next lights up.",
    visual: <DotsVisual />,
  },
  {
    title: "Land your role",
    body: "Paths end where employers start looking — certifications, portfolio projects and curated openings.",
    visual: <RoleVisual />,
  },
];

/** Three steps joined by a beam that fills as you scroll. */
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 60%"] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative mt-14">
      <div className="absolute top-24 right-[16%] left-[16%] hidden h-px bg-border md:block" aria-hidden>
        <motion.div
          className="h-full origin-left bg-linear-to-r from-primary via-primary to-brand-2"
          style={{ scaleX: reduce ? 1 : fill }}
        />
      </div>

      <ol className="grid gap-5 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title}>
            <TiltCard max={4} className="rounded-2xl">
              <div className="flex h-full flex-col rounded-2xl border bg-card p-2 shadow-xs">
                <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                  <div className="bg-dots absolute inset-0" aria-hidden />
                  <div className="relative [transform:translateZ(30px)]">{step.visual}</div>
                </div>
                <div className="p-4 pt-5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-medium text-primary-foreground">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </div>
            </TiltCard>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PickVisual() {
  const tags: { tag: DomainTag; label: string; on?: boolean }[] = [
    { tag: "cybersecurity", label: "Cyber", on: true },
    { tag: "ai-ml", label: "AI/ML" },
    { tag: "cloud-computing", label: "Cloud", on: true },
    { tag: "ar-vr", label: "AR/VR" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2" aria-hidden>
      {tags.map((t) => (
        <span
          key={t.tag}
          className={`flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-3 pl-1.5 text-xs font-medium shadow-sm ${t.on ? "border-primary/50 ring-2 ring-primary/15" : ""}`}
        >
          <DomainIcon tag={t.tag} className="size-6 rounded-md [&_svg]:size-3.5" />
          {t.label}
          {t.on && <Check className="ml-auto size-3.5 text-primary" />}
        </span>
      ))}
    </div>
  );
}

function DotsVisual() {
  return (
    <div className="flex items-center" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center">
          <span
            className={`flex size-8 items-center justify-center rounded-full border-2 shadow-sm ${
              i < 2
                ? "border-success bg-success text-white"
                : i === 2
                  ? "border-primary bg-card text-primary ring-4 ring-primary/15"
                  : "border-locked bg-card text-muted-foreground"
            }`}
          >
            {i < 2 ? <Check className="size-4" /> : i === 2 ? <span className="size-2 rounded-full bg-primary" /> : <Lock className="size-3" />}
          </span>
          {i < 4 && <span className={`h-0.5 w-5 ${i < 2 ? "bg-success" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function RoleVisual() {
  return (
    <div className="w-52 space-y-2" aria-hidden>
      <div className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
        <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Award className="size-4" />
        </span>
        <span className="text-xs font-medium">CompTIA Security+</span>
        <Check className="ml-auto size-3.5 text-success" />
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
          <Briefcase className="size-4" />
        </span>
        <span className="text-xs font-medium">SOC Analyst · Offer</span>
        <span className="ml-auto rounded-full bg-success/15 px-1.5 text-[10px] font-medium text-success">New</span>
      </div>
    </div>
  );
}
