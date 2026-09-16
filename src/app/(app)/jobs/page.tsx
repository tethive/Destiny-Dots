import type { Metadata } from "next";
import { Briefcase, ExternalLink, MapPin } from "lucide-react";
import { SaveJobButton } from "@/components/app/save-job-button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { DomainIcon } from "@/components/domain";
import { FilterSelect } from "@/components/app/filter-select";
import { Button } from "@/components/ui/button";
import type { ExperienceLevel, Prisma, WorkMode } from "@/generated/prisma/client";
import { domains, getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { levelLabels, workModeLabels } from "@/lib/labels";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Job listings" };

const levels: Record<ExperienceLevel, string> = levelLabels;
const modes: Record<WorkMode, string> = workModeLabels;

function timeAgo(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

export default async function JobsPage(props: PageProps<"/jobs">) {
  const user = await requireUser("/jobs");
  const sp = await props.searchParams;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const domain = str(sp.domain);
  const level = str(sp.level) as ExperienceLevel | undefined;
  const mode = str(sp.mode) as WorkMode | undefined;
  const path = str(sp.path);
  const saved = sp.saved === "1";

  const where: Prisma.JobListingWhereInput = {
    isPublished: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ...(domain ? { domainTags: { has: domain } } : {}),
    ...(level && level in levels ? { level } : {}),
    ...(mode && mode in modes ? { workMode: mode } : {}),
    ...(path ? { pathSlugs: { has: path } } : {}),
    ...(saved ? { saves: { some: { userId: user.id } } } : {}),
  };

  const [jobs, savedRows] = await Promise.all([
    db.jobListing.findMany({ where, orderBy: { postedAt: "desc" }, take: 60 }),
    db.savedJob.findMany({ where: { userId: user.id }, select: { jobId: true } }),
  ]);
  const savedIds = new Set(savedRows.map((s) => s.jobId));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Job listings" description="Openings curated by our team for each domain. Applications happen on the employer's site." />

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterSelect param="domain" placeholder="All domains" value={domain} options={domains.map((d) => ({ value: d.tag, label: d.name }))} />
        <FilterSelect param="level" placeholder="Any level" value={level} options={Object.entries(levels).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="mode" placeholder="Any work mode" value={mode} options={Object.entries(modes).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="saved" placeholder="All jobs" value={saved ? "1" : undefined} options={[{ value: "1", label: "Saved jobs" }]} />
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No matching jobs" description="Try removing a filter — new openings are added every week." />
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => {
            const tag = j.domainTags[0] as DomainTag | undefined;
            return (
              <li key={j.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
                {tag && <DomainIcon tag={tag} className="size-11 rounded-xl" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{j.title}</p>
                    {j.isSample && <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">Sample</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{j.company}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                      <MapPin className="size-3" /> {j.location}
                    </span>
                    <span className="rounded-full border px-2 py-0.5">{modes[j.workMode]}</span>
                    <span className="rounded-full border px-2 py-0.5">{levels[j.level]}</span>
                    {tag && <span className="rounded-full border px-2 py-0.5">{getDomain(tag)?.short}</span>}
                    {j.salary && <span className="rounded-full border px-2 py-0.5">{j.salary}</span>}
                    <span className="px-1 py-0.5 text-muted-foreground">{timeAgo(j.postedAt)}</span>
                  </div>
                  {j.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <SaveJobButton jobId={j.id} saved={savedIds.has(j.id)} />
                  <Button asChild size="lg" className="rounded-full">
                    <a href={j.url} target="_blank" rel="noopener noreferrer">
                      Apply <ExternalLink data-icon="inline-end" />
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
