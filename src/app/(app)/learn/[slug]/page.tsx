import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BarChart3, Briefcase, Check, ChevronRight, Clock, Layers, Sparkles } from "lucide-react";
import { EnrolButton, LearnDotList, UnlockButton } from "@/components/app/learn";
import { DomainBadge, domainVars } from "@/components/domain";
import { ProgressRing } from "@/components/progress-ring";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { canOpenDot, getAccess } from "@/server/access";
import { getPathBySlug, levelName } from "@/server/catalog";
import { getCompletedDotIds } from "@/server/learning";
import { displayPrices } from "@/server/payments";

export async function generateMetadata(props: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const path = await getPathBySlug(slug);
  return { title: path?.title ?? "Path" };
}

export default async function LearnPathPage(props: PageProps<"/learn/[slug]">) {
  const { slug } = await props.params;
  const user = await requireUser(`/learn/${slug}`);
  const path = await getPathBySlug(slug);
  if (!path || (!path.isPublished && user.role !== "admin")) notFound();

  const [access, completed, enrollment, prices, certs, jobCount] = await Promise.all([
    getAccess(user.id),
    getCompletedDotIds(user.id),
    db.enrollment.findUnique({ where: { userId_pathId: { userId: user.id, pathId: path.id } } }),
    displayPrices(path.id),
    db.certificationGuide.findMany({ where: { isPublished: true, pathSlugs: { has: path.slug } }, select: { slug: true, name: true } }),
    db.jobListing.count({ where: { isPublished: true, pathSlugs: { has: path.slug } } }),
  ]);

  const domain = getDomain(path.domainTag)!;
  const tag = path.domainTag as DomainTag;
  const dots = path.dots.map((d) => ({
    id: d.id,
    order: d.order,
    title: d.title,
    description: d.description,
    hours: d.hours,
    isFree: d.isFree,
    certification: d.certification,
    resourceCount: d.resources.length,
    questionCount: d._count.questions,
    canOpen: canOpenDot(access, d),
    completed: completed.has(d.id),
  }));
  const done = dots.filter((d) => d.completed).length;
  const percent = dots.length ? Math.round((done / dots.length) * 100) : 0;
  const hours = dots.reduce((n, d) => n + d.hours, 0);
  const fullAccess = access.plan || access.paths.has(path.id);
  const next = dots.find((d) => !d.completed && d.canOpen);

  return (
    <div className="mx-auto max-w-6xl" style={domainVars(tag)}>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/explore" className="hover:text-foreground">
          Explore
        </Link>
        <ChevronRight className="size-4" />
        <Link href={`/explore?domain=${tag}`} className="hover:text-foreground">
          {domain.name}
        </Link>
        <ChevronRight className="size-4" />
        <span className="truncate text-foreground">{path.title}</span>
      </nav>

      <header className="relative isolate overflow-hidden rounded-3xl border bg-card p-6 shadow-xs sm:p-8">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" aria-hidden />
        <div className="absolute -top-24 -right-16 -z-10 size-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--d)" }} aria-hidden />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <DomainBadge tag={tag} label={domain.name} />
            {!path.isPublished && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Draft (admin preview)</span>}
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{path.title}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{path.summary}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Layers className="size-4" /> {dots.length} dots</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {path.duration} · ~{hours}h</span>
              <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-4" /> {levelName(path.level)}</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {next && (
                <Link
                  href={`/learn/${path.slug}/${next.order}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  {done === 0 ? "Start dot 1" : `Continue: Dot ${next.order}`} <ChevronRight className="size-4" />
                </Link>
              )}
              <EnrolButton pathId={path.id} enrolled={Boolean(enrollment)} />
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border bg-background/60 p-4 backdrop-blur lg:flex-col lg:px-8">
            <ProgressRing value={percent} size={96} stroke={8} barClassName="stroke-[var(--d)]" label={<span className="text-base">{percent}%</span>} />
            <p className="text-sm text-muted-foreground lg:text-center">
              <span className="block font-semibold text-foreground">
                {done} of {dots.length}
              </span>
              dots complete
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          <h2 className="mb-4 text-lg font-semibold">Roadmap</h2>
          <LearnDotList
            slug={path.slug}
            pathId={path.id}
            pathTitle={path.title}
            dots={dots}
            prices={prices}
            ownedDots={access.dots.size}
          />
        </section>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {fullAccess ? (
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" /> Full access
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {access.plan ? "Your Pro plan unlocks every dot in this path." : "You've unlocked this entire path — it's yours forever."}
              </p>
            </div>
          ) : (
            <div className="border-beam">
              <div className="rounded-2xl bg-card p-5">
                <p className="font-semibold">Unlock the whole roadmap</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pro from {formatINR(prices.monthly)}/month, or this path alone for {formatINR(prices.path)}.
                </p>
                <UnlockButton
                  className="mt-4 w-full"
                  label="See unlock options"
                  target={{ pathId: path.id, pathTitle: path.title }}
                  prices={prices}
                  ownedDots={access.dots.size}
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="font-semibold">You&apos;ll be able to</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {path.outcomes.map((o) => (
                <li key={o} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" /> {o}
                </li>
              ))}
            </ul>
            {path.roles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {path.roles.map((r) => (
                  <span key={r} className="rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {(certs.length > 0 || jobCount > 0) && (
            <div className="rounded-2xl border bg-card p-2 shadow-xs">
              {certs.map((c) => (
                <Link key={c.slug} href={`/certifications/${c.slug}`} className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-muted">
                  <Award className="size-4 text-amber-600 dark:text-amber-400" />
                  <span className="flex-1">{c.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
              {jobCount > 0 && (
                <Link href={`/jobs?path=${path.slug}`} className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-muted">
                  <Briefcase className="size-4 text-primary" />
                  <span className="flex-1">
                    {jobCount} related job {jobCount === 1 ? "listing" : "listings"}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
