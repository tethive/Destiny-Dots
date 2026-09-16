import "server-only";
import type { SearchPath } from "@/components/command-menu";
import { getPublishedPaths } from "@/server/catalog";

export async function searchPaths(): Promise<SearchPath[]> {
  const paths = await getPublishedPaths();
  return paths.map((p) => ({
    slug: p.slug,
    domainTag: p.domainTag as SearchPath["domainTag"],
    title: p.title,
    dotCount: p.dots.length,
    keywords: `${p.roles.join(" ")} ${p.dots.map((d) => d.title).join(" ")}`,
  }));
}
