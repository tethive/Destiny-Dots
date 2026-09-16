"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PathCard } from "@/components/path-card";
import { domainVars } from "@/components/domain";
import { Input } from "@/components/ui/input";
import type { CareerPath, Domain, DomainTag } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function BrowseCatalog({ domains, paths }: { domains: Domain[]; paths: CareerPath[] }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<DomainTag | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return paths.filter((p) => {
      if (domain !== "all" && p.domainTag !== domain) return false;
      if (!q) return true;
      return [p.title, p.summary, ...p.roles, ...p.dots.map((d) => d.title)].some((s) => s.toLowerCase().includes(q));
    });
  }, [paths, query, domain]);

  const published = results.filter((p) => p.isPublished);
  const upcoming = results.filter((p) => !p.isPublished);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search paths, roles or topics…"
            aria-label="Search paths"
            className="h-11 bg-card pl-9 pr-9 text-base shadow-sm sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by domain">
          <Chip active={domain === "all"} onClick={() => setDomain("all")}>
            All domains
          </Chip>
          {domains.map((d) => (
            <Chip key={d.tag} active={domain === d.tag} onClick={() => setDomain(d.tag)}>
              <span style={domainVars(d.tag)} className="d-solid size-2 rounded-full" aria-hidden />
              {d.name}
            </Chip>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {published.length} {published.length === 1 ? "path" : "paths"} available
        {upcoming.length > 0 && ` · ${upcoming.length} in the works`}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-12 text-center">
          <p className="font-semibold">No paths match “{query}”</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a role like “analyst” or a topic like “SQL”.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((p) => (
              <PathCard key={p.slug} path={p} showDomain />
            ))}
          </div>

          {upcoming.length > 0 && (
            <>
              <h2 className="mt-14 text-lg font-semibold">In the works</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re building these with practitioners before we publish them.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((p) => (
                  <PathCard key={p.slug} path={p} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
