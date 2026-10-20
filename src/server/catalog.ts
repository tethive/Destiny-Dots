import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Level as DbLevel, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isDomainLive, liveDomains, type CareerPath, type Level, type PathSummary, type ResourceType } from "@/lib/catalog";

/** Cleared whenever an admin publishes or edits catalogue content. */
export const CATALOGUE_TAG = "catalogue";

const levelLabel: Record<DbLevel, Level> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };

export const pathInclude = {
  dots: {
    orderBy: { order: "asc" },
    include: {
      resources: { orderBy: { order: "asc" }, include: { resource: true } },
      _count: { select: { questions: true } },
    },
  },
} satisfies Prisma.CareerPathInclude;

export type PathWithDots = Prisma.CareerPathGetPayload<{ include: typeof pathInclude }>;

/** Map a DB path to the lightweight shape used by public components (cards, dot map). */
export function toPublicPath(p: PathWithDots): CareerPath {
  return {
    slug: p.slug,
    domainTag: p.domainTag as CareerPath["domainTag"],
    title: p.title,
    summary: p.summary,
    level: levelLabel[p.level],
    duration: p.duration,
    roles: p.roles,
    outcomes: p.outcomes,
    isPublished: p.isPublished,
    dots: p.dots.map((d) => ({
      order: d.order,
      title: d.title,
      description: d.description,
      hours: d.hours,
      isFree: d.isFree,
      certification: d.certification ?? undefined,
      resourceCount: d.resources.length,
      hasCheckpoint: d._count.questions > 0,
      resources: d.isFree
        ? d.resources.map(({ resource: r }) => ({
            title: r.title,
            type: r.type.toLowerCase() as ResourceType,
            duration: r.duration ?? "",
            isPremium: r.isPremium,
          }))
        : undefined,
    })),
  };
}

export const levelName = (l: DbLevel) => levelLabel[l];

export const getPublishedPaths = cache(async () =>
  db.careerPath.findMany({ where: { isPublished: true }, include: pathInclude, orderBy: [{ domainTag: "asc" }, { title: "asc" }] }),
);

export const getPathBySlug = cache(async (slug: string) =>
  db.careerPath.findUnique({ where: { slug }, include: pathInclude }),
);

export const getAllPathsLite = cache(async () =>
  db.careerPath.findMany({
    select: { id: true, slug: true, title: true, domainTag: true, isPublished: true, level: true, duration: true, summary: true },
    orderBy: [{ domainTag: "asc" }, { title: "asc" }],
  }),
);

export type { PathSummary };

const summarise = unstable_cache(
  async (): Promise<PathSummary[]> => {
    const [paths, dotCounts, freeCounts] = await Promise.all([
      db.careerPath.findMany({
        select: { id: true, slug: true, domainTag: true, title: true, summary: true, level: true, duration: true, isPublished: true },
        orderBy: [{ domainTag: "asc" }, { title: "asc" }],
      }),
      db.dot.groupBy({ by: ["pathId"], _count: { _all: true } }),
      db.dot.groupBy({ by: ["pathId"], where: { isFree: true }, _count: { _all: true } }),
    ]);
    const total = new Map(dotCounts.map((d) => [d.pathId, d._count._all]));
    const free = new Map(freeCounts.map((d) => [d.pathId, d._count._all]));
    return paths.map((p) => ({
      slug: p.slug,
      domainTag: p.domainTag as CareerPath["domainTag"],
      title: p.title,
      summary: p.summary,
      level: levelLabel[p.level],
      duration: p.duration,
      isPublished: p.isPublished,
      dotCount: total.get(p.id) ?? 0,
      freeCount: free.get(p.id) ?? 0,
    }));
  },
  ["path-summaries"],
  { revalidate: 3600, tags: [CATALOGUE_TAG] },
);

/** Public listings: published paths plus the drafts shown as "in the works". */
export async function publicPathSummaries() {
  return (await summarise()).filter((p) => isDomainLive(p.domainTag));
}

export const publicStats = unstable_cache(
  async () => {
    const live = liveDomains().map((d) => d.tag);
    const where = { isPublished: true, domainTag: { in: live } } as const;
    const [paths, dots, certifications] = await Promise.all([
      db.careerPath.count({ where }),
      db.dot.count({ where: { path: where } }),
      db.dot.findMany({ where: { path: where, certification: { not: null } }, select: { certification: true }, distinct: ["certification"] }),
    ]);
    return { domains: live.length, paths, dots, certifications: certifications.length };
  },
  ["public-stats"],
  { revalidate: 3600, tags: [CATALOGUE_TAG] },
);

export type DomainCounts = Record<string, { paths: number; dots: number }>;

/** Published path and dot counts per domain, for navigation and hero cards. */
export const publicDomainCounts = unstable_cache(
  async (): Promise<DomainCounts> => {
    const live = liveDomains().map((d) => d.tag);
    const where = { isPublished: true, domainTag: { in: live } } as const;
    const [paths, dots] = await Promise.all([
      db.careerPath.groupBy({ by: ["domainTag"], where, _count: { _all: true } }),
      db.dot.groupBy({ by: ["pathId"], where: { path: where }, _count: { _all: true } }),
    ]);
    const owner = new Map(
      (await db.careerPath.findMany({ where, select: { id: true, domainTag: true } })).map((p) => [p.id, p.domainTag]),
    );
    const counts: DomainCounts = {};
    for (const p of paths) counts[p.domainTag] = { paths: p._count._all, dots: 0 };
    for (const d of dots) {
      const tag = owner.get(d.pathId);
      if (tag && counts[tag]) counts[tag].dots += d._count._all;
    }
    return counts;
  },
  ["public-domain-counts"],
  { revalidate: 3600, tags: [CATALOGUE_TAG] },
);
