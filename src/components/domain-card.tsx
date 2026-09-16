import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DomainIcon, domainVars } from "@/components/domain";
import { TiltCard } from "@/components/motion/tilt-card";
import { type Domain, getPathsByDomain } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function DomainCard({ domain, className }: { domain: Domain; className?: string }) {
  const paths = getPathsByDomain(domain.tag).filter((p) => p.isPublished);
  const dots = paths.reduce((n, p) => n + p.dots.length, 0);

  return (
    <TiltCard style={domainVars(domain.tag)} className="rounded-2xl">
      <Link
        href={`/resources/${domain.tag}`}
        className={cn(
          "group relative flex h-full min-h-48 flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-[border-color,box-shadow] hover:border-[color-mix(in_oklch,var(--d)_45%,var(--border))] hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          className,
        )}
      >
        <div className="flex items-start justify-between">
          <DomainIcon tag={domain.tag} className="size-11 rounded-xl" />
          <span className="flex size-8 items-center justify-center rounded-full border text-muted-foreground transition group-hover:border-transparent group-hover:bg-foreground group-hover:text-background">
            <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" aria-hidden />
          </span>
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{domain.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{domain.tagline}</p>
        <div className="mt-auto flex items-center gap-2 pt-5 font-mono text-[11px] text-muted-foreground">
          <span className="d-solid size-1.5 rounded-full" />
          {paths.length} {paths.length === 1 ? "path" : "paths"} · {dots} dots
        </div>
        {/* 3D depth: faint domain glow sitting behind the content */}
        <span
          className="pointer-events-none absolute -right-16 -bottom-16 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
          style={{ background: "var(--d)" }}
          aria-hidden
        />
      </Link>
    </TiltCard>
  );
}
