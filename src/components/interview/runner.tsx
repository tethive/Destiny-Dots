"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Clock, CornerDownRight, Flag, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { finishInterview, submitAnswer, submitFollowUp } from "@/server/actions/interview";

export type RunnerQuestion = {
  order: number;
  kind: "MCQ" | "SHORT_ANSWER" | "CODING";
  prompt: string;
  options: string[];
  language: string | null;
  starterCode: string | null;
  hints: string[];
  topic: string | null;
  answeredAt: string | null;
  score: number;
  maxScore: number;
  feedback: string | null;
  followUp: string | null;
  followUpText: string | null;
  modelAnswer: string | null;
};

type Props = {
  sessionId: string;
  roundLabel: string;
  totalMinutes: number;
  startedAt: string;
  questions: RunnerQuestion[];
};

/** Time left in the round, counted from when the session was created. */
function useCountdown(startedAt: string, totalMinutes: number) {
  const deadline = new Date(startedAt).getTime() + totalMinutes * 60_000;
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (left === null) return { label: "—", over: false };
  return { label: `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`, over: left === 0 };
}

export function InterviewRunner({ sessionId, roundLabel, totalMinutes, startedAt, questions }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(questions);
  const firstOpen = items.findIndex((q) => !q.answeredAt);
  const [index, setIndex] = useState(firstOpen === -1 ? items.length - 1 : firstOpen);
  const [pending, start] = useTransition();
  const timer = useCountdown(startedAt, totalMinutes);

  const question = items[index];
  const allAnswered = items.every((i) => i.answeredAt);
  const patch = (order: number, changes: Partial<RunnerQuestion>) => setItems((rows) => rows.map((r) => (r.order === order ? { ...r, ...changes } : r)));

  const answer = (payload: { text?: string; index?: number | null; secondsSpent: number }) =>
    start(async () => {
      const res = await submitAnswer({ sessionId, order: question.order, ...payload });
      if (!res.ok) return void toast.error(res.error);
      patch(question.order, {
        answeredAt: new Date().toISOString(),
        followUp: res.followUp ?? null,
        score: res.score ?? 0,
        feedback: res.feedback ?? null,
        modelAnswer: res.modelAnswer ?? null,
      });
      router.refresh();
    });

  const reply = (text: string) =>
    start(async () => {
      const res = await submitFollowUp({ sessionId, order: question.order, text });
      if (!res.ok) return void toast.error(res.error);
      patch(question.order, { followUpText: text, score: res.score ?? question.score, feedback: res.feedback ?? question.feedback });
      router.refresh();
    });

  const finish = () =>
    start(async () => {
      const res = await finishInterview(sessionId);
      if (res && !res.ok) toast.error(res.error);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{roundLabel} round</Badge>
          <span className="text-sm text-muted-foreground">
            Question {index + 1} of {items.length}
          </span>
        </div>
        <span className={cn("flex items-center gap-1.5 text-sm tabular-nums", timer.over ? "font-medium text-destructive" : "text-muted-foreground")}>
          <Clock className="size-4" /> {timer.over ? "Time's up — finish when ready" : `${timer.label} left`}
        </span>
      </div>

      <div className="flex gap-1.5" aria-hidden>
        {items.map((item, i) => (
          <span key={item.order} className={cn("h-1.5 flex-1 rounded-full", item.answeredAt ? "bg-primary" : i === index ? "bg-primary/40" : "bg-muted")} />
        ))}
      </div>

      <QuestionCard key={question.order} question={question} pending={pending} onAnswer={answer} onReply={reply} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="rounded-full" disabled={index === 0 || pending} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </Button>
        {index < items.length - 1 ? (
          <Button className="rounded-full" disabled={pending} onClick={() => setIndex((i) => i + 1)}>
            Next question <ChevronRight />
          </Button>
        ) : (
          <Button size="lg" className="rounded-full" disabled={pending} onClick={finish}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Flag />} {allAnswered ? "Finish & see report" : "Finish early"}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Mounted fresh for each question (keyed by order), so the draft answer never leaks across questions. */
function QuestionCard({
  question,
  pending,
  onAnswer,
  onReply,
}: {
  question: RunnerQuestion;
  pending: boolean;
  onAnswer: (payload: { text?: string; index?: number | null; secondsSpent: number }) => void;
  onReply: (text: string) => void;
}) {
  const [text, setText] = useState(question.kind === "CODING" ? (question.starterCode ?? "") : "");
  const [choice, setChoice] = useState<number | null>(null);
  const [followUpText, setFollowUpText] = useState("");
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const answered = Boolean(question.answeredAt);
  const canSubmit = question.kind === "MCQ" ? choice !== null : text.trim().length > 0;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      {question.topic && <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{question.topic}</p>}
      <h2 className="mt-1 text-lg font-semibold whitespace-pre-wrap">{question.prompt}</h2>

      {question.kind === "MCQ" && (
        <ul className="mt-4 space-y-2">
          {question.options.map((option, i) => (
            <li key={option}>
              <button
                type="button"
                disabled={answered || pending}
                onClick={() => setChoice(i)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left text-sm transition-colors",
                  choice === i ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  answered && "cursor-default opacity-80",
                )}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {question.kind !== "MCQ" && (
        <div className="mt-4 space-y-2">
          {question.kind === "CODING" && (
            <p className="text-xs text-muted-foreground">
              Write your solution{question.language && question.language !== "Any" ? ` in ${question.language}` : ""}. Code isn&apos;t run — explain your
              approach in comments, and the reviewer judges correctness, complexity and edge cases.
            </p>
          )}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered || pending}
            rows={question.kind === "CODING" ? 16 : 7}
            spellCheck={question.kind !== "CODING"}
            placeholder={question.kind === "CODING" ? "// your solution" : "Answer as you would out loud in an interview…"}
            className={cn(question.kind === "CODING" && "font-mono text-[13px] leading-relaxed")}
          />
          {question.hints.length > 0 && !answered && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none">Need a hint?</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {question.hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {!answered ? (
        <Button
          size="lg"
          className="mt-4 rounded-full"
          disabled={!canSubmit || pending}
          onClick={() =>
            onAnswer({
              text: question.kind === "MCQ" ? undefined : text,
              index: question.kind === "MCQ" ? choice : null,
              secondsSpent: Math.round((Date.now() - openedAt.current) / 1000),
            })
          }
        >
          {pending && <LoaderCircle className="animate-spin" />} Submit answer
        </Button>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-success" /> Scored {question.score} / {question.maxScore}
            </p>
            {question.feedback && <p className="mt-1.5 text-sm text-muted-foreground">{question.feedback}</p>}
          </div>

          {question.followUp && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" /> Follow-up
              </p>
              <p className="mt-1 text-sm">{question.followUp}</p>
              {question.followUpText ? (
                <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                  <CornerDownRight className="mt-0.5 size-4 shrink-0" /> {question.followUpText}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <Textarea value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} rows={3} placeholder="Your reply…" disabled={pending} />
                  <Button size="sm" variant="outline" className="rounded-full" disabled={!followUpText.trim() || pending} onClick={() => onReply(followUpText)}>
                    {pending && <LoaderCircle className="animate-spin" />} Send reply
                  </Button>
                </div>
              )}
            </div>
          )}

          {question.modelAnswer && (
            <details className="rounded-xl border p-4 text-sm">
              <summary className="cursor-pointer font-medium select-none">What a strong answer covers</summary>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{question.modelAnswer}</p>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
