import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, ChevronRight, CirclePlay, Clock, FileText, FolderKanban, Link2, ListChecks, Lock, type LucideIcon } from "lucide-react";
import { DotResources } from "@/components/app/dot-resources";
import { Checkpoint, CompleteButton, UnlockButton } from "@/components/app/learn";
import { DomainBadge, domainVars } from "@/components/domain";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@/generated/prisma/client";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { skillLevelLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { canOpenDot, getAccess } from "@/server/access";
import { getPathBySlug } from "@/server/catalog";
import { getCompletedDotIds } from "@/server/learning";
import { displayPrices } from "@/server/payments";

const icons: Record<ResourceType, LucideIcon> = { VIDEO: CirclePlay, DOC: FileText, PROJECT: FolderKanban, QUIZ: ListChecks, LINK: Link2 };

export async function generateMetadata(props: PageProps<"/learn/[slug]/[order]">): Promise<Metadata> {
  const { slug, order } = await props.params;
  const path = await getPathBySlug(slug);
  const dot = path?.dots.find((d) => d.order === Number(order));
  return { title: dot ? `${dot.title} · ${path!.title}` : "Dot" };
}

export default async function DotPage(props: PageProps<"/learn/[slug]/[order]">) {
  const { slug, order } = await props.params;
  const user = await requireUser(`/learn/${slug}/${order}`);
  const path = await getPathBySlug(slug);
  const dot = path?.dots.find((d) => d.order === Number(order));
  if (!path || !dot || (!path.isPublished && user.role !== "admin")) notFound();

  const [access, completed, bookmarks, questions, lastAttempt, prices] = await Promise.all([
    getAccess(user.id),
    getCompletedDotIds(user.id),
    db.bookmark.findMany({ where: { userId: user.id }, select: { resourceId: true } }),
    db.quizQuestion.findMany({ where: { dotId: dot.id }, orderBy: { order: "asc" }, select: { id: true, prompt: true, options: true } }),
    db.quizAttempt.findFirst({ where: { userId: user.id, dotId: dot.id }, orderBy: { createdAt: "desc" } }),
    displayPrices(path.id, dot.id),
  ]);

  const tag = path.domainTag as DomainTag;
  const domain = getDomain(tag)!;
  const canOpen = canOpenDot(access, dot);
  const premiumAccess = access.plan || access.paths.has(path.id) || access.dots.has(dot.id);
  const bookmarked = new Set(bookmarks.map((b) => b.resourceId));
  const isDone = completed.has(dot.id);
  const prev = path.dots.find((d) => d.order === dot.order - 1);
  const next = path.dots.find((d) => d.order === dot.order + 1);
  const unlockTarget = { pathId: path.id, pathTitle: path.title, dotId: dot.id, dotOrder: dot.order, dotTitle: dot.title };

  return (
    <div className="mx-auto max-w-4xl" style={domainVars(tag)}>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/learn/${path.slug}`} className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" /> {path.title}
        </Link>
        <ChevronRight className="size-4" />
        <span className="truncate text-foreground">Dot {dot.order}</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <DomainBadge tag={tag} label={domain.short} />
          <span className="font-mono text-xs text-muted-foreground">
            DOT {String(dot.order).padStart(2, "0")} OF {path.dots.length}
          </span>
          {isDone && <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">Completed</span>}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{dot.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{dot.description}</p>
        <p className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" /> ~{dot.hours} hours
          </span>
          <span>{dot.resources.length} resources</span>
        </p>
        {dot.certification && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm">
            <Award className="size-4 text-amber-600 dark:text-amber-400" /> Certification milestone: <b>{dot.certification}</b>
          </p>
        )}
      </header>

      {!canOpen ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border bg-card px-6 py-12 text-center shadow-xs">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="size-6" />
          </span>
          <h2 className="mt-4 text-xl font-semibold">This dot is locked</h2>
          <p className="mt-1 max-w-md text-muted-foreground">
            Unlock it on its own, unlock the whole {path.title} path, or go Pro for every dot across all 11 domains.
          </p>
          <UnlockButton className="mt-6 px-6" label="Unlock this dot" target={unlockTarget} prices={prices} ownedDots={access.dots.size} />
          <ul className="mt-8 w-full max-w-md space-y-2 text-left">
            {dot.resources.map(({ resource: r }) => {
              const Icon = icons[r.type];
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                  <Icon className="size-4" /> <span className="flex-1 truncate">{r.title}</span> <Lock className="size-3.5" />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Resources</h2>
            <DotResources
              unlock={{ target: unlockTarget, prices, ownedDots: access.dots.size }}
              resources={dot.resources.map(({ resource: r }) => {
                const locked = r.isPremium && !premiumAccess;
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
                  // Locked resources never send their links or files to the browser.
                  url: locked ? "" : r.url,
                  fileKey: locked ? null : r.fileKey,
                  fileMime: locked ? null : r.fileMime,
                  embeddable: r.embeddable,
                };
              })}
            />
          </section>

          <div className="mt-8">
            {questions.length > 0 ? (
              <Checkpoint
                dotId={dot.id}
                questions={questions}
                lastAttempt={lastAttempt ? { score: lastAttempt.score, total: lastAttempt.total, passed: lastAttempt.passed } : null}
              />
            ) : (
              <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Self-check</p>
                Worked through the resources and feel confident? Mark this dot complete to unlock your next step.
              </div>
            )}
          </div>
        </>
      )}

      <div className="sticky bottom-24 z-20 mt-10 flex items-center justify-between gap-3 rounded-2xl border bg-background/90 p-3 shadow-lg backdrop-blur-xl md:bottom-4">
        {prev ? (
          <Button asChild variant="ghost" size="lg" className="rounded-full">
            <Link href={`/learn/${path.slug}/${prev.order}`}>
              <ArrowLeft data-icon="inline-start" /> <span className="hidden sm:inline">Previous</span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {canOpen && <CompleteButton dotId={dot.id} completed={isDone} />}
        {next ? (
          <Button asChild variant="ghost" size="lg" className="rounded-full">
            <Link href={`/learn/${path.slug}/${next.order}`}>
              <span className="hidden sm:inline">Next dot</span> <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="lg" className="rounded-full">
            <Link href={`/learn/${path.slug}`}>Roadmap</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
