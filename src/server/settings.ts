import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { contactConfig, siteConfig } from "@/lib/site";

/**
 * Admin-editable settings stored as JSON rows in AppSetting. Every setting has
 * a schema with defaults, so a missing or partial row still yields a valid value.
 */

export const settingSchemas = {
  business: z.object({
    legalName: z.string().trim().min(2).max(120).default(siteConfig.legalEntity),
    address: z.string().trim().max(300).default(contactConfig.address),
    state: z.string().trim().max(60).default("Tamil Nadu"),
    email: z.email().default(contactConfig.email),
    phone: z.string().trim().max(30).default(contactConfig.phone),
    /** Empty until GST-registered. When set, invoices become tax invoices. */
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN")
      .default(""),
    pan: z.string().trim().toUpperCase().max(10).default(""),
  }),
  imports: z.object({
    autoPublishJobs: z.boolean().default(false),
    autoPublishUpdates: z.boolean().default(false),
    jobsCountry: z.string().trim().length(2).default("in"),
    /** Search phrase per domain tag used by job providers. */
    jobQueries: z.record(z.string(), z.string().trim().max(120)).default({
      cybersecurity: "cyber security analyst",
      "ethical-hacking": "penetration tester",
      "ai-ml": "machine learning engineer",
      "cloud-computing": "cloud engineer",
      "data-engineering": "data engineer",
      "data-analysis": "data analyst",
      blockchain: "blockchain developer",
      "full-stack": "full stack developer",
      iot: "iot engineer",
      "5g-technology": "5g network engineer",
      "ar-vr": "ar vr developer",
    }),
    providers: z
      .object({
        adzuna: z.boolean().default(true),
        remotive: z.boolean().default(true),
        jooble: z.boolean().default(true),
        devto: z.boolean().default(true),
        hackernews: z.boolean().default(true),
        rss: z.boolean().default(true),
      })
      .default({ adzuna: true, remotive: true, jooble: true, devto: true, hackernews: true, rss: true }),
    rssFeeds: z
      .array(z.object({ name: z.string().trim().min(1).max(60), url: z.url(), domainTags: z.array(z.string()).default([]) }))
      .max(30)
      .default([
        { name: "AWS News Blog", url: "https://aws.amazon.com/blogs/aws/feed/", domainTags: ["cloud-computing"] },
        { name: "Google Cloud Blog", url: "https://cloudblog.withgoogle.com/rss/", domainTags: ["cloud-computing", "ai-ml"] },
        { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", domainTags: ["cybersecurity", "ethical-hacking"] },
        { name: "GitHub Blog", url: "https://github.blog/feed/", domainTags: ["full-stack"] },
      ]),
  }),
  /** Free-tier limits to compare usage against. Edit when you change plans. */
  usage: z.object({
    alertPct: z.number().int().min(10).max(100).default(80),
    resendDaily: z.number().int().min(1).default(100),
    resendMonthly: z.number().int().min(1).default(3000),
    r2StorageGb: z.number().min(0.1).default(10),
    r2WritesMonthly: z.number().int().min(1).default(1_000_000),
    r2ReadsMonthly: z.number().int().min(1).default(10_000_000),
    neonStorageGb: z.number().min(0.1).default(0.5),
    adzunaDaily: z.number().int().min(1).default(250),
    joobleDaily: z.number().int().min(1).default(500),
    vercelInvocationsMonthly: z.number().int().min(1).default(1_000_000),
  }),
  marketplace: z.object({
    enabled: z.boolean().default(true),
    commissionPct: z.number().int().min(0).max(50).default(10),
    /** Days after purchase before earnings become payable (covers disputes). */
    holdDays: z.number().int().min(0).max(60).default(7),
    minPayoutInr: z.number().int().min(0).default(500),
    minPriceInr: z.number().int().min(1).default(99),
    maxPriceInr: z.number().int().min(1).default(9999),
  }),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const getSetting = cache(async <K extends SettingKey>(key: K): Promise<SettingValue<K>> => {
  const row = await db.appSetting.findUnique({ where: { key } });
  const parsed = settingSchemas[key].safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : settingSchemas[key].parse({})) as SettingValue<K>;
});

export async function saveSetting<K extends SettingKey>(key: K, value: unknown) {
  const parsed = settingSchemas[key].safeParse(value);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const json = parsed.data as Prisma.InputJsonValue;
  await db.appSetting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
  return { ok: true as const, value: parsed.data as SettingValue<K> };
}
