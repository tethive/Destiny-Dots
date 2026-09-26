import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ChevronLeft } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { FilterSelect } from "@/components/app/filter-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { domains } from "@/lib/catalog";
import { db } from "@/lib/db";
import { skillLevelLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { roundConfig, type RoundKey } from "@/server/interviews";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Interview question bank" };

const PAGE_SIZE = 25;

export default async function InterviewPrepPage(props: PageProps<"/interview/prep">) {
  await requireUser("/interview/prep");
  const sp = await props.searchParams;
  const round = typeof sp.round === "string" && sp.round in roundConfig ? (sp.round as RoundKey) : undefined;
  const domain = typeof sp.domain === "string" ? sp.domain : undefined;
  const level = typeof sp.level === "string" ? sp.level : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.InterviewQuestionWhereInput = {
    isActive: true,
    ...(round ? { round } : {}),
    ...(domain ? { domainTags: { has: domain } } : {}),
    ...(level ? { level: level as Prisma.EnumLevelFilter["equals"] } : {}),
  };
  const [questions, total] = await Promise.all([
    db.interviewQuestion.findMany({ where, orderBy: [{ round: "asc" }, { topic: "asc" }], take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    db.interviewQuestion.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ round, domain, level, ...next })) if (v) params.set(k, String(v));
    return `/interview/prep${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 rounded-full text-muted-foreground">
        <Link href="/interview">
          <ChevronLeft /> Interview prep
        </Link>
      </Button>

      <PageHeader
        title="Question bank"
        description="Every question the AI interviewer draws from, with what a strong answer covers. Free to read — practise here, then take a timed mock interview."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          param="round"
          placeholder="All rounds"
          value={round}
          options={(Object.keys(roundConfig) as RoundKey[]).map((r) => ({ value: r, label: roundConfig[r].label }))}
        />
        <FilterSelect param="domain" placeholder="All roles" value={domain} options={domains.map((d) => ({ value: d.tag, label: d.name }))} />
        <FilterSelect
          param="level"
          placeholder="Any level"
          value={level}
          options={Object.entries(skillLevelLabels).map(([value, label]) => ({ value, label }))}
        />
        <span className="ml-auto text-sm text-muted-foreground">{total} questions</span>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="No questions yet" description="Try another round or role — the bank is still growing." />
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{roundConfig[q.round as RoundKey].label}</Badge>
                <Badge variant="outline">{skillLevelLabels[q.level]}</Badge>
                <span className="text-xs text-muted-foreground">{q.topic}</span>
              </div>
              <p className="mt-2 font-medium whitespace-pre-wrap">{q.prompt}</p>

              {q.kind === "MCQ" && q.options.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground select-none">Show options and answer</summary>
                  <ul className="mt-2 space-y-1.5">
                    {q.options.map((option, i) => (
                      <li key={option} className={cn("rounded-lg border px-3 py-2", q.answerIndex === i && "border-success/50 bg-success/10")}>
                        <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                        {option}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="mt-2 text-muted-foreground">{q.explanation}</p>}
                </details>
              )}

              {q.kind !== "MCQ" && q.modelAnswer && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground select-none">What a strong answer covers</summary>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{q.modelAnswer}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button asChild variant="outline" size="sm" className="rounded-full" disabled={page === 1}>
            <Link href={query({ page: String(page - 1) })}>Previous</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button asChild variant="outline" size="sm" className="rounded-full" disabled={page === pages}>
            <Link href={query({ page: String(page + 1) })}>Next</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
