import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleAlert, RotateCcw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDomain } from "@/lib/catalog";
import { skillLevelLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { getSession, roundConfig, type RoundKey } from "@/server/interviews";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Interview report", robots: { index: false } };

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function InterviewReportPage(props: PageProps<"/interview/session/[id]/report">) {
  const { id } = await props.params;
  const user = await requireUser(`/interview/session/${id}/report`);
  const session = await getSession(user.id, id);
  if (!session) notFound();

  const config = roundConfig[session.round as RoundKey];
  const pct = session.maxScore ? Math.round((session.score / session.maxScore) * 100) : 0;
  const domainLabel = session.domainTag ? (getDomain(session.domainTag)?.name ?? session.domainTag) : "General";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`${config.label} interview report`}
        description={`${domainLabel} · ${skillLevelLabels[session.level]} · ${when(session.startedAt)}`}
        actions={
          <Button asChild size="lg" className="rounded-full">
            <Link href="/interview">
              <RotateCcw /> New interview
            </Link>
          </Button>
        }
      />

      <section className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-6 shadow-xs sm:flex-row sm:items-start">
        <ProgressRing value={pct} size={120} stroke={10} label={`${pct}%`} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            Scored <span className="font-semibold text-foreground">{session.score}</span> out of {session.maxScore}
          </p>
          {session.summary && <p className="mt-2 text-pretty">{session.summary}</p>}
          {session.aiModel && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
              <Sparkles className="size-3.5" /> Reviewed by the AI interviewer
            </p>
          )}
        </div>
      </section>

      {(session.strengths.length > 0 || session.improvements.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4 text-success" /> What went well
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {session.strengths.length ? session.strengths.map((s) => <li key={s}>• {s}</li>) : <li>Keep practising — strengths will show up here.</li>}
            </ul>
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="flex items-center gap-2 font-semibold">
              <CircleAlert className="size-4 text-amber-600 dark:text-amber-400" /> What to work on
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {session.improvements.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-semibold">Question by question</h2>
        {session.answers.map((a) => {
          const good = a.score >= a.maxScore * 0.7;
          return (
            <article key={a.id} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.question?.topic && <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{a.question.topic}</p>}
                  <h3 className="mt-0.5 font-medium whitespace-pre-wrap">{a.prompt}</h3>
                </div>
                <Badge variant={good ? "secondary" : "outline"} className={cn("shrink-0 tabular-nums", !good && "border-amber-500/50 text-amber-700 dark:text-amber-400")}>
                  {a.score}/{a.maxScore}
                </Badge>
              </div>

              {a.kind === "MCQ" && a.options.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {a.options.map((option, i) => {
                    const chosen = a.answerIndex === i;
                    const correct = a.question?.answerIndex === i;
                    return (
                      <li
                        key={option}
                        className={cn(
                          "rounded-lg border px-3 py-2",
                          correct && "border-success/50 bg-success/10",
                          chosen && !correct && "border-destructive/50 bg-destructive/10",
                        )}
                      >
                        <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                        {option}
                        {chosen && <span className="ml-2 text-xs text-muted-foreground">(your answer)</span>}
                      </li>
                    );
                  })}
                </ul>
              )}

              {a.kind !== "MCQ" && a.answerText && (
                <pre className={cn("mt-3 max-h-72 overflow-auto rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-wrap", a.kind === "CODING" && "font-mono text-[13px]")}>
                  {a.answerText}
                </pre>
              )}
              {a.kind !== "MCQ" && !a.answerText && <p className="mt-3 text-sm text-muted-foreground">Not answered.</p>}

              {a.feedback && (
                <p className="mt-3 rounded-xl border bg-muted/40 p-3 text-sm">
                  <span className="font-medium">Feedback: </span>
                  {a.feedback}
                </p>
              )}

              {a.followUp && (
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="font-medium">Follow-up: {a.followUp}</p>
                  <p className="mt-1 text-muted-foreground">{a.followUpText || "Not answered."}</p>
                </div>
              )}

              {a.question?.modelAnswer && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium select-none">What a strong answer covers</summary>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{a.question.modelAnswer}</p>
                </details>
              )}
            </article>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="rounded-full">
          <Link href="/interview">
            Practise another round <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/interview/prep">Review the question bank</Link>
        </Button>
      </div>
    </div>
  );
}
