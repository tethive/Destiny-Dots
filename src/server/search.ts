import "server-only";
import { unstable_cache } from "next/cache";
import type { SearchPath } from "@/components/command-menu";
import { db } from "@/lib/db";
import { CATALOGUE_TAG } from "@/server/catalog";

export const SEARCH_CACHE_TAG = "catalogue-search";

/**
 * Published paths for the command menu. Every app page renders the menu, so the
 * result is cached across requests instead of reloading the whole catalogue on
 * each navigation. Publishing changes clear it; other edits show within 5 minutes.
 */
/** Dot titles folded into a path's search keywords. */
const KEYWORD_DOTS = 25;

export const searchPaths = unstable_cache(
  async (): Promise<SearchPath[]> => {
    // Only the first few dot titles are fetched: enough to match on, without
    // pulling every dot in the catalogue into memory on each rebuild.
    const [paths, counts] = await Promise.all([
      db.careerPath.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          domainTag: true,
          title: true,
          roles: true,
          dots: { take: KEYWORD_DOTS, orderBy: { order: "asc" }, select: { title: true } },
        },
        orderBy: [{ domainTag: "asc" }, { title: "asc" }],
      }),
      db.dot.groupBy({ by: ["pathId"], where: { path: { isPublished: true } }, _count: { _all: true } }),
    ]);
    const total = new Map(counts.map((c) => [c.pathId, c._count._all]));
    return paths.map((p) => ({
      slug: p.slug,
      domainTag: p.domainTag as SearchPath["domainTag"],
      title: p.title,
      dotCount: total.get(p.id) ?? 0,
      keywords: `${p.roles.join(" ")} ${p.dots.map((d) => d.title).join(" ")}`,
    }));
  },
  ["search-paths"],
  { revalidate: 3600, tags: [SEARCH_CACHE_TAG, CATALOGUE_TAG] },
);
