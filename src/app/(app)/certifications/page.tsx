import type { Metadata } from "next";
import Link from "next/link";
import { Award, Clock } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { DomainIcon, domainVars } from "@/components/domain";
import { domains, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { difficultyLabel } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Certification guides" };

export default async function CertificationsPage(props: PageProps<"/certifications">) {
  await requireUser("/certifications");
  const { domain } = await props.searchParams;
  const filter = typeof domain === "string" ? domain : undefined;
  const certs = await db.certificationGuide.findMany({
    where: { isPublished: true, ...(filter ? { domainTags: { has: filter } } : {}) },
    orderBy: { name: "asc" },
  });
  const usedDomains = domains.filter((d) => d.certifications.length > 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Certification guides" description="What each exam covers, how hard it is and how long to prepare — linked to the paths that lead there." />

      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ tag: undefined, short: "All" }, ...usedDomains].map((d) => (
          <Link
            key={d.short}
            href={d.tag ? `/certifications?domain=${d.tag}` : "/certifications"}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium",
              filter === d.tag ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {d.short}
          </Link>
        ))}
      </div>

      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No guides yet" description="Certification guides for this domain are on the way." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => {
            const tag = c.domainTags[0] as DomainTag | undefined;
            return (
              <Link
                key={c.id}
                href={`/certifications/${c.slug}`}
                style={tag ? domainVars(tag) : undefined}
                className="group flex flex-col rounded-2xl border bg-card p-5 shadow-xs transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
                    <Award className="size-5" />
                  </span>
                  <div className="flex -space-x-1.5">
                    {c.domainTags.slice(0, 2).map((t) => (
                      <DomainIcon key={t} tag={t as DomainTag} className="size-7 rounded-full ring-2 ring-card [&_svg]:size-3.5" />
                    ))}
                  </div>
                </div>
                <p className="mt-4 font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.provider}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.overview}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs">
                  <span className="rounded-full border bg-muted/40 px-2 py-0.5">{difficultyLabel[c.difficulty]}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" /> {c.prepTime}
                  </span>
                  {c.isSample && <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-amber-700 dark:text-amber-400">Sample</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
