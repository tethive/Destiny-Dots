import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2, TriangleAlert } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { DotBuilder, PublishToggle } from "@/components/admin/dot-builder";
import { PathForm } from "@/components/admin/path-form";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { deletePath } from "@/server/actions/admin";
import { getDropOff } from "@/server/admin-stats";

export const metadata: Metadata = { title: "Edit path" };

export default async function AdminPathEditor(props: PageProps<"/admin/paths/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const { error } = await props.searchParams;
  const [path, library, dropOff] = await Promise.all([
    db.careerPath.findUnique({
      where: { id },
      include: {
        dots: {
          orderBy: { order: "asc" },
          include: { resources: { orderBy: { order: "asc" }, select: { resourceId: true } }, questions: { orderBy: { order: "asc" } } },
        },
      },
    }),
    db.resource.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, title: true, type: true, domainTags: true, isPremium: true } }),
    getDropOff(id),
  ]);
  if (!path) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/paths" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All paths
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{path.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">/{path.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PublishToggle pathId={path.id} isPublished={path.isPublished} />
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href={`/learn/${path.slug}`} target="_blank">
              Preview <ExternalLink data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      {error === "has-enrollments" && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4" /> Students are enrolled in this path. Unpublish it instead of deleting.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <DotBuilder
          pathId={path.id}
          library={library}
          dots={path.dots.map((d) => ({
            id: d.id,
            order: d.order,
            title: d.title,
            description: d.description,
            hours: d.hours,
            isFree: d.isFree,
            certification: d.certification,
            resourceIds: d.resources.map((r) => r.resourceId),
            questions: d.questions.map((q) => ({ prompt: q.prompt, options: q.options, answerIndex: q.answerIndex, explanation: q.explanation })),
          }))}
        />

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="mb-4 font-semibold">Path details</h2>
            <PathForm
              id={path.id}
              initial={{
                title: path.title,
                slug: path.slug,
                domainTag: path.domainTag,
                summary: path.summary,
                level: path.level,
                duration: path.duration,
                roles: path.roles.join(", "),
                outcomes: path.outcomes.join("\n"),
              }}
            />
          </section>

          {dropOff && (
            <section className="rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="font-semibold">Completion by dot</h2>
              <p className="text-sm text-muted-foreground">{dropOff.enrolled} students enrolled</p>
              <ul className="mt-4 space-y-2">
                {dropOff.dots.map((d, i) => {
                  const prev = i > 0 ? dropOff.dots[i - 1].rate : 1;
                  const bigDrop = dropOff.enrolled > 0 && prev - d.rate >= 0.25;
                  return (
                    <li key={d.order} className="grid grid-cols-[1.5rem_1fr_3rem] items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{d.order}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted" title={`${d.title}: ${d.completed} completed`}>
                        <div className={cn("h-full rounded-full", bigDrop ? "bg-destructive" : "bg-primary")} style={{ width: `${d.rate * 100}%` }} />
                      </div>
                      <span className="text-right tabular-nums">{Math.round(d.rate * 100)}%</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Red bars mark a drop of 25 points or more from the previous dot.</p>
            </section>
          )}

          <form action={deletePath.bind(null, path.id)} className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Delete path</h2>
            <p className="mt-1 text-sm text-muted-foreground">Only possible when no students are enrolled. This can&apos;t be undone.</p>
            <ConfirmSubmit message={`Delete "${path.title}" and all its dots? This can't be undone.`} className="mt-4 rounded-full">
              <Trash2 /> Delete path
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </div>
  );
}
