import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Layers, Sparkles } from "lucide-react";
import { DomainBadge } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { requireUser } from "@/lib/session";
import { enrolAndStart } from "@/server/actions/student";
import { levelName } from "@/server/catalog";
import { getRecommendations } from "@/server/learning";

export const metadata: Metadata = { title: "Your recommended paths" };

export default async function RecommendationsPage(props: PageProps<"/onboarding/recommendations">) {
  const user = await requireUser("/onboarding");
  const [recs, { next }] = await Promise.all([getRecommendations(user.id, 3), props.searchParams]);

  return (
    <div className="mx-auto max-w-4xl pt-6 sm:pt-12">
      <p className="eyebrow flex items-center gap-1.5">
        <Sparkles className="size-3.5" /> Picked for you
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Your best-fit career paths</h1>
      <p className="mt-2 text-muted-foreground">
        Based on your answers. Enrolling is free — the first dots of every path are open straight away.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {recs.map(({ path, reason, hours }, i) => {
          const domain = getDomain(path.domainTag)!;
          return (
            <div
              key={path.id}
              className={`flex flex-col rounded-2xl border bg-card p-5 shadow-xs ${i === 0 ? "border-primary/50 ring-4 ring-primary/10" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <DomainBadge tag={path.domainTag as DomainTag} label={domain.short} />
                {i === 0 && <span className="text-xs font-medium text-primary">Top match</span>}
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">{path.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{path.summary}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Layers className="size-4" /> {path.dots.length} dots · {levelName(path.level)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="size-4" /> {path.duration} · ~{hours}h
                </li>
              </ul>
              <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">{reason}</p>
              <form action={enrolAndStart.bind(null, path.id)} className="mt-5">
                <Button type="submit" size="lg" className="h-10 w-full rounded-full" variant={i === 0 ? "default" : "outline"}>
                  Start this path <ArrowRight data-icon="inline-end" />
                </Button>
              </form>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild variant="ghost" size="lg">
          <Link href="/explore">Browse all paths</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href={typeof next === "string" && next.startsWith("/") ? next : "/dashboard"}>Go to my dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
