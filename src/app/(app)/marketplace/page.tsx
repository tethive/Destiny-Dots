import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, Search, ShoppingBag, Store } from "lucide-react";
import { FilterSelect } from "@/components/app/filter-select";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/marketplace/project-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Level } from "@/generated/prisma/client";
import { domains } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { browseProjects, type BrowseFilter } from "@/server/marketplace";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Project marketplace" };

const sorts = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Best selling" },
  { value: "rating", label: "Top rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export default async function MarketplacePage(props: PageProps<"/marketplace">) {
  const user = await requireUser("/marketplace");
  const sp = await props.searchParams;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const filter: BrowseFilter = {
    q: str(sp.q)?.slice(0, 80),
    domain: str(sp.domain),
    level: ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(str(sp.level) ?? "") ? (str(sp.level) as Level) : undefined,
    sort: sorts.some((s) => s.value === str(sp.sort)) ? (str(sp.sort) as BrowseFilter["sort"]) : "new",
  };
  const [settings, projects, owned] = await Promise.all([
    getSetting("marketplace"),
    browseProjects(filter),
    db.projectPurchase.findMany({ where: { buyerId: user.id, status: { not: "REFUNDED" } }, select: { projectId: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.projectId));

  if (!settings.enabled) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState icon={Store} title="The marketplace is taking a short break" description="Your purchases stay available from the purchases page." action={<Button asChild variant="outline"><Link href="/marketplace/purchases">My purchases</Link></Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Project marketplace"
        description="Real projects built by students — browse the code in the app, learn how it works, and build your own."
        actions={
          <>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/marketplace/purchases">
                <ShoppingBag data-icon="inline-start" /> Purchases
              </Link>
            </Button>
            <Button asChild size="lg" className="rounded-full">
              <Link href="/marketplace/sell">
                <Store data-icon="inline-start" /> Sell a project
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <form className="relative min-w-56 flex-1 sm:max-w-sm" action="/marketplace">
          {filter.domain && <input type="hidden" name="domain" value={filter.domain} />}
          {filter.level && <input type="hidden" name="level" value={filter.level} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={filter.q} maxLength={80} placeholder="Search projects or tech (e.g. React)" className="h-10 rounded-full pl-9" />
        </form>
        <FilterSelect param="domain" placeholder="All domains" value={filter.domain} options={domains.map((d) => ({ value: d.tag, label: d.name }))} />
        <FilterSelect
          param="level"
          placeholder="All levels"
          value={filter.level}
          options={[
            { value: "BEGINNER", label: "Beginner" },
            { value: "INTERMEDIATE", label: "Intermediate" },
            { value: "ADVANCED", label: "Advanced" },
          ]}
        />
        <FilterSelect param="sort" placeholder="Newest" value={filter.sort === "new" ? undefined : filter.sort} options={sorts.filter((s) => s.value !== "new")} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={filter.q || filter.domain || filter.level ? "No projects match" : "Be the first to list a project"}
          description={filter.q || filter.domain || filter.level ? "Try a different search or clear the filters." : "Share a project you're proud of and earn when other students buy it."}
          action={
            <Button asChild>
              <Link href={filter.q || filter.domain || filter.level ? "/marketplace" : "/marketplace/sell"}>{filter.q || filter.domain || filter.level ? "Clear filters" : "Start selling"}</Link>
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <StaggerItem key={p.id} className="h-full">
              <ProjectCard project={p} owned={ownedIds.has(p.id)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Projects are for learning and portfolio reference. Submitting someone else&apos;s work as your own academic assignment may break your institution&apos;s rules.
      </p>
    </div>
  );
}
