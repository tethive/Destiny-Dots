"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Bookmark, Check, CheckCircle2, ChevronRight, Clock, ListChecks, LoaderCircle, Lock, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { UnlockDialog, type Prices, type UnlockTarget } from "@/components/app/unlock-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { enrol, leavePath, setDotComplete, submitQuiz, toggleBookmark } from "@/server/actions/student";

/* -------------------------------------------------------------------------- */

export function EnrolButton({ pathId, enrolled }: { pathId: string; enrolled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (enrolled) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="rounded-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await leavePath(pathId);
            if (res.ok) toast.success(res.message);
            router.refresh();
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Check />} Enrolled
      </Button>
    );
  }
  return (
    <Button
      size="lg"
      className="h-10 rounded-full px-5 shadow-lg shadow-primary/20"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await enrol(pathId);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending && <LoaderCircle className="animate-spin" />} Enrol free
    </Button>
  );
}

/* -------------------------------------------------------------------------- */

export type LearnDot = {
  id: string;
  order: number;
  title: string;
  description: string;
  hours: number;
  isFree: boolean;
  certification: string | null;
  resourceCount: number;
  questionCount: number;
  canOpen: boolean;
  completed: boolean;
};

/** Full dot map for signed-in students: completed, current, open and locked states. */
export function LearnDotList({
  slug,
  pathId,
  pathTitle,
  dots,
  prices,
  ownedDots,
}: {
  slug: string;
  pathId: string;
  pathTitle: string;
  dots: LearnDot[];
  prices: Prices;
  ownedDots: number;
}) {
  const [target, setTarget] = useState<UnlockTarget | null>(null);
  const currentOrder = dots.find((d) => !d.completed && d.canOpen)?.order;

  return (
    <>
      <ol>
        {dots.map((dot, i) => {
          const current = dot.order === currentOrder;
          const next = dots[i + 1];
          const body = (
            <div
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs transition-colors",
                dot.canOpen ? "hover:border-primary/40" : "hover:bg-muted/40",
                current && "border-primary/50 ring-4 ring-primary/10",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                    Dot {String(dot.order).padStart(2, "0")}
                  </span>
                  {dot.completed ? (
                    <Tag className="bg-success/12 text-success">Completed</Tag>
                  ) : current ? (
                    <Tag className="bg-primary/12 text-primary">Up next</Tag>
                  ) : dot.isFree ? (
                    <Tag className="bg-success/12 text-success">Free</Tag>
                  ) : !dot.canOpen ? (
                    <Tag className="bg-muted text-muted-foreground">
                      <Lock className="size-3" /> Locked
                    </Tag>
                  ) : null}
                  {dot.certification && (
                    <Tag className="bg-amber-500/12 text-amber-700 dark:text-amber-400">
                      <Award className="size-3" /> Certification
                    </Tag>
                  )}
                </div>
                <p className={cn("mt-1.5 font-semibold", !dot.canOpen && "text-foreground/75")}>{dot.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{dot.description}</p>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> ~{dot.hours}h
                  </span>
                  <span>{dot.resourceCount} resources</span>
                  {dot.questionCount > 0 && <span>Checkpoint · {dot.questionCount} questions</span>}
                </p>
              </div>
              <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
            </div>
          );

          return (
            <li key={dot.id} className="relative flex gap-4">
              <div className="relative flex w-9 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "relative z-10 mt-4 flex size-9 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    dot.completed && "bg-success text-white",
                    !dot.completed && current && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !dot.completed && !current && dot.canOpen && "border-2 border-primary/50 bg-card text-primary",
                    !dot.canOpen && "border-2 border-locked bg-card text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {dot.completed ? <Check className="size-4" strokeWidth={3} /> : dot.canOpen ? dot.order : <Lock className="size-3.5" />}
                </span>
                {next && (
                  <span
                    className={cn(
                      "absolute top-13 bottom-0 w-0.5",
                      dot.completed ? "bg-success/60" : "bg-[repeating-linear-gradient(to_bottom,var(--locked)_0_4px,transparent_4px_9px)]",
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-3">
                {dot.canOpen ? (
                  <Link href={`/learn/${slug}/${dot.order}`} className="block rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden">
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden"
                    onClick={() => setTarget({ pathId, pathTitle, dotId: dot.id, dotOrder: dot.order, dotTitle: dot.title })}
                  >
                    {body}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <UnlockDialog target={target} prices={prices} ownedDots={ownedDots} onOpenChange={(o) => !o && setTarget(null)} />
    </>
  );
}

function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

/* -------------------------------------------------------------------------- */

export function UnlockButton({
  target,
  prices,
  ownedDots,
  label,
  variant = "default",
  className,
}: {
  target: UnlockTarget;
  prices: Prices;
  ownedDots: number;
  label: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" variant={variant} className={cn("h-10 rounded-full", className)} onClick={() => setOpen(true)}>
        <Lock data-icon="inline-start" /> {label}
      </Button>
      <UnlockDialog target={open ? target : null} prices={prices} ownedDots={ownedDots} onOpenChange={setOpen} />
    </>
  );
}

export function CompleteButton({ dotId, completed, className }: { dotId: string; completed: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="lg"
      variant={completed ? "outline" : "default"}
      className={cn("h-10 rounded-full px-5", !completed && "shadow-lg shadow-primary/20", className)}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setDotComplete(dotId, !completed);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : completed ? <RotateCcw /> : <CheckCircle2 />}
      {completed ? "Mark as not complete" : "Mark as complete"}
    </Button>
  );
}

export function BookmarkButton({ resourceId, bookmarked }: { resourceId: string; bookmarked: boolean }) {
  const [on, setOn] = useState(bookmarked);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove bookmark" : "Bookmark resource"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          const res = await toggleBookmark(resourceId);
          if (!res.ok) {
            setOn(on);
            toast.error(res.error);
          }
        })
      }
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-muted",
        on ? "border-primary/40 text-primary" : "text-muted-foreground",
      )}
    >
      <Bookmark className={cn("size-4", on && "fill-current")} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */

type Question = { id: string; prompt: string; options: string[] };

export function Checkpoint({
  dotId,
  questions,
  lastAttempt,
}: {
  dotId: string;
  questions: Question[];
  lastAttempt: { score: number; total: number; passed: boolean } | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => questions.map(() => undefined));
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; correct: number[]; explanations: (string | null)[] } | null>(null);
  const [pending, start] = useTransition();
  const allAnswered = answers.every((a) => a !== undefined);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="size-5 text-primary" /> Checkpoint
        </h2>
        {lastAttempt && !result && (
          <span className={cn("text-sm", lastAttempt.passed ? "text-success" : "text-muted-foreground")}>
            Last attempt: {lastAttempt.score}/{lastAttempt.total} {lastAttempt.passed ? "· passed" : ""}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Score 70% or more to pass — passing marks this dot complete.</p>

      <ol className="mt-5 space-y-6">
        {questions.map((q, qi) => (
          <li key={q.id}>
            <p className="font-medium">
              {qi + 1}. {q.prompt}
            </p>
            <div className="mt-3 grid gap-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const isCorrect = result && result.correct[qi] === oi;
                const isWrong = result && chosen && result.correct[qi] !== oi;
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                      chosen && !result && "border-primary bg-primary/5",
                      isCorrect && "border-success bg-success/10",
                      isWrong && "border-destructive bg-destructive/10",
                      result && "cursor-default",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      className="accent-[var(--primary)]"
                      checked={chosen}
                      disabled={Boolean(result)}
                      onChange={() => setAnswers((cur) => cur.map((a, i) => (i === qi ? oi : a)))}
                    />
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <CheckCircle2 className="size-4 text-success" />}
                    {isWrong && <XCircle className="size-4 text-destructive" />}
                  </label>
                );
              })}
            </div>
            {result?.explanations[qi] && <p className="mt-2 text-sm text-muted-foreground">{result.explanations[qi]}</p>}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {result ? (
          <>
            <p className={cn("font-semibold", result.passed ? "text-success" : "text-destructive")}>
              {result.passed ? "Passed" : "Not quite"} — {result.score}/{result.total}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              onClick={() => {
                setResult(null);
                setAnswers(questions.map(() => undefined));
              }}
            >
              <RotateCcw /> Try again
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            className="h-10 rounded-full px-5"
            disabled={!allAnswered || pending}
            onClick={() =>
              start(async () => {
                const res = await submitQuiz(dotId, answers as number[]);
                if (!res.ok) return void toast.error(res.error);
                setResult({ score: res.score!, total: res.total!, passed: res.passed!, correct: res.correct!, explanations: res.explanations! });
                if (res.passed) toast.success("Checkpoint passed — dot complete!");
                router.refresh();
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Submit answers
          </Button>
        )}
      </div>
    </section>
  );
}
