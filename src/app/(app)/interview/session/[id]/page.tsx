import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InterviewRunner, type RunnerQuestion } from "@/components/interview/runner";
import { Button } from "@/components/ui/button";
import { getDomain } from "@/lib/catalog";
import { isAdmin, requireUser } from "@/lib/session";
import { getAccess } from "@/server/access";
import { getSession, roundConfig, type RoundKey } from "@/server/interviews";

export const metadata: Metadata = { title: "Mock interview", robots: { index: false } };

export default async function InterviewSessionPage(props: PageProps<"/interview/session/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/interview/session/${id}`);
  const access = await getAccess(user.id);
  if (!access.plan && !isAdmin(user)) redirect("/billing?from=interview");

  const session = await getSession(user.id, id);
  if (!session) notFound();
  if (session.status !== "IN_PROGRESS") redirect(`/interview/session/${id}/report`);

  const config = roundConfig[session.round as RoundKey];
  const questions: RunnerQuestion[] = session.answers.map((a) => ({
    order: a.order,
    kind: a.kind,
    prompt: a.prompt,
    options: a.options,
    language: a.language,
    starterCode: a.question?.starterCode ?? null,
    hints: a.answeredAt ? [] : (a.question?.hints ?? []),
    topic: a.question?.topic ?? null,
    minutes: a.question?.minutes ?? 3,
    answeredAt: a.answeredAt?.toISOString() ?? null,
    score: a.score,
    maxScore: a.maxScore,
    feedback: a.feedback,
    followUp: a.followUp,
    followUpText: a.followUpText,
    // Only revealed once the answer is in.
    modelAnswer: a.answeredAt ? (a.question?.modelAnswer ?? null) : null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-full text-muted-foreground">
          <Link href="/interview">
            <ChevronLeft /> Interview prep
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          {session.domainTag ? (getDomain(session.domainTag)?.name ?? session.domainTag) : "General"} · {config.label}
        </span>
      </div>

      <InterviewRunner
        sessionId={session.id}
        roundLabel={config.label}
        totalMinutes={config.minutes}
        startedAt={session.startedAt.toISOString()}
        questions={questions}
      />
    </div>
  );
}
