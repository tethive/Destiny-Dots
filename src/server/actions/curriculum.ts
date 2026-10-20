"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma, ResourceType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { CATALOGUE_TAG } from "@/server/catalog";
import { inspectLink } from "@/server/link-check";

export type CurationResult = { ok: true; message?: string } | { ok: false; error: string };

const TYPES = ["VIDEO", "DOC", "PROJECT", "QUIZ", "LINK"] as const;

async function audit(actorId: string, action: string, targetId: string, meta?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, targetType: "Topic", targetId, meta } });
}

/**
 * Attach a resource list to every dot that teaches this topic.
 *
 * A shared-module topic lives in up to 27 paths, so curating it once and
 * fanning out is the whole point of the module screens.
 */
export async function setTopicResources(topicKey: string, resourceIds: string[]): Promise<CurationResult> {
  const admin = await requireAdmin();
  const dots = await db.dot.findMany({ where: { topicKey }, select: { id: true } });
  if (!dots.length) return { ok: false, error: "No dots carry that topic." };

  await db.$transaction([
    db.dotResource.deleteMany({ where: { dotId: { in: dots.map((d) => d.id) } } }),
    db.dotResource.createMany({
      data: dots.flatMap((d) => resourceIds.map((resourceId, i) => ({ dotId: d.id, resourceId, order: i + 1 }))),
    }),
  ]);

  await audit(admin.id, "topic.resources", topicKey, { resources: resourceIds.length, dots: dots.length });
  revalidatePath("/admin/curriculum", "layout");
  revalidateTag(CATALOGUE_TAG, "max");
  revalidatePath("/", "layout");
  return { ok: true, message: `Saved to ${dots.length} ${dots.length === 1 ? "dot" : "dots"}` };
}

/* -------------------------------------------------------------------------- */
/* CSV import                                                                  */
/* -------------------------------------------------------------------------- */

const rowSchema = z.object({
  topicKey: z.string().trim().min(1, "topicKey is required"),
  title: z.string().trim().min(1, "title is required"),
  type: z
    .string()
    .trim()
    .toUpperCase()
    .refine((t): t is ResourceType => (TYPES as readonly string[]).includes(t), `type must be one of ${TYPES.join(", ").toLowerCase()}`),
  url: z.string().trim().url("url must start with http:// or https://"),
  duration: z.string().trim().optional(),
  isPremium: z.string().trim().optional(),
});

export interface CsvRow {
  line: number;
  topicKey: string;
  title: string;
  type: string;
  url: string;
  duration?: string;
  isPremium: boolean;
}

export interface CsvPreview {
  rows: CsvRow[];
  errors: { line: number; message: string }[];
  /** topicKey -> how many dots it would reach. */
  reach: Record<string, number>;
  unknownTopics: string[];
}

/** Minimal RFC-4180 parse: quoted fields, doubled quotes, commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const truthy = (s?: string) => ["1", "true", "yes", "y"].includes((s ?? "").trim().toLowerCase());

/** Parse and validate without writing anything, so the admin sees it first. */
export async function previewResourceCsv(text: string): Promise<CsvPreview> {
  await requireAdmin();
  const grid = parseCsv(text);
  const errors: CsvPreview["errors"] = [];
  const rows: CsvRow[] = [];
  if (!grid.length) return { rows, errors: [{ line: 0, message: "Nothing to import." }], reach: {}, unknownTopics: [] };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const required = ["topickey", "title", "type", "url"];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length) {
    return { rows, errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}` }], reach: {}, unknownTopics: [] };
  }
  const col = (name: string) => header.indexOf(name);

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const parsed = rowSchema.safeParse({
      topicKey: cells[col("topickey")] ?? "",
      title: cells[col("title")] ?? "",
      type: cells[col("type")] ?? "",
      url: cells[col("url")] ?? "",
      duration: col("duration") >= 0 ? cells[col("duration")] : undefined,
      isPremium: col("ispremium") >= 0 ? cells[col("ispremium")] : undefined,
    });
    if (!parsed.success) {
      errors.push({ line: i + 1, message: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    rows.push({
      line: i + 1,
      topicKey: parsed.data.topicKey,
      title: parsed.data.title,
      type: parsed.data.type,
      url: parsed.data.url,
      duration: parsed.data.duration || undefined,
      isPremium: truthy(parsed.data.isPremium),
    });
  }

  const keys = [...new Set(rows.map((r) => r.topicKey))];
  const dots = await db.dot.findMany({ where: { topicKey: { in: keys } }, select: { topicKey: true } });
  const reach: Record<string, number> = {};
  for (const d of dots) reach[d.topicKey!] = (reach[d.topicKey!] ?? 0) + 1;
  const unknownTopics = keys.filter((k) => !reach[k]);
  return { rows, errors, reach, unknownTopics };
}

/**
 * Create the resources and append them to their topics. Existing resources on a
 * topic are kept; a row whose URL is already on that topic is skipped, so
 * re-importing a corrected sheet does not duplicate links.
 */
export async function importResourceCsv(text: string): Promise<CurationResult & { added?: number; skipped?: number; dots?: number }> {
  const admin = await requireAdmin();
  const preview = await previewResourceCsv(text);
  if (preview.errors.length) return { ok: false, error: `Fix ${preview.errors.length} row(s) first — line ${preview.errors[0].line}: ${preview.errors[0].message}` };
  if (!preview.rows.length) return { ok: false, error: "Nothing to import." };
  if (preview.unknownTopics.length) {
    return { ok: false, error: `Unknown topic key(s): ${preview.unknownTopics.slice(0, 3).join(", ")}${preview.unknownTopics.length > 3 ? "…" : ""}` };
  }

  let added = 0;
  let skipped = 0;
  const touchedDots = new Set<string>();
  const byTopic = new Map<string, CsvRow[]>();
  for (const r of preview.rows) byTopic.set(r.topicKey, [...(byTopic.get(r.topicKey) ?? []), r]);

  for (const [topicKey, rows] of byTopic) {
    const dots = await db.dot.findMany({
      where: { topicKey },
      select: { id: true, resources: { select: { order: true, resource: { select: { url: true } } } } },
    });
    const existingUrls = new Set(dots[0]?.resources.map((r) => r.resource.url) ?? []);
    let order = Math.max(0, ...(dots[0]?.resources.map((r) => r.order) ?? [0]));

    for (const row of rows) {
      if (existingUrls.has(row.url)) {
        skipped++;
        continue;
      }
      const resource = await db.resource.create({
        data: {
          title: row.title,
          url: row.url,
          type: row.type as ResourceType,
          duration: row.duration ?? null,
          isPremium: row.isPremium,
          domainTags: [],
          topics: [],
          isSample: false,
        },
      });
      order++;
      await db.dotResource.createMany({
        data: dots.map((d) => ({ dotId: d.id, resourceId: resource.id, order })),
        skipDuplicates: true,
      });
      existingUrls.add(row.url);
      dots.forEach((d) => touchedDots.add(d.id));
      added++;
      // Flags dead links and whether the page can be embedded.
      await inspectLink(resource.id, resource.url).catch(() => null);
    }
  }

  await audit(admin.id, "topic.import", "csv", { added, skipped, topics: byTopic.size });
  revalidatePath("/admin/curriculum", "layout");
  revalidatePath("/admin/resources");
  revalidatePath("/", "layout");
  return { ok: true, added, skipped, dots: touchedDots.size, message: `Added ${added} resources across ${touchedDots.size} dots` };
}
