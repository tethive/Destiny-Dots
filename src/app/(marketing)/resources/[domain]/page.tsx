import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Award, ChevronRight } from "lucide-react";
import { domainTheme } from "@/components/domain";
import { DomainCard } from "@/components/domain-card";
import { DomainEmblem } from "@/components/effects/emblems";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero, SectionHeading } from "@/components/marketing/section";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { PathCard } from "@/components/path-card";
import { Button } from "@/components/ui/button";
import { getDomain, liveDomains, type Domain } from "@/lib/catalog";
import { publicDomainCounts, publicPathSummaries } from "@/server/catalog";

export async function generateMetadata(props: PageProps<"/resources/[domain]">): Promise<Metadata> {
  const { domain: tag } = await props.params;
  const domain = getDomain(tag);
  if (!domain) return {};
  if (domain.status !== "live") return { title: `${domain.name} — coming soon`, description: domain.description };
  return { title: `${domain.name} career paths`, description: domain.description };
}

export default async function DomainPage(props: PageProps<"/resources/[domain]">) {
  const { domain: tag } = await props.params;
  const domain = getDomain(tag);
  if (!domain) notFound();

  if (domain.status !== "live") return <ComingSoonDomain domain={domain} />;

  const domainCounts = await publicDomainCounts();

  const domainPaths = (await publicPathSummaries()).filter((p) => p.domainTag === domain.tag);
  const published = domainPaths.filter((p) => p.isPublished);
  const upcoming = domainPaths.filter((p) => !p.isPublished);
  const others = liveDomains()
    .filter((d) => d.tag !== domain.tag)
    .slice(0, 4);

  return (
    <>
      <PageHero
        tint={domainTheme[domain.tag].hex}
        eyebrow={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1">
            <Link href="/resources" className="hover:text-foreground">
              Resources
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="text-foreground">{domain.name}</span>
          </nav>
        }
        title={domain.name}
        description={domain.description}
        aside={<DomainEmblem tag={domain.tag} />}
      >
        {domain.certifications.length > 0 && (
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-medium">
              <Award className="size-4 text-amber-600 dark:text-amber-400" aria-hidden /> Prepares you for
            </span>
            {domain.certifications.map((c) => (
              <span key={c} className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
                {c}
              </span>
            ))}
          </div>
        )}
      </PageHero>

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          align="left"
          eyebrow={`${published.length} career ${published.length === 1 ? "path" : "paths"}`}
          title={`Paths in ${domain.name}`}
          description="Open any path to see its full dot map. The first dots are free."
        />
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((p) => (
            <StaggerItem key={p.slug}>
              <PathCard path={p} />
            </StaggerItem>
          ))}
        </Stagger>

        {upcoming.length > 0 && (
          <>
            <h2 className="mt-16 text-xl font-semibold tracking-tight">In the works</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign up and add {domain.name} to your interests — we&apos;ll tell you when these launch.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((p) => (
                <PathCard key={p.slug} path={p} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="border-y bg-muted/30 py-16 sm:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading align="left" eyebrow="Keep exploring" title="Other domains" />
            <Button asChild variant="outline" size="lg" className="hidden h-10 rounded-full px-4 sm:inline-flex">
              <Link href="/resources">
                All {liveDomains().length} domains <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((d) => (
              <StaggerItem key={d.tag}>
                <DomainCard domain={d} count={domainCounts[d.tag]} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

/** Shown for domains whose roadmaps are still being written. */
async function ComingSoonDomain({ domain }: { domain: Domain }) {
  const domainCounts = await publicDomainCounts();
  return (
    <>
      <PageHero
        tint={domainTheme[domain.tag].hex}
        eyebrow={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1">
            <Link href="/resources" className="hover:text-foreground">
              Resources
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span>{domain.name}</span>
          </nav>
        }
        title={`${domain.name} — coming soon`}
        description={`${domain.description} We're building these roadmaps now, and they'll open here as soon as the resources meet the bar.`}
      />

      <section className="container-page py-16 sm:py-20">
        <SectionHeading align="left" eyebrow="Open now" title="Start with a domain that's ready" />
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveDomains().map((d) => (
            <StaggerItem key={d.tag}>
              <DomainCard domain={d} count={domainCounts[d.tag]} />
            </StaggerItem>
          ))}
        </Stagger>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/resources">Browse all paths</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/contact">Tell us to prioritise {domain.name}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
