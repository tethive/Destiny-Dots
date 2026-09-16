import Link from "next/link";
import { ArrowRight, Clock, Hourglass } from "lucide-react";
import { type CareerPath, getDomain, pathHref } from "@/lib/catalog";
import { DomainIcon, domainVars } from "@/components/domain";
import { TiltCard } from "@/components/motion/tilt-card";
import { cn } from "@/lib/utils";

export function PathCard({ path, showDomain = false }: { path: CareerPath; showDomain?: boolean }) {
  const domain = getDomain(path.domainTag)!;

  if (!path.isPublished) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-dashed bg-muted/30 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">{path.level}</span>
          <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Hourglass className="size-3" aria-hidden /> In the works
          </span>
        </div>
        <h3 className="mt-3 font-semibold text-foreground/80">{path.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{path.summary}</p>
      </div>
    );
  }

  const free = path.dots.filter((d) => d.isFree).length;

  return (
    <TiltCard max={4} style={domainVars(path.domainTag)} className="rounded-2xl">
      <Link
        href={pathHref(path)}
        className="group relative flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-[border-color,box-shadow] hover:border-[color-mix(in_oklch,var(--d)_40%,var(--border))] hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <DomainIcon tag={path.domainTag} className="size-8 [&_svg]:size-4" />
            <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              {showDomain ? domain.short : path.level}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> {path.duration}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-semibold tracking-tight">{path.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{path.summary}</p>

        <div className="mt-5 flex items-center" aria-hidden>
          {path.dots.map((d, i) => (
            <div key={d.order} className="flex flex-1 items-center last:flex-none">
              <span className={cn("size-2 shrink-0 rounded-full", d.isFree ? "d-solid" : "border-[1.5px] border-locked bg-card")} />
              {i < path.dots.length - 1 && (
                <span className={cn("h-px flex-1", d.isFree && path.dots[i + 1].isFree ? "d-solid" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{path.dots.length} dots</span> · {free} free
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            View path <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}
