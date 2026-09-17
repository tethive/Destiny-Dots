import type { MetadataRoute } from "next";
import { domains, pathHref } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";
import { getPublishedPaths } from "@/server/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/resources", "/pricing", "/about", "/contact", "/privacy", "/terms", "/refund-policy"].map((p) => ({
    url: `${siteUrl}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  const paths = await getPublishedPaths().catch(() => []);

  return [
    ...pages,
    ...domains.map((d) => ({
      url: `${siteUrl}/resources/${d.tag}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...paths.map((p) => ({
      url: `${siteUrl}${pathHref({ domainTag: p.domainTag as (typeof domains)[number]["tag"], slug: p.slug })}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
