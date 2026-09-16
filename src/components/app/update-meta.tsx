import { DomainBadge } from "@/components/domain";
import { getDomain, type DomainTag } from "@/lib/catalog";

export function UpdateMeta({ tags, date, minutes, sample }: { tags: string[]; date: Date | null; minutes: number; sample?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {tags.map((t) => (
        <DomainBadge key={t} tag={t as DomainTag} label={getDomain(t)?.short ?? t} />
      ))}
      {date && <span>{date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
      <span>· {minutes} min read</span>
      {sample && <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-amber-700 dark:text-amber-400">Sample</span>}
    </div>
  );
}
