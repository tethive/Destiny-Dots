import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, BarChart3, CheckCircle2, Clock, ExternalLink, FileText, Route } from "lucide-react";
import { CertificationTabs } from "@/components/app/certification-tabs";
import { DomainBadge } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { difficultyLabel, skillLevelLabels } from "@/lib/labels";
import { getAccess } from "@/server/access";

export async function generateMetadata(props: PageProps<"/certifications/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await db.certificationGuide.findUnique({ where: { slug }, select: { name: true } });
  return { title: c?.name ?? "Certification" };
}

export default async function CertificationPage(props: PageProps<"/certifications/[slug]">) {
  const { slug } = await props.params;
  const { tab } = await props.searchParams;
  const user = await requireUser(`/certifications/${slug}`);
  const cert = await db.certificationGuide.findUnique({
    where: { slug },
    include: { resources: { orderBy: { order: "asc" }, include: { resource: true } } },
  });
  if (!cert || !cert.isPublished) notFound();
  const [paths, access, bookmarks] = await Promise.all([
    db.careerPath.findMany({
      where: { slug: { in: cert.pathSlugs }, isPublished: true },
      select: { slug: true, title: true, domainTag: true, duration: true },
    }),
    getAccess(user.id),
    db.bookmark.findMany({ where: { userId: user.id }, select: { resourceId: true } }),
  ]);
  const bookmarked = new Set(bookmarks.map((b) => b.resourceId));
  const resources = cert.resources.map(({ resource: r }) => {
    const locked = r.isPremium && !access.plan && user.role !== "admin";
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      duration: r.duration,
      level: skillLevelLabels[r.level],
      isPremium: r.isPremium,
      isSample: r.isSample,
      bookmarked: bookmarked.has(r.id),
      locked,
      url: locked ? "" : r.url,
      fileKey: locked ? null : r.fileKey,
      fileMime: locked ? null : r.fileMime,
      embeddable: r.embeddable,
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/certifications" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All certifications
      </Link>

      <header className="relative isolate overflow-hidden rounded-3xl border bg-card p-6 shadow-xs sm:p-8">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" aria-hidden />
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 [transform:perspective(500px)_rotateY(-14deg)]">
            <Award className="size-7" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{cert.provider}</p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{cert.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {cert.domainTags.map((t) => (
                <DomainBadge key={t} tag={t as DomainTag} label={getDomain(t)?.short ?? t} />
              ))}
            </div>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-background/60 p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><BarChart3 className="size-3.5" /> Difficulty</dt>
            <dd className="mt-1 font-semibold">{difficultyLabel[cert.difficulty]}</dd>
          </div>
          <div className="rounded-xl border bg-background/60 p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" /> Typical prep time</dt>
            <dd className="mt-1 font-semibold">{cert.prepTime}</dd>
          </div>
        </dl>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <a href={cert.officialUrl} target="_blank" rel="noopener noreferrer">
            Official exam page <ExternalLink data-icon="inline-end" />
          </a>
        </Button>
      </header>

      {cert.isSample && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Sample guide — always confirm the current exam format, price and objectives on the official page.
        </p>
      )}

      <CertificationTabs
        initialTab={tab === "resources" ? "resources" : "overview"}
        resources={resources}
        overview={
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold">Overview</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{cert.overview}</p>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="size-5 text-muted-foreground" /> Exam format
              </h2>
              <p className="mt-2 leading-7 text-muted-foreground">{cert.examFormat}</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold">What it covers</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {cert.topics.map((t) => (
                  <li key={t} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
                    <CheckCircle2 className="size-4 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Route className="size-4 text-primary" /> Paths that prepare you
            </h2>
            {paths.length === 0 && <p className="text-sm text-muted-foreground">No linked paths yet.</p>}
            {paths.map((p) => (
              <Link key={p.slug} href={`/learn/${p.slug}`} className="block rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40">
                <DomainBadge tag={p.domainTag as DomainTag} label={getDomain(p.domainTag)?.short ?? p.domainTag} />
                <p className="mt-2 font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.duration}</p>
              </Link>
            ))}
          </aside>
        </div>
        }
      />
    </div>
  );
}
