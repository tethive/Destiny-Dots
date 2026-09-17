import "server-only";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { getSetting } from "@/server/settings";

/**
 * Lightweight usage metering for third-party services. The app counts what it
 * does itself (emails sent, file reads/writes, API calls, cron runs) and reads
 * live sizes from the database, then compares them with the free-tier limits
 * set in Admin → Usage.
 */

export type UsageProvider =
  "system" | "resend" | "r2" | "vercel" | "adzuna" | "jooble" | "remotive" | "devto" | "hackernews" | "rss" | "turnstile" | "razorpay";

/** Today's date in India as a UTC midnight Date (the counter's day bucket). */
function istDay(offsetDays = 0) {
  const ist = new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

function istMonthStart() {
  const d = istDay();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Adds to today's counter. Never throws — metering must not break the request it measures. */
export async function trackUsage(provider: UsageProvider, metric: string, amount = 1) {
  if (amount <= 0) return;
  try {
    const day = istDay();
    await db.usageCounter.upsert({
      where: { provider_metric_day: { provider, metric, day } },
      update: { count: { increment: amount } },
      create: { provider, metric, day, count: amount },
    });
  } catch (e) {
    console.warn("[usage] could not record", provider, metric, e instanceof Error ? e.message : e);
  }
}

/**
 * Stores the latest value of an account-wide counter reported by the provider
 * itself (e.g. Resend's quota headers), so usage outside the app is included.
 */
export async function recordUsageSnapshot(provider: UsageProvider, metric: string, value: number, day: Date) {
  if (!Number.isFinite(value) || value < 0) return;
  try {
    await db.usageCounter.upsert({
      where: { provider_metric_day: { provider, metric, day } },
      update: { count: Math.round(value) },
      create: { provider, metric, day, count: Math.round(value) },
    });
  } catch (e) {
    console.warn("[usage] could not record snapshot", provider, metric, e instanceof Error ? e.message : e);
  }
}

/** Today as a UTC-midnight Date in UTC (Resend resets its daily quota at 00:00 UTC). */
export function utcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function sums(since: Date) {
  const rows = await db.usageCounter.groupBy({
    by: ["provider", "metric"],
    where: { day: { gte: since } },
    _sum: { count: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(`${r.provider}:${r.metric}`, r._sum.count ?? 0);
  return (key: string) => map.get(key) ?? 0;
}

export type Meter = {
  label: string;
  used: number;
  limit: number | null;
  unit: "count" | "bytes";
  period: "today" | "this month" | "total";
  hint?: string;
};

export type ProviderUsage = {
  id: string;
  name: string;
  configured: boolean;
  dashboardUrl: string;
  note?: string;
  meters: Meter[];
};

const GB = 1024 ** 3;

export async function getUsageSummary() {
  const monthStartUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [limits, today, month, dbSize, fileTotals, projectFileTotals, series, resendDaily, resendMonthly] = await Promise.all([
    getSetting("usage"),
    sums(istDay()),
    sums(istMonthStart()),
    db.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`,
    db.resource.aggregate({
      where: { fileKey: { not: null } },
      _sum: { fileSize: true },
      _count: { fileKey: true },
    }),
    db.projectFile.aggregate({ _sum: { size: true }, _count: true }),
    db.usageCounter.findMany({
      where: {
        provider: "resend",
        metric: "emails",
        day: { gte: istDay(-29) },
      },
      select: { day: true, count: true },
      orderBy: { day: "asc" },
    }),
    db.usageCounter.findUnique({ where: { provider_metric_day: { provider: "resend", metric: "account_daily", day: utcDay() } } }),
    db.usageCounter.findFirst({
      where: { provider: "resend", metric: "account_monthly", day: { gte: monthStartUtc } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Resend reports whole-account totals with every send; until the first report, use the app's own count.
  const syncedAt = resendMonthly?.updatedAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const resendHint = syncedAt ? `Whole Resend account · synced ${syncedAt}` : "Counted by the app until Resend reports account totals";

  const storedBytes = (fileTotals._sum.fileSize ?? 0) + (projectFileTotals._sum.size ?? 0);
  const storedObjects = fileTotals._count.fileKey + projectFileTotals._count;

  const providers: ProviderUsage[] = [
    {
      id: "resend",
      name: "Resend · email",
      configured: features.email,
      dashboardUrl: "https://resend.com/emails",
      note: "Totals refresh from Resend whenever the app sends an email. Use “Send test email” to refresh them now.",
      meters: [
        {
          label: "Emails sent",
          used: Math.max(resendDaily?.count ?? 0, today("resend:emails")),
          limit: limits.resendDaily,
          unit: "count",
          period: "today",
          hint: resendDaily ? "Whole Resend account · resets 5:30 AM IST" : undefined,
        },
        {
          label: "Emails sent",
          used: Math.max(resendMonthly?.count ?? 0, month("resend:emails")),
          limit: limits.resendMonthly,
          unit: "count",
          period: "this month",
          hint: resendHint,
        },
        {
          label: "Failed sends",
          used: month("resend:failed"),
          limit: null,
          unit: "count",
          period: "this month",
          hint: "Check Resend → Emails for the reason",
        },
      ],
    },
    {
      id: "r2",
      name: "Cloudflare R2 · file storage",
      configured: features.objectStorage,
      dashboardUrl: "https://dash.cloudflare.com/?to=/:account/r2/overview",
      note: "Storage is measured from the files the app knows about; Cloudflare's dashboard is the billing source of truth.",
      meters: [
        {
          label: "Stored files",
          used: storedBytes,
          limit: limits.r2StorageGb * GB,
          unit: "bytes",
          period: "total",
          hint: `${storedObjects} objects`,
        },
        {
          label: "Uploads (Class A)",
          used: month("r2:writes"),
          limit: limits.r2WritesMonthly,
          unit: "count",
          period: "this month",
        },
        {
          label: "File views (Class B)",
          used: month("r2:reads"),
          limit: limits.r2ReadsMonthly,
          unit: "count",
          period: "this month",
        },
      ],
    },
    {
      id: "neon",
      name: "Neon · database",
      configured: true,
      dashboardUrl: "https://console.neon.tech",
      note: "Compute hours are only visible in Neon's console.",
      meters: [
        {
          label: "Database size",
          used: Number(dbSize[0]?.bytes ?? 0),
          limit: limits.neonStorageGb * GB,
          unit: "bytes",
          period: "total",
        },
      ],
    },
    {
      id: "vercel",
      name: "Vercel · hosting",
      configured: true,
      dashboardUrl: "https://vercel.com/dashboard",
      note: "Page views and function totals are in Vercel → Usage. Counted here: the app's own background work.",
      meters: [
        {
          label: "File-serving requests",
          used: month("r2:reads"),
          limit: limits.vercelInvocationsMonthly,
          unit: "count",
          period: "this month",
        },
        {
          label: "Scheduled job runs",
          used: month("vercel:cron_runs"),
          limit: null,
          unit: "count",
          period: "this month",
        },
      ],
    },
    {
      id: "jobs",
      name: "Job & news imports",
      configured: features.adzuna || features.jooble,
      dashboardUrl: "https://developer.adzuna.com",
      meters: [
        {
          label: "Adzuna API calls",
          used: today("adzuna:calls"),
          limit: features.adzuna ? limits.adzunaDaily : null,
          unit: "count",
          period: "today",
        },
        {
          label: "Jooble API calls",
          used: today("jooble:calls"),
          limit: features.jooble ? limits.joobleDaily : null,
          unit: "count",
          period: "today",
        },
        {
          label: "Remotive calls",
          used: month("remotive:calls"),
          limit: null,
          unit: "count",
          period: "this month",
        },
        {
          label: "News feed calls",
          used: month("devto:calls") + month("hackernews:calls") + month("rss:calls"),
          limit: null,
          unit: "count",
          period: "this month",
        },
      ],
    },
    {
      id: "turnstile",
      name: "Cloudflare Turnstile · bot checks",
      configured: features.turnstile,
      dashboardUrl: "https://dash.cloudflare.com/?to=/:account/turnstile",
      note: "Free and unlimited.",
      meters: [
        {
          label: "Contact-form checks",
          used: month("turnstile:checks"),
          limit: null,
          unit: "count",
          period: "this month",
        },
      ],
    },
  ];

  const emailSeries = Array.from({ length: 30 }, (_, i) => {
    const d = istDay(i - 29);
    const row = series.find((s) => s.day.getTime() === d.getTime());
    return { day: d.toISOString().slice(0, 10), emails: row?.count ?? 0 };
  });

  return { providers, emailSeries, alertPct: limits.alertPct, limits };
}

/** Meters at or above the alert threshold — shown as a banner and emailed daily. */
export function usageAlerts(providers: ProviderUsage[], alertPct: number) {
  return providers.flatMap((p) =>
    p.meters
      .filter((m) => m.limit && m.used / m.limit >= alertPct / 100)
      .map((m) => ({
        provider: p.name,
        label: m.label,
        period: m.period,
        pct: Math.round((m.used / m.limit!) * 100),
      })),
  );
}

/** Emails the team once per day when any meter crosses the alert threshold (called from the nightly cron). */
export async function sendUsageAlertIfNeeded() {
  const { providers, alertPct } = await getUsageSummary();
  const alerts = usageAlerts(providers, alertPct);
  if (!alerts.length) return { alerts: 0, emailed: false };

  const day = istDay();
  const already = await db.usageCounter.findUnique({
    where: {
      provider_metric_day: { provider: "system", metric: "usage_alert", day },
    },
  });
  if (already) return { alerts: alerts.length, emailed: false };

  const [{ sendEmail, contactInbox }, { siteConfig }] = await Promise.all([import("@/lib/email"), import("@/lib/site")]);
  await sendEmail(contactInbox(), {
    subject: `[Destiny Dots] ${alerts.length} service limit${alerts.length === 1 ? "" : "s"} nearly reached`,
    preheader: alerts.map((a) => `${a.provider}: ${a.pct}%`).join(", "),
    heading: "Some services are close to their plan limits",
    paragraphs: ["Review usage and upgrade the plan if needed, so nothing stops working for students."],
    details: alerts.map((a) => [`${a.provider} — ${a.label} (${a.period})`, `${a.pct}%`]),
    action: {
      label: "Open usage dashboard",
      url: new URL("/welcome?next=/admin/usage", siteConfig.url).toString(),
    },
    footerNote: "Sent at most once a day by the nightly maintenance job.",
  });
  await trackUsage("system", "usage_alert");
  return { alerts: alerts.length, emailed: true };
}
