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
import { domains, getDomain } from "@/lib/catalog";
import { publicPaths } from "@/server/catalog";

export async function generateMetadata(props: PageProps<"/resources/[domain]">): Promise<Metadata> {
  const { domain: tag } = await props.params;
  const domain = getDomain(tag);
  if (!domain) return {};
  return { title: `${domain.name} career paths`, description: domain.description };
}

export default async function DomainPage(props: PageProps<"/resources/[domain]">) {
  const { domain: tag } = await props.params;
  const domain = getDomain(tag);
  if (!domain) notFound();

  const domainPaths = (await publicPaths()).filter((p) => p.domainTag === domain.tag);
  const published = domainPaths.filter((p) => p.isPublished);
  const upcoming = domainPaths.filter((p) => !p.isPublished);
  const others = domains.filter((d) => d.tag !== domain.tag).slice(0, 4);

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
                All {domains.length} domains <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((d) => (
              <StaggerItem key={d.tag}>
                <DomainCard domain={d} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
