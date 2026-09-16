import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, Layers, Search } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DomainIcon, domainVars } from "@/components/domain";
import { Input } from "@/components/ui/input";
import { domains, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getPublishedPaths, levelName } from "@/server/catalog";
import { getCompletedDotIds } from "@/server/learning";

export const metadata: Metadata = { title: "Explore paths" };

export default async function ExplorePage(props: PageProps<"/explore">) {
  const user = await requireUser("/explore");
  const sp = await props.searchParams;
  const domainFilter = typeof sp.domain === "string" ? sp.domain : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const [paths, enrollments, completed] = await Promise.all([
    getPublishedPaths(),
    db.enrollment.findMany({ where: { userId: user.id }, select: { pathId: true } }),
    getCompletedDotIds(user.id),
  ]);
  const enrolled = new Set(enrollments.map((e) => e.pathId));

  const filtered = paths.filter((p) => {
    if (domainFilter && p.domainTag !== domainFilter) return false;
    if (!q) return true;
    return [p.title, p.summary, ...p.roles, ...p.dots.map((d) => d.title)].some((s) => s.toLowerCase().includes(q));
  });

  const chip = (key: string, href: string, active: boolean, children: React.ReactNode) => (
    <Link
      key={key}
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
  const qs = (d?: string) => {
    const params = new URLSearchParams();
    if (d) params.set("domain", d);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Explore paths" description={`${paths.length} career paths across ${domains.length} domains.`} />

      <form className="relative mb-4 max-w-md" action="/explore">
        {domainFilter && <input type="hidden" name="domain" value={domainFilter} />}
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search roles, tools or topics…" className="h-10 pl-9" />
      </form>

      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip("all", qs(), !domainFilter, "All")}
        {domains.map((d) =>
          chip(
            d.tag,
            qs(d.tag),
            domainFilter === d.tag,
            <>
              <span style={domainVars(d.tag)} className="d-solid size-2 rounded-full" /> {d.short}
            </>,
          ),
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No paths match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const tag = p.domainTag as DomainTag;
            const done = p.dots.filter((d) => completed.has(d.id)).length;
            const isEnrolled = enrolled.has(p.id);
            return (
              <Link
                key={p.id}
                href={`/learn/${p.slug}`}
                style={domainVars(tag)}
                className="group flex flex-col rounded-2xl border bg-card p-5 shadow-xs transition-colors hover:border-[color-mix(in_oklch,var(--d)_40%,var(--border))]"
              >
                <div className="flex items-center justify-between">
                  <DomainIcon tag={tag} className="size-9 [&_svg]:size-4" />
                  {isEnrolled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                      <Check className="size-3" /> Enrolled
                    </span>
                  )}
                </div>
                <p className="mt-4 font-semibold">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Layers className="size-3.5" /> {p.dots.length} dots</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {p.duration}</span>
                  <span>{levelName(p.level)}</span>
                </div>
                {done > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="d-solid h-full rounded-full" style={{ width: `${(done / p.dots.length) * 100}%` }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
