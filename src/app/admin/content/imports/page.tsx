import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { ImportQueue, ImportSettingsForm, RunImportButton } from "@/components/admin/import-tools";
import { PageHeader } from "@/components/app/page-header";
import { getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Auto-imports" };

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function ImportsPage() {
  await requireAdmin();
  const [settings, jobs, updates, lastRuns, counts] = await Promise.all([
    getSetting("imports"),
    db.jobListing.findMany({ where: { source: { not: "manual" }, isPublished: false }, orderBy: { postedAt: "desc" }, take: 200 }),
    db.techUpdate.findMany({ where: { source: { not: "manual" }, isPublished: false }, orderBy: { publishedAt: "desc" }, take: 200 }),
    db.auditLog.findMany({ where: { action: { in: ["import.jobs", "import.updates"] } }, orderBy: { createdAt: "desc" }, take: 2 }),
    Promise.all([
      db.jobListing.count({ where: { source: { not: "manual" }, isPublished: true } }),
      db.techUpdate.count({ where: { source: { not: "manual" }, isPublished: true } }),
    ]),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Auto-imports"
        description={`Fresh jobs and tech news pulled daily from public APIs. ${counts[0]} imported jobs and ${counts[1]} updates are live.`}
        actions={
          <>
            <RunImportButton kind="updates" />
            <RunImportButton kind="jobs" />
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Scheduled on Vercel Cron: updates at 06:30 IST, jobs at 07:00 IST, and nightly maintenance (expire old jobs, re-check links, clear stale imports). Manual runs are logged
          {lastRuns.length ? ` — last run ${when(lastRuns[0].createdAt)}` : ""}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <h2 className="p-5 pb-2 font-semibold">Jobs waiting for review ({jobs.length})</h2>
          <ImportQueue
            kind="jobs"
            items={jobs.map((j) => ({
              id: j.id,
              title: `${j.title} — ${j.company}`,
              meta: `${j.source} · ${j.location} · ${j.domainTags.map((t) => getDomain(t)?.short ?? t).join(", ")}`,
              url: j.url,
            }))}
          />
        </section>
        <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <h2 className="p-5 pb-2 font-semibold">Updates waiting for review ({updates.length})</h2>
          <ImportQueue
            kind="updates"
            items={updates.map((u) => ({
              id: u.id,
              title: u.title,
              meta: `${u.sourceName ?? u.source} · ${u.domainTags.map((t) => getDomain(t)?.short ?? t).join(", ") || "all domains"}`,
              url: u.sourceUrl ?? "#",
            }))}
          />
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="mb-4 font-semibold">Settings</h2>
        <ImportSettingsForm initial={settings} keys={{ adzuna: features.adzuna, jooble: features.jooble }} />
      </section>
    </div>
  );
}
