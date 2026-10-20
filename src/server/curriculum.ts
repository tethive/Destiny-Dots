import "server-only";
import { cache } from "react";
import { sharedModules } from "@/content/curriculum";
import { buildCurriculum } from "@/content/curriculum-build";
import { db } from "@/lib/db";

/**
 * Curation reads for the shared-module screens.
 *
 * A topic is one row of the curriculum document; the same topic exists as a Dot
 * in every path that teaches it. Resources are curated against the topic and
 * fanned out to all of those dots, so these helpers read the topic's resources
 * from whichever dot comes first and report how far the fan-out reaches.
 */

export interface TopicRow {
  topicKey: string;
  title: string;
  /** How many dots (so, paths) this topic feeds. */
  dotCount: number;
  resources: { id: string; title: string; type: string; url: string; isPremium: boolean }[];
}

export interface ModuleRow {
  code: string;
  name: string;
  topics: number;
  /** Topics that already have at least one resource. */
  covered: number;
  dots: number;
  paths: number;
}

/** Dots grouped by topic, with the resources attached to them. */
const topicIndex = cache(async (prefix?: string) => {
  const dots = await db.dot.findMany({
    where: prefix ? { topicKey: { startsWith: `${prefix}.` } } : { topicKey: { not: null } },
    select: {
      id: true,
      topicKey: true,
      title: true,
      pathId: true,
      moduleCode: true,
      resources: { orderBy: { order: "asc" }, select: { resource: true } },
    },
  });

  const byTopic = new Map<string, { title: string; moduleCode: string | null; pathIds: Set<string>; dotCount: number; resources: TopicRow["resources"] }>();
  for (const d of dots) {
    const key = d.topicKey!;
    const entry = byTopic.get(key) ?? { title: d.title, moduleCode: d.moduleCode, pathIds: new Set<string>(), dotCount: 0, resources: [] };
    entry.pathIds.add(d.pathId);
    entry.dotCount += 1;
    // Any dot of the topic carries the same curated set; take the first non-empty.
    if (!entry.resources.length && d.resources.length) {
      entry.resources = d.resources.map(({ resource: r }) => ({ id: r.id, title: r.title, type: r.type, url: r.url, isPremium: r.isPremium }));
    }
    byTopic.set(key, entry);
  }
  return byTopic;
});

/** Per-topic counts for the overview, without loading a single dot body. */
const topicKeyIndex = cache(async () => {
  const [all, withResources] = await Promise.all([
    db.dot.groupBy({ by: ["topicKey", "pathId"], where: { topicKey: { not: null } } }),
    db.dot.groupBy({ by: ["topicKey"], where: { topicKey: { not: null }, resources: { some: {} } } }),
  ]);
  const covered = new Set(withResources.map((d) => d.topicKey));
  const byTopic = new Map<string, { dotCount: number; pathIds: Set<string>; covered: boolean }>();
  for (const d of all) {
    const key = d.topicKey!;
    const entry = byTopic.get(key) ?? { dotCount: 0, pathIds: new Set<string>(), covered: covered.has(key) };
    entry.dotCount += 1;
    entry.pathIds.add(d.pathId);
    byTopic.set(key, entry);
  }
  return byTopic;
});

export async function moduleOverview(): Promise<ModuleRow[]> {
  const index = await topicKeyIndex();
  return sharedModules.map((m) => {
    const keys = m.topics.map((_, i) => `${m.code}.${String(i + 1).padStart(2, "0")}`);
    const rows = keys.map((k) => index.get(k));
    const paths = new Set<string>();
    for (const r of rows) r?.pathIds.forEach((p) => paths.add(p));
    return {
      code: m.code,
      name: m.name,
      topics: m.topics.length,
      covered: rows.filter((r) => r?.covered).length,
      dots: rows.reduce((n, r) => n + (r?.dotCount ?? 0), 0),
      paths: paths.size,
    };
  });
}

export async function moduleTopics(code: string): Promise<{ name: string; rows: TopicRow[] } | null> {
  const mod = sharedModules.find((m) => m.code.toLowerCase() === code.toLowerCase());
  if (!mod) return null;
  const index = await topicIndex(mod.code);
  const rows = mod.topics.map((title, i) => {
    const topicKey = `${mod.code}.${String(i + 1).padStart(2, "0")}`;
    const hit = index.get(topicKey);
    return { topicKey, title, dotCount: hit?.dotCount ?? 0, resources: hit?.resources ?? [] };
  });
  return { name: mod.name, rows };
}

/** Topics that belong to a single path, for the same curation treatment. */
export async function pathTopics(slug: string): Promise<{ title: string; rows: TopicRow[] } | null> {
  const path = buildCurriculum().find((p) => p.slug === slug);
  if (!path) return null;
  const index = await topicIndex(path.code);
  const rows = path.dots
    .filter((d) => !d.moduleCode)
    .map((d) => {
      const hit = index.get(d.topicKey);
      return { topicKey: d.topicKey, title: d.title, dotCount: hit?.dotCount ?? 0, resources: hit?.resources ?? [] };
    });
  return { title: path.title, rows };
}

/** Headline numbers for the curation landing page. */
export async function curationStats() {
  const [withResources, total] = await Promise.all([
    db.dot.count({ where: { resources: { some: {} } } }),
    db.dot.count(),
  ]);
  return { withResources, total };
}
