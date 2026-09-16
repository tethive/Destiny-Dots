"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Check, Clock, Compass, GraduationCap, Hourglass, LoaderCircle, Rocket, School } from "lucide-react";
import { toast } from "sonner";
import { DomainIcon } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { domains } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { saveOnboarding, skipOnboarding } from "@/server/actions/student";

type Stage = "STUDENT" | "FRESH_GRADUATE" | "WORKING_PROFESSIONAL";
type Weekly = "UNDER_5" | "FIVE_TO_TEN" | "OVER_10";
type Goal = "THREE_MONTHS" | "SIX_MONTHS" | "ONE_YEAR" | "EXPLORING";

const stages: { value: Stage; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "STUDENT", label: "Student", hint: "Still in school or college", icon: School },
  { value: "FRESH_GRADUATE", label: "Fresh graduate", hint: "Graduated in the last two years", icon: GraduationCap },
  { value: "WORKING_PROFESSIONAL", label: "Working professional", hint: "Switching or levelling up", icon: Briefcase },
];
const weekly: { value: Weekly; label: string; hint: string }[] = [
  { value: "UNDER_5", label: "Under 5 hours", hint: "A steady side commitment" },
  { value: "FIVE_TO_TEN", label: "5–10 hours", hint: "Serious, consistent progress" },
  { value: "OVER_10", label: "10+ hours", hint: "Fast-track mode" },
];
const goals: { value: Goal; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "THREE_MONTHS", label: "3 months", icon: Rocket },
  { value: "SIX_MONTHS", label: "6 months", icon: Clock },
  { value: "ONE_YEAR", label: "1 year", icon: Hourglass },
  { value: "EXPLORING", label: "Just exploring", icon: Compass },
];

export function OnboardingQuiz({
  firstName,
  next,
  initial,
}: {
  firstName: string;
  next?: string;
  initial: { stage?: Stage; domainInterests: string[]; weeklyTime?: Weekly; goalTimeline?: Goal };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState<Stage | undefined>(initial.stage);
  const [interests, setInterests] = useState<string[]>(initial.domainInterests);
  const [time, setTime] = useState<Weekly | undefined>(initial.weeklyTime);
  const [goal, setGoal] = useState<Goal | undefined>(initial.goalTimeline);
  const [pending, start] = useTransition();

  const canContinue = [Boolean(stage), interests.length > 0, Boolean(time), Boolean(goal)][step];
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";

  function finish() {
    start(async () => {
      const res = await saveOnboarding({ stage: stage!, domainInterests: interests, weeklyTime: time!, goalTimeline: goal! });
      if (!res.ok) return void toast.error(res.error);
      router.push(`/onboarding/recommendations${suffix}`);
    });
  }

  function skip() {
    start(async () => {
      await skipOnboarding();
      router.push(next ?? "/explore");
    });
  }

  const titles = [
    `Hi ${firstName}! Where are you right now?`,
    "Which domains excite you?",
    "How much time can you give each week?",
    "When do you want to be job-ready?",
  ];

  return (
    <div className="mx-auto max-w-2xl pt-6 sm:pt-12">
      <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                i < step ? "border-success bg-success text-white" : i === step ? "border-primary text-primary" : "border-locked text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            {i < 3 && <span className={cn("h-0.5 flex-1 rounded-full transition-colors", i < step ? "bg-success" : "bg-border")} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="mt-10"
        >
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance">{titles[step]}</h1>
          <p className="mt-2 text-muted-foreground">
            {step === 1 ? "Pick as many as you like — we'll prioritise paths in these domains." : "This helps us recommend the right starting point."}
          </p>

          <div className="mt-8">
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {stages.map((s) => (
                  <Choice key={s.value} selected={stage === s.value} onClick={() => setStage(s.value)}>
                    <s.icon className="size-6 text-primary" />
                    <span className="mt-3 block font-semibold">{s.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{s.hint}</span>
                  </Choice>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {domains.map((d) => {
                  const on = interests.includes(d.tag);
                  return (
                    <Choice
                      key={d.tag}
                      selected={on}
                      onClick={() => setInterests((cur) => (on ? cur.filter((t) => t !== d.tag) : [...cur, d.tag]))}
                      className="flex items-center gap-3 p-3"
                    >
                      <DomainIcon tag={d.tag} className="size-9 [&_svg]:size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{d.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{d.tagline}</span>
                      </span>
                    </Choice>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {weekly.map((w) => (
                  <Choice key={w.value} selected={time === w.value} onClick={() => setTime(w.value)}>
                    <span className="block text-lg font-semibold">{w.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{w.hint}</span>
                  </Choice>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {goals.map((g) => (
                  <Choice key={g.value} selected={goal === g.value} onClick={() => setGoal(g.value)} className="text-center">
                    <g.icon className="mx-auto size-6 text-primary" />
                    <span className="mt-3 block font-semibold">{g.label}</span>
                  </Choice>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)} disabled={pending}>
              <ArrowLeft data-icon="inline-start" /> Back
            </Button>
          )}
          <button type="button" onClick={skip} disabled={pending} className="text-sm text-muted-foreground hover:text-foreground">
            Skip and browse all paths
          </button>
        </div>
        <Button
          size="lg"
          className="h-11 rounded-full px-6"
          disabled={!canContinue || pending}
          onClick={() => (step < 3 ? setStep(step + 1) : finish())}
        >
          {pending && <LoaderCircle className="animate-spin" />}
          {step < 3 ? "Continue" : "See my recommendations"}
          {!pending && <ArrowRight data-icon="inline-end" />}
        </Button>
      </div>
    </div>
  );
}

function Choice({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative rounded-2xl border bg-card p-5 text-left shadow-xs transition-all hover:border-primary/40",
        selected && "border-primary ring-4 ring-primary/15",
        className,
      )}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}
