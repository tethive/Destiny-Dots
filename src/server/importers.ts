import "server-only";
import crypto from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { ExperienceLevel, WorkMode } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { safeFetch } from "@/lib/security";
import { getSetting } from "@/server/settings";

/**
 * Pulls fresh job listings and tech news from public APIs and feeds. Imports are
 * idempotent (unique source + externalId) and never overwrite an admin's edits.
 * Only titles, short excerpts and links are stored — full articles stay on the
 * publisher's site.
 */

export type ImportReport = { source: string; fetched: number; created: number; error?: string };

const USER_AGENT = "DestinyDotsBot/1.0 (+https://destinydots.com; info.destinydots@gmail.com)";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** Plain text excerpt from HTML — tags removed, whitespace collapsed, clipped at a word. */
export function toExcerpt(html: unknown, max = 280) {
  const text = decodeEntities(
    String(html ?? "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max - 1) || max).trim()}…`;
}

const clip = (s: unknown, max: number) => toExcerpt(s, max);

function slugFor(title: string, externalId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  return `${base || "update"}-${crypto.createHash("sha1").update(externalId).digest("hex").slice(0, 6)}`;
}

/** Cities, metros and states used to recognise an Indian posting. */
const indianPlaces = [
  "india",
  "bharat",
  "bengaluru",
  "bangalore",
  "chennai",
  "madras",
  "mumbai",
  "bombay",
  "delhi",
  "ncr",
  "noida",
  "gurugram",
  "gurgaon",
  "hyderabad",
  "pune",
  "kolkata",
  "ahmedabad",
  "coimbatore",
  "kochi",
  "cochin",
  "trivandrum",
  "thiruvananthapuram",
  "jaipur",
  "indore",
  "bhubaneswar",
  "chandigarh",
  "mysuru",
  "mysore",
  "madurai",
  "nagpur",
  "vadodara",
  "surat",
  "lucknow",
  "visakhapatnam",
  "vizag",
  "thane",
  "navi mumbai",
  "gandhinagar",
  "mohali",
  "karnataka",
  "tamil nadu",
  "maharashtra",
  "telangana",
  "kerala",
  "gujarat",
  "rajasthan",
  "west bengal",
  "haryana",
  "uttar pradesh",
  "andhra pradesh",
  "odisha",
  "punjab",
  "madhya pradesh",
];

/**
 * Only India-based roles are listed (including remote roles open to India).
 * Providers return plenty of US/EU postings, which aren't useful to students here.
 */
export function isIndianJob(...parts: unknown[]) {
  const text = parts
    .map((p) => String(p ?? ""))
    .join(" ")
    .toLowerCase();
  if (!text.trim()) return false;
  if (/\b(usa|united states|u\.s\.|canada|uk only|united kingdom|europe only|emea only|us only|americas only|latam|philippines|singapore only)\b/.test(text) && !/\bindia\b/.test(text))
    return false;
  return indianPlaces.some((place) => text.includes(place));
}

function inferLevel(title: string): ExperienceLevel {
  const t = title.toLowerCase();
  if (/\bintern(ship)?\b|\btrainee\b|\bapprentice/.test(t)) return "INTERNSHIP";
  if (/\bsenior\b|\bsr\.?\b|\blead\b|\bprincipal\b|\bstaff\b|\bmanager\b|\barchitect\b|\bhead\b/.test(t)) return "SENIOR";
  if (/\bmid\b|\bii\b|\biii\b/.test(t)) return "MID";
  return "ENTRY";
}

function inferWorkMode(...texts: unknown[]): WorkMode {
  const t = texts.map((x) => String(x ?? "")).join(" ").toLowerCase();
  if (/\bremote\b|work from home|\bwfh\b/.test(t)) return "REMOTE";
  if (/\bhybrid\b/.test(t)) return "HYBRID";
  return "ONSITE";
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

type JobInput = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  salary?: string | null;
  postedAt: Date;
  domainTag: string;
  workMode?: WorkMode;
};

async function saveJobs(jobs: JobInput[], autoPublish: boolean) {
  let created = 0;
  for (const j of jobs) {
    if (!j.title || !j.url.startsWith("https://")) continue;
    if (!isIndianJob(j.location, j.title, j.company)) continue;
    const exists = await db.jobListing.findUnique({ where: { source_externalId: { source: j.source, externalId: j.externalId } }, select: { id: true } });
    if (exists) continue;
    await db.jobListing.create({
      data: {
        source: j.source,
        externalId: j.externalId,
        title: clip(j.title, 120),
        company: clip(j.company || "Company", 120),
        location: clip(j.location || "India", 80),
        url: j.url,
        description: j.description ? clip(j.description, 600) : null,
        salary: j.salary ? clip(j.salary, 60) : null,
        postedAt: j.postedAt,
        expiresAt: new Date(Math.max(j.postedAt.getTime(), Date.now()) + 30 * 86_400_000),
        domainTags: [j.domainTag],
        pathSlugs: [],
        level: inferLevel(j.title),
        workMode: j.workMode ?? inferWorkMode(j.title, j.location),
        isPublished: autoPublish,
      },
    });
    created++;
  }
  return created;
}

type UpdateInput = { source: string; externalId: string; title: string; excerpt: string; url: string; sourceName: string; publishedAt: Date; domainTags: string[] };

async function saveUpdates(items: UpdateInput[], autoPublish: boolean) {
  let created = 0;
  for (const u of items) {
    if (!u.title || !/^https?:\/\//.test(u.url)) continue;
    const exists = await db.techUpdate.findUnique({ where: { source_externalId: { source: u.source, externalId: u.externalId } }, select: { id: true } });
    if (exists) continue;
    const excerpt = u.excerpt || `New from ${u.sourceName}.`;
    await db.techUpdate.create({
      data: {
        source: u.source,
        externalId: u.externalId,
        sourceName: u.sourceName,
        sourceUrl: u.url,
        slug: slugFor(u.title, `${u.source}:${u.externalId}`),
        title: clip(u.title, 160),
        excerpt: clip(excerpt, 300),
        body: `${clip(excerpt, 600)}\n\n*Summary from ${u.sourceName}. Read the full article on the publisher's site.*`,
        domainTags: u.domainTags,
        readMinutes: 3,
        isPublished: autoPublish,
        publishedAt: u.publishedAt,
      },
    });
    created++;
  }
  return created;
}

async function run(source: string, fn: () => Promise<{ fetched: number; created: number }>): Promise<ImportReport> {
  try {
    return { source, ...(await fn()) };
  } catch (e) {
    return { source, fetched: 0, created: 0, error: e instanceof Error ? e.message : "Failed" };
  }
}

/* -------------------------------------------------------------------------- */
/* Jobs                                                                        */
/* -------------------------------------------------------------------------- */

type AdzunaResult = {
  id: string;
  title: string;
  redirect_url: string;
  description: string;
  created: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
};

type JoobleJob = { id: string | number; title: string; company?: string; location?: string; link: string; snippet?: string; salary?: string; type?: string; updated?: string };

type RemotiveJob = { id: number; url: string; title: string; company_name: string; candidate_required_location: string; salary?: string; publication_date: string; description: string };

const lakh = (n: number) => `₹${(n / 100000).toFixed(n >= 1_000_000 ? 0 : 1)}L`;

export async function importJobs(): Promise<ImportReport[]> {
  const settings = await getSetting("imports");
  const queries = Object.entries(settings.jobQueries).filter(([, q]) => q);
  const reports: ImportReport[] = [];

  if (settings.providers.adzuna && features.adzuna) {
    reports.push(
      await run("adzuna", async () => {
        const jobs: JobInput[] = [];
        for (const [domainTag, what] of queries) {
          const params = new URLSearchParams({
            app_id: env.ADZUNA_APP_ID!,
            app_key: env.ADZUNA_APP_KEY!,
            what,
            results_per_page: "15",
            max_days_old: "14",
            sort_by: "date",
            "content-type": "application/json",
          });
          const data = await getJson<{ results: AdzunaResult[] }>(`https://api.adzuna.com/v1/api/jobs/${settings.jobsCountry}/search/1?${params}`);
          for (const r of data.results ?? []) {
            jobs.push({
              source: "adzuna",
              externalId: String(r.id),
              title: r.title,
              company: r.company?.display_name ?? "",
              location: r.location?.display_name ?? "India",
              url: r.redirect_url,
              description: r.description,
              salary: r.salary_min && r.salary_max ? `${lakh(r.salary_min)}–${lakh(r.salary_max)} a year` : null,
              postedAt: new Date(r.created),
              domainTag,
            });
          }
        }
        return { fetched: jobs.length, created: await saveJobs(jobs, settings.autoPublishJobs) };
      }),
    );
  }

  if (settings.providers.jooble && features.jooble) {
    reports.push(
      await run("jooble", async () => {
        const jobs: JobInput[] = [];
        for (const [domainTag, keywords] of queries) {
          const data = await getJson<{ jobs: JoobleJob[] }>(`https://jooble.org/api/${encodeURIComponent(env.JOOBLE_API_KEY!)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords, location: "India", page: 1, ResultOnPage: 15 }),
          });
          for (const r of data.jobs ?? []) {
            jobs.push({
              source: "jooble",
              externalId: String(r.id),
              title: r.title,
              company: r.company ?? "",
              location: r.location ?? "India",
              url: r.link,
              description: r.snippet,
              salary: r.salary || null,
              postedAt: r.updated ? new Date(r.updated) : new Date(),
              domainTag,
              workMode: inferWorkMode(r.title, r.location, r.type),
            });
          }
        }
        return { fetched: jobs.length, created: await saveJobs(jobs, settings.autoPublishJobs) };
      }),
    );
  }

  if (settings.providers.remotive) {
    // Remotive asks for no more than a few requests a day, so fetch once and match locally.
    reports.push(
      await run("remotive", async () => {
        const data = await getJson<{ jobs: RemotiveJob[] }>("https://remotive.com/api/remote-jobs?category=software-dev&limit=150");
        const jobs: JobInput[] = [];
        for (const r of data.jobs ?? []) {
          const hay = `${r.title} ${r.description.slice(0, 2000)}`.toLowerCase();
          const match = queries.find(([, q]) => q.toLowerCase().split(/\s+/).every((w) => hay.includes(w)));
          // Remote listings only count when India is explicitly included.
          const locationOk = /india|asia|apac|worldwide|anywhere/i.test(r.candidate_required_location || "");
          if (!match || !locationOk) continue;
          jobs.push({
            source: "remotive",
            externalId: String(r.id),
            title: r.title,
            company: r.company_name,
            location: `Remote (India) · ${r.candidate_required_location}`,
            url: r.url,
            description: r.description,
            salary: r.salary || null,
            postedAt: new Date(r.publication_date),
            domainTag: match[0],
            workMode: "REMOTE",
          });
        }
        return { fetched: data.jobs?.length ?? 0, created: await saveJobs(jobs, settings.autoPublishJobs) };
      }),
    );
  }

  return reports;
}

/* -------------------------------------------------------------------------- */
/* Tech updates                                                                */
/* -------------------------------------------------------------------------- */

const devtoTags: Record<string, string> = {
  cybersecurity: "security",
  "ethical-hacking": "cybersecurity",
  "ai-ml": "machinelearning",
  "cloud-computing": "cloud",
  "data-engineering": "dataengineering",
  "data-analysis": "datascience",
  blockchain: "blockchain",
  "full-stack": "webdev",
  iot: "iot",
  "ar-vr": "webxr",
};

const hnQueries: Record<string, string> = {
  cybersecurity: "vulnerability",
  "ai-ml": "LLM",
  "cloud-computing": "AWS",
  "5g-technology": "5G",
  blockchain: "Ethereum",
};

type DevtoArticle = { id: number; title: string; description: string; url: string; published_at: string; user?: { name?: string } };
type HnHit = { objectID: string; title: string; url?: string; created_at: string; points: number; num_comments: number };

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text" });
const text = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : v && typeof v === "object" && "#text" in v ? String((v as { "#text": unknown })["#text"]) : "");
const asArray = <T>(v: T | T[] | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

export async function importUpdates(): Promise<ImportReport[]> {
  const settings = await getSetting("imports");
  const reports: ImportReport[] = [];
  const cutoff = Date.now() - 10 * 86_400_000;

  if (settings.providers.devto) {
    reports.push(
      await run("devto", async () => {
        const items: UpdateInput[] = [];
        for (const [domainTag, tag] of Object.entries(devtoTags)) {
          const articles = await getJson<DevtoArticle[]>(`https://dev.to/api/articles?tag=${tag}&top=7&per_page=6`);
          for (const a of articles) {
            items.push({
              source: "devto",
              externalId: String(a.id),
              title: a.title,
              excerpt: a.description,
              url: a.url,
              sourceName: `DEV Community${a.user?.name ? ` · ${a.user.name}` : ""}`,
              publishedAt: new Date(a.published_at),
              domainTags: [domainTag],
            });
          }
        }
        return { fetched: items.length, created: await saveUpdates(items, settings.autoPublishUpdates) };
      }),
    );
  }

  if (settings.providers.hackernews) {
    reports.push(
      await run("hackernews", async () => {
        const items: UpdateInput[] = [];
        const since = Math.floor(cutoff / 1000);
        for (const [domainTag, query] of Object.entries(hnQueries)) {
          const data = await getJson<{ hits: HnHit[] }>(
            `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(query)}&numericFilters=points>150,created_at_i>${since}&hitsPerPage=5`,
          );
          for (const h of data.hits ?? []) {
            if (!h.url) continue;
            items.push({
              source: "hackernews",
              externalId: h.objectID,
              title: h.title,
              excerpt: `Trending on Hacker News with ${h.points} points and ${h.num_comments} comments.`,
              url: h.url,
              sourceName: new URL(h.url).hostname.replace(/^www\./, ""),
              publishedAt: new Date(h.created_at),
              domainTags: [domainTag],
            });
          }
        }
        return { fetched: items.length, created: await saveUpdates(items, settings.autoPublishUpdates) };
      }),
    );
  }

  if (settings.providers.rss) {
    for (const feed of settings.rssFeeds) {
      reports.push(
        await run(`rss:${feed.name}`, async () => {
          const res = await safeFetch(feed.url, { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9" }, timeoutMs: 15000 });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = await res.text();
          if (body.length > 5_000_000) throw new Error("Feed too large");
          const doc = xml.parse(body);
          const rssItems = asArray(doc?.rss?.channel?.item);
          const atomItems = asArray(doc?.feed?.entry);
          const items: UpdateInput[] = [
            ...rssItems.map((i: Record<string, unknown>) => ({
              id: text(i.guid) || text(i.link),
              title: text(i.title),
              url: text(i.link),
              summary: text(i.description) || text(i["content:encoded"]),
              date: text(i.pubDate) || text(i["dc:date"]),
            })),
            ...atomItems.map((e: Record<string, unknown>) => {
              const links = asArray(e.link as Record<string, string> | Record<string, string>[]);
              const href = links.find((l) => !l["@rel"] || l["@rel"] === "alternate")?.["@href"] ?? "";
              return { id: text(e.id) || href, title: text(e.title), url: href, summary: text(e.summary) || text(e.content), date: text(e.published) || text(e.updated) };
            }),
          ]
            .filter((i) => i.title && i.url && (!i.date || new Date(i.date).getTime() > cutoff))
            .slice(0, 15)
            .map((i) => ({
              source: "rss",
              externalId: crypto.createHash("sha1").update(`${feed.url}|${i.id}`).digest("hex"),
              title: i.title,
              excerpt: toExcerpt(i.summary),
              url: i.url,
              sourceName: feed.name,
              publishedAt: i.date && !Number.isNaN(new Date(i.date).getTime()) ? new Date(i.date) : new Date(),
              domainTags: feed.domainTags,
            }));
          return { fetched: items.length, created: await saveUpdates(items, settings.autoPublishUpdates) };
        }),
      );
    }
  }

  return reports;
}

/* -------------------------------------------------------------------------- */
/* Housekeeping                                                                */
/* -------------------------------------------------------------------------- */

export async function cleanupImports() {
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  // Remove anything imported before the India-only rule, or that slipped through.
  const imported = await db.jobListing.findMany({ where: { source: { not: "manual" } }, select: { id: true, location: true, title: true, company: true } });
  const foreign = imported.filter((j) => !isIndianJob(j.location, j.title, j.company)).map((j) => j.id);
  if (foreign.length) await db.jobListing.deleteMany({ where: { id: { in: foreign } } });
  const [staleJobs, staleUpdates, expired, limits] = await Promise.all([
    // Imported items nobody approved within 30 days.
    db.jobListing.deleteMany({ where: { source: { not: "manual" }, isPublished: false, createdAt: { lt: monthAgo } } }),
    db.techUpdate.deleteMany({ where: { source: { not: "manual" }, isPublished: false, createdAt: { lt: monthAgo } } }),
    db.jobListing.updateMany({ where: { isPublished: true, expiresAt: { lt: new Date() } }, data: { isPublished: false } }),
    db.rateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(Date.now() - 2 * 86_400_000) } } }),
  ]);
  return { staleJobs: staleJobs.count, staleUpdates: staleUpdates.count, expiredJobs: expired.count, rateLimitRows: limits.count, nonIndianJobs: foreign.length };
}
