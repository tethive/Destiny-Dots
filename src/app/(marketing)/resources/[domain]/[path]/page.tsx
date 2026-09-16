import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BarChart3, Check, ChevronRight, Clock, Layers, ShieldCheck, Timer } from "lucide-react";
import { DomainBadge, domainTheme } from "@/components/domain";
import { DotMap } from "@/components/dot-map";
import { GridBackdrop } from "@/components/effects/orbit";
import { Reveal, SplitText, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PathCard } from "@/components/path-card";
import { Button } from "@/components/ui/button";
import { getDomain, pathHours, pathHref } from "@/lib/catalog";
import { getPathBySlug, publicPaths, toPublicPath } from "@/server/catalog";
import { formatINR, savingPct } from "@/lib/pricing";
import { displayPrices } from "@/server/payments";

async function getPath(domain: string, slug: string) {
  const row = await getPathBySlug(slug);
  return row && row.isPublished && row.domainTag === domain ? toPublicPath(row) : null;
}

export async function generateMetadata(props: PageProps<"/resources/[domain]/[path]">): Promise<Metadata> {
  const { domain, path: slug } = await props.params;
  const path = await getPath(domain, slug);
  if (!path) return {};
  return {
    title: `${path.title} roadmap`,
    description: `${path.summary} ${path.dots.length} dots · ${path.duration}.`,
  };
}

export default async function PathPage(props: PageProps<"/resources/[domain]/[path]">) {
  const params = await props.params;
  const path = await getPath(params.domain, params.path);
  if (!path) notFound();
  const domain = getDomain(path.domainTag)!;
  const row = await getPathBySlug(path.slug);
  const prices = await displayPrices(row?.id);

  const href = pathHref(path);
  const enrolHref = `/signup?next=${encodeURIComponent(`/learn/${path.slug}`)}&intent=enrol`;
  const freeDots = path.dots.filter((d) => d.isFree).length;
  const cert = path.dots.find((d) => d.certification)?.certification;
  const related = (await publicPaths())
    .filter((p) => p.domainTag === path.domainTag)
    .filter((p) => p.slug !== path.slug && p.isPublished)
    .slice(0, 3);

  const stats = [
    { icon: Layers, label: "Dots", value: `${path.dots.length} milestones` },
    { icon: Clock, label: "Duration", value: path.duration },
    { icon: Timer, label: "Effort", value: `~${pathHours(path)} hours` },
    { icon: BarChart3, label: "Level", value: path.level },
  ];

  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden border-b pt-16">
        <GridBackdrop tint={domainTheme[domain.tag].hex} />
        <div className="container-page py-12 sm:py-16">
          <Reveal>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <Link href="/resources" className="hover:text-foreground">
                Resources
              </Link>
              <ChevronRight className="size-4" aria-hidden />
              <Link href={`/resources/${domain.tag}`} className="hover:text-foreground">
                {domain.name}
              </Link>
              <ChevronRight className="size-4" aria-hidden />
              <span className="text-foreground">{path.title}</span>
            </nav>
          </Reveal>

          <div className="mt-8 max-w-3xl">
            <DomainBadge tag={domain.tag} label={domain.name} />
            <h1 className="mt-4 text-[clamp(2.25rem,5.5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
              <SplitText text={path.title} />
            </h1>
            <Reveal delay={0.2}>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{path.summary}</p>
            </Reveal>
          </div>

          <Stagger className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <StaggerItem key={label}>
                <div className="rounded-xl border bg-card/80 px-4 py-3 backdrop-blur">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.3} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-11 rounded-full px-6 shadow-lg shadow-primary/25">
              <Link href={enrolHref}>Enrol free</Link>
            </Button>
            <p className="text-sm text-muted-foreground">Starts tracking your progress · first {freeDots} dots free</p>
          </Reveal>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_340px] lg:gap-14">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">The roadmap</h2>
            <span className="text-sm text-muted-foreground">
              {freeDots} free · {path.dots.length - freeDots} locked
            </span>
          </div>
          <p className="mt-2 mb-8 text-muted-foreground">Tap an open dot to preview its resources.</p>
          <DotMap path={path} prices={prices} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="border-beam shadow-xl shadow-primary/10">
            <div className="rounded-2xl bg-card p-5">
              <p className="text-sm text-muted-foreground">Unlock all {path.dots.length} dots</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {formatINR(prices.monthly)}
                <span className="text-base font-normal text-muted-foreground"> / month</span>
              </p>
              <p className="mt-1 text-sm text-primary">
                or {formatINR(prices.yearly)} a year — save {savingPct(prices)}%
              </p>
              <div className="mt-5 space-y-2.5">
                <Button asChild size="lg" className="h-10 w-full rounded-full">
                  <Link href="/signup?next=%2Fbilling&intent=subscribe">Subscribe</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-10 w-full rounded-full">
                  <Link href={`/signup?next=${encodeURIComponent(href)}&intent=path`}>
                    Unlock this path — {formatINR(prices.path)}
                  </Link>
                </Button>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" aria-hidden /> Or unlock single dots from{" "}
                {formatINR(prices.dot)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="font-semibold">What you&apos;ll be able to do</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {path.outcomes.map((o) => (
                <li key={o} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>{o}</span>
                </li>
              ))}
            </ul>

            {path.roles.length > 0 && (
              <>
                <h3 className="mt-6 font-semibold">Roles this leads to</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {path.roles.map((role) => (
                    <span key={role} className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </>
            )}

            {cert && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm">
                <Award className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <span>
                  Ends with a certification dot: <span className="font-semibold">{cert}</span>
                </span>
              </div>
            )}
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="border-t bg-muted/30 py-14 sm:py-16">
          <div className="container-page">
            <h2 className="text-2xl font-semibold tracking-tight">More in {domain.name}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PathCard key={p.slug} path={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky enrol bar — sits above the bottom dock */}
      <div className="sticky bottom-[5.25rem] z-30 mx-3 mb-3 rounded-2xl border bg-background/90 p-3 shadow-xl backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{path.title}</p>
            <p className="text-xs text-muted-foreground">First {freeDots} dots free</p>
          </div>
          <Button asChild size="lg" className="rounded-full px-4">
            <Link href={enrolHref}>Enrol free</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
