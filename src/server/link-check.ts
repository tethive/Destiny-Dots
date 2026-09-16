import "server-only";
import { db } from "@/lib/db";
import { frameableFromHeaders, presentResource } from "@/lib/embed";
import { safeFetch } from "@/lib/security";

/** Checks one link: is it alive, and does the site allow it to be shown inside the app? */
export async function inspectLink(id: string, url: string) {
  let ok = false;
  let embeddable: boolean | null = null;
  const known = presentResource({ url, embeddable: false }).kind !== "external";
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await safeFetch(url, { method });
      ok = res.status < 400 || res.status === 405 || res.status === 403 || res.status === 429;
      if (res.status < 400) embeddable = frameableFromHeaders(res.headers);
      await res.body?.cancel().catch(() => null);
      if ((ok && res.status < 400) || method === "GET") break;
    } catch {
      ok = false;
    }
  }
  await db.resource.update({
    where: { id },
    data: { linkStatus: ok ? "OK" : "BROKEN", lastCheckedAt: new Date(), embeddable: known ? true : embeddable },
  });
  return ok;
}

/** Re-checks the least recently checked links (or the given ones). */
export async function checkLinks(ids?: string[], limit = 40) {
  const resources = await db.resource.findMany({
    where: { ...(ids ? { id: { in: ids } } : {}), NOT: { url: "" } },
    orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }],
    take: ids ? undefined : limit,
    select: { id: true, url: true },
  });
  const results: boolean[] = [];
  // Small batches so one slow host doesn't stall the run.
  for (let i = 0; i < resources.length; i += 8) {
    results.push(...(await Promise.all(resources.slice(i, i + 8).map((r) => inspectLink(r.id, r.url)))));
  }
  return { checked: resources.length, broken: results.filter((ok) => !ok).length };
}
