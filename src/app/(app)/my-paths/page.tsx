import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Route } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { DomainBadge, domainVars } from "@/components/domain";
import { ProgressRing } from "@/components/progress-ring";
import { Button } from "@/components/ui/button";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { requireUser } from "@/lib/session";
import { getMyPaths } from "@/server/learning";

export const metadata: Metadata = { title: "My paths" };

export default async function MyPathsPage() {
  const user = await requireUser("/my-paths");
  const paths = await getMyPaths(user.id);
  const active = paths.filter((p) => p.done < p.total);
  const finished = paths.filter((p) => p.total > 0 && p.done === p.total);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="My paths"
        description="Every path you're enrolled in, with your progress dot by dot."
        actions={
          <Button asChild size="lg" className="rounded-full">
            <Link href="/explore">Explore more paths</Link>
          </Button>
        }
      />

      {paths.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No paths yet"
          description="Enrol in a path to track your progress. It's free, and the first dots are open right away."
          action={
            <Button asChild size="lg" className="rounded-full">
              <Link href="/explore">Find a path</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          <PathGrid title={`In progress (${active.length})`} items={active} />
          {finished.length > 0 && <PathGrid title={`Completed (${finished.length})`} items={finished} />}
        </div>
      )}
    </div>
  );
}

function PathGrid({ title, items }: { title: string; items: Awaited<ReturnType<typeof getMyPaths>> }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p) => {
          const tag = p.path.domainTag as DomainTag;
          const domain = getDomain(tag)!;
          return (
            <div key={p.path.id} style={domainVars(tag)} className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex items-start gap-4">
                <ProgressRing value={p.percent} size={72} stroke={6} barClassName="stroke-[var(--d)]" label={`${p.percent}%`} />
                <div className="min-w-0 flex-1">
                  <DomainBadge tag={tag} label={domain.short} />
                  <p className="mt-2 truncate text-lg font-semibold">{p.path.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.done} of {p.total} dots · enrolled {p.enrolledAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {p.path.dots.map((d, i) => (
                  <span key={d.id} className={i < p.done ? "d-solid flex-1" : "flex-1 bg-muted"} />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                {p.nextDot ? (
                  <p className="min-w-0 truncate text-sm">
                    <span className="text-muted-foreground">Next:</span> {p.nextDot.title}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="size-4" /> Path complete
                  </p>
                )}
                <Button asChild size="lg" variant={p.nextDot ? "default" : "outline"} className="shrink-0 rounded-full">
                  <Link href={p.nextDot ? `/learn/${p.path.slug}/${p.nextDot.order}` : `/learn/${p.path.slug}`}>
                    {p.nextDot ? "Continue" : "Review"} <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
