import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, MessageSquareText, Sparkles, Target, Trophy } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { StartInterviewForm, type RoundOption } from "@/components/interview/start-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { skillLevelLabels } from "@/lib/labels";
import { isAdmin, requireUser } from "@/lib/session";
import { getAccess } from "@/server/access";
import { interviewStats, roundConfig, type RoundKey } from "@/server/interviews";

export const metadata: Metadata = { title: "Interview prep" };

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function InterviewHomePage() {
  const user = await requireUser("/interview");
  const [access, counts, stats, live] = await Promise.all([
    getAccess(user.id),
    db.interviewQuestion.groupBy({ by: ["round"], where: { isActive: true }, _count: true }),
    interviewStats(user.id),
    db.interviewSession.findFirst({ where: { userId: user.id, status: "IN_PROGRESS" }, select: { id: true, round: true, startedAt: true } }),
  ]);
  const pro = access.plan || isAdmin(user);

  const rounds: RoundOption[] = (Object.keys(roundConfig) as RoundKey[]).map((key) => ({
    key,
    ...roundConfig[key],
    available: counts.find((c) => c.round === key)?._count ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Interview prep"
        description="Practise the three rounds every tech hire goes through — aptitude, technical and coding — with an AI interviewer that scores your answers and tells you what to fix."
        actions={
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/interview/prep">
              <BookOpenCheck /> Question bank
            </Link>
          </Button>
        }
      />

      {live && (
        <Link
          href={`/interview/session/${live.id}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm hover:bg-primary/10"
        >
          <span>
            <span className="font-medium">You have a {roundConfig[live.round as RoundKey].label.toLowerCase()} interview in progress</span>
            <span className="block text-muted-foreground">Started {day(live.startedAt)} — pick up where you left off.</span>
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Interviews completed" value={stats.completed} icon={Trophy} />
        <StatCard label="Average score" value={`${stats.averagePct}%`} icon={Target} />
        <StatCard label="Questions in the bank" value={counts.reduce((n, c) => n + c._count, 0)} icon={BookOpenCheck} />
        <StatCard label="Rounds available" value={rounds.filter((r) => r.available >= 2).length} hint="Aptitude · Technical · Coding" icon={MessageSquareText} />
      </div>

      {pro ? (
        <StartInterviewForm rounds={rounds} />
      ) : (
        <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-xs">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Sparkles className="size-5" />
          </span>
          <h2 className="mt-3 font-semibold">Mock interviews are part of Pro</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pro unlocks unlimited AI mock interviews across all three rounds, with follow-up questions, a scored report and a record of every attempt.
            The question bank below is free — read the questions and model answers any time.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/billing?from=interview">See Pro plans</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/interview/prep">Browse the question bank</Link>
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Your past interviews</h2>
        {stats.sessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No completed interviews yet. Your reports will collect here.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {stats.sessions.map((s) => {
              const pct = s.maxScore ? Math.round((s.score / s.maxScore) * 100) : 0;
              return (
                <li key={s.id}>
                  <Link href={`/interview/session/${s.id}/report`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-primary">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <Badge variant="secondary">{roundConfig[s.round as RoundKey].label}</Badge>
                      <span className="truncate">
                        {s.domainTag ? (getDomain(s.domainTag)?.name ?? s.domainTag) : "General"} · {skillLevelLabels[s.level]}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-sm">
                      <span className="tabular-nums">
                        {s.score}/{s.maxScore} ({pct}%)
                      </span>
                      <span className="text-xs text-muted-foreground">{day(s.startedAt)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
