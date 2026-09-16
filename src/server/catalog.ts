import "server-only";
import { cache } from "react";
import type { Level as DbLevel, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { CareerPath, Level, ResourceType } from "@/lib/catalog";

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

/** Public helpers mirroring the old static catalogue API. */
export async function publicPaths() {
  const [published, all] = await Promise.all([getPublishedPaths(), getAllPathsLite()]);
  const upcoming = all
    .filter((p) => !p.isPublished)
    .map<CareerPath>((p) => ({
      slug: p.slug,
      domainTag: p.domainTag as CareerPath["domainTag"],
      title: p.title,
      summary: p.summary,
      level: levelLabel[p.level],
      duration: p.duration,
      roles: [],
      outcomes: [],
      isPublished: false,
      dots: [],
    }));
  return [...published.map(toPublicPath), ...upcoming];
}

export async function publicStats() {
  const published = await getPublishedPaths();
  return {
    domains: 11,
    paths: published.length,
    dots: published.reduce((n, p) => n + p.dots.length, 0),
    certifications: new Set(published.flatMap((p) => p.dots.map((d) => d.certification).filter(Boolean))).size,
  };
}

export type DomainCounts = Record<string, { paths: number; dots: number }>;

/** Published path and dot counts per domain, for navigation and hero cards. */
export async function publicDomainCounts(): Promise<DomainCounts> {
  const published = await getPublishedPaths();
  return published.reduce<DomainCounts>((m, p) => {
    const c = (m[p.domainTag] ??= { paths: 0, dots: 0 });
    c.paths += 1;
    c.dots += p.dots.length;
    return m;
  }, {});
}
