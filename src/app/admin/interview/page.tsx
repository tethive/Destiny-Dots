import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageSquareText, Search, Sparkles } from "lucide-react";
import { InterviewQuestionEditor, QuestionRowActions, type QuestionValues } from "@/components/admin/interview-editor";
import { DeleteMaterialButton, InterviewMaterialEditor, type MaterialValues } from "@/components/admin/interview-material-editor";
import { FilterSelect } from "@/components/app/filter-select";
import { EmptyState, PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { domains, getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { skillLevelLabels } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";
import { roundConfig, type RoundKey } from "@/server/interviews";
import { cn } from "@/lib/utils";
import { interviewPrepEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: "Interview bank" };

const rounds = { APTITUDE: "Aptitude", TECHNICAL: "Technical", CODING: "Coding" };
const when = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function AdminInterviewPage(props: PageProps<"/admin/interview">) {
  // Built, not launched yet — see lib/flags.
  if (!interviewPrepEnabled) notFound();
  await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const round = typeof sp.round === "string" ? sp.round : undefined;
  const domain = typeof sp.domain === "string" ? sp.domain : undefined;

  const where: Prisma.InterviewQuestionWhereInput = {
    ...(q ? { OR: [{ prompt: { contains: q, mode: "insensitive" } }, { topic: { contains: q, mode: "insensitive" } }] } : {}),
    ...(round ? { round: round as RoundKey } : {}),
    ...(domain ? { domainTags: { has: domain } } : {}),
  };

  const [questions, counts, sessions, sessionCount, materials] = await Promise.all([
    db.interviewQuestion.findMany({ where, orderBy: [{ round: "asc" }, { topic: "asc" }], take: 200 }),
    db.interviewQuestion.groupBy({ by: ["round"], where: { isActive: true }, _count: true }),
    db.interviewSession.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
    db.interviewSession.count({ where: { status: "COMPLETED" } }),
    db.interviewMaterial.findMany({ orderBy: [{ round: "asc" }, { order: "asc" }] }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Interview bank"
        description="Questions for the practice bank and the AI mock interviews. Retire a question to keep it out of new interviews without deleting it."
        actions={
          <>
            <InterviewMaterialEditor />
            <InterviewQuestionEditor />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(roundConfig) as RoundKey[]).map((r) => (
          <StatCard key={r} label={`${roundConfig[r].label} questions`} value={counts.find((c) => c.round === r)?._count ?? 0} icon={MessageSquareText} />
        ))}
        <StatCard
          label="Interviews taken"
          value={sessionCount}
          hint={features.ai ? "AI grading is on" : "Add GEMINI_API_KEY for AI grading"}
          icon={Sparkles}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form className="relative" action="/admin/interview">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search questions" className="h-9 w-56 rounded-full pl-9" />
        </form>
        <FilterSelect param="round" placeholder="All rounds" value={round} options={Object.entries(rounds).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="domain" placeholder="All roles" value={domain} options={domains.map((d) => ({ value: d.tag, label: d.name }))} />
        <span className="ml-auto text-sm text-muted-foreground">{questions.length} shown</span>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No questions yet" description="Add the first question, or adjust the filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">Question</TableHead>
                <TableHead className="w-[14%]">Round</TableHead>
                <TableHead className="w-[16%]">Roles</TableHead>
                <TableHead className="w-[12%]">Level</TableHead>
                <TableHead className="w-[16%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => {
                const values: QuestionValues = {
                  id: question.id,
                  round: question.round,
                  kind: question.kind,
                  level: question.level,
                  topic: question.topic,
                  prompt: question.prompt,
                  domainTags: question.domainTags,
                  options: question.options.length ? question.options : ["", "", "", ""],
                  answerIndex: question.answerIndex,
                  modelAnswer: question.modelAnswer ?? "",
                  explanation: question.explanation ?? "",
                  starterCode: question.starterCode ?? "",
                  language: question.language ?? "",
                  hints: question.hints,
                  minutes: question.minutes,
                  isActive: question.isActive,
                };
                return (
                  <TableRow key={question.id} className={question.isActive ? undefined : "opacity-60"}>
                    <TableCell>
                      <p className="truncate font-medium">{question.prompt}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {question.topic}
                        {question.isActive ? "" : " · retired"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rounds[question.round]}</Badge>
                    </TableCell>
                    <TableCell className="truncate text-sm text-muted-foreground">
                      {question.domainTags.length ? question.domainTags.map((t) => getDomain(t)?.short ?? t).join(", ") : "All"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{skillLevelLabels[question.level]}</TableCell>
                    <TableCell>
                      <span className="flex items-center justify-end">
                        <InterviewQuestionEditor value={values} />
                        <QuestionRowActions id={question.id} isActive={question.isActive} topic={question.topic} />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Study material</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown above the practice questions. Link to the source — re-hosting someone else&apos;s PDF without permission is copyright infringement, and
          charging for access makes it worse.
        </p>
        {materials.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing added yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {materials.map((m) => {
              const values: MaterialValues = {
                id: m.id,
                round: m.round,
                kind: m.kind,
                title: m.title,
                description: m.description ?? "",
                source: m.source ?? "",
                url: m.url,
                domainTags: m.domainTags,
                order: m.order,
                isActive: m.isActive,
              };
              return (
                <li key={m.id} className={cn("flex flex-wrap items-center justify-between gap-2 py-2.5", !m.isActive && "opacity-60")}>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{rounds[m.round]}</Badge>
                      <span className="truncate font-medium">{m.title}</span>
                      {!m.isActive && <span className="text-xs text-muted-foreground">hidden</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.source ? `${m.source} · ` : ""}
                      {m.url}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    <InterviewMaterialEditor value={values} />
                    <DeleteMaterialButton id={m.id} title={m.title} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Recent interviews</h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No completed interviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="truncate">
                  {s.user.name} · {rounds[s.round]}
                  {s.domainTag ? ` · ${getDomain(s.domainTag)?.short ?? s.domainTag}` : ""}
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span className="tabular-nums">
                    {s.score}/{s.maxScore}
                  </span>
                  {s.completedAt && <span className="text-xs">{when(s.completedAt)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
