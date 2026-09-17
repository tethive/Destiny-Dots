import "server-only";
import { unstable_cache } from "next/cache";
import type { SearchPath } from "@/components/command-menu";
import { getPublishedPaths } from "@/server/catalog";

export const SEARCH_CACHE_TAG = "catalogue-search";

/**
 * Published paths for the command menu. Every app page renders the menu, so the
 * result is cached across requests instead of reloading the whole catalogue on
 * each navigation. Publishing changes clear it; other edits show within 5 minutes.
 */
export const searchPaths = unstable_cache(
  async (): Promise<SearchPath[]> => {
    const paths = await getPublishedPaths();
    return paths.map((p) => ({
      slug: p.slug,
      domainTag: p.domainTag as SearchPath["domainTag"],
      title: p.title,
      dotCount: p.dots.length,
      keywords: `${p.roles.join(" ")} ${p.dots.map((d) => d.title).join(" ")}`,
    }));
  },
  ["search-paths"],
  { revalidate: 300, tags: [SEARCH_CACHE_TAG] },
);
