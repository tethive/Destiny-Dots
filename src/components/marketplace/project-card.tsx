import Link from "next/link";
import { Star, Store } from "lucide-react";
import { DomainIcon } from "@/components/domain";
import type { DomainTag } from "@/lib/catalog";
import { skillLevelLabels } from "@/lib/labels";
import { formatINR } from "@/lib/pricing";
import type { ProjectCard as ProjectCardData } from "@/server/marketplace";

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" />
      <span className="tabular-nums">{value ? value.toFixed(1) : "New"}</span>
      {count !== undefined && count > 0 && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}

export function ProjectCard({ project: p, owned }: { project: ProjectCardData; owned?: boolean }) {
  const cover = p.files[0]?.key;
  const seller = p.seller.sellerProfile?.displayName ?? p.seller.name;
  return (
    <Link
      href={`/marketplace/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${cover}`} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Store className="size-8" />
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur">{skillLevelLabels[p.level]}</span>
        {owned && <span className="absolute top-3 right-3 rounded-full bg-success px-2 py-0.5 text-xs font-semibold text-white">Owned</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5">
          {p.domainTags.slice(0, 2).map((t) => (
            <DomainIcon key={t} tag={t as DomainTag} className="size-6 rounded-full [&_svg]:size-3" />
          ))}
          <span className="ml-auto text-xs">
            <Stars value={p.ratingAvg} count={p.ratingCount} />
          </span>
        </div>
        <p className="mt-3 line-clamp-2 font-semibold group-hover:text-primary">{p.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {p.techStack.slice(0, 4).map((t) => (
            <span key={t} className="rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <span className="truncate text-xs text-muted-foreground">
            by {seller}
            {p.salesCount > 0 && ` · ${p.salesCount} sold`}
          </span>
          <span className="text-lg font-semibold tabular-nums">{formatINR(p.priceInr)}</span>
        </div>
      </div>
    </Link>
  );
}
