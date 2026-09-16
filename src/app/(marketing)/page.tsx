import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DomainCard } from "@/components/domain-card";
import { DomainIcon } from "@/components/domain";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq, generalFaqs } from "@/components/marketing/faq";
import { FeatureBento } from "@/components/marketing/feature-bento";
import { HomeHero } from "@/components/marketing/home-hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { ProductPreview } from "@/components/marketing/product-preview";
import { SectionHeading } from "@/components/marketing/section";
import { Counter } from "@/components/motion/counter";
import { Marquee } from "@/components/motion/marquee";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { domains, getDomain } from "@/lib/catalog";
import { publicDomainCounts, publicPaths, publicStats } from "@/server/catalog";
import { displayPrices } from "@/server/payments";

export default async function HomePage() {
  const [stats, domainCounts, paths, prices] = await Promise.all([publicStats(), publicDomainCounts(), publicPaths(), displayPrices()]);
  const samplePath = paths.find((p) => p.slug === "data-analyst") ?? paths[0];

  return (
    <>
      <HomeHero stats={stats} domainCounts={domainCounts} />

      {/* Domain strip */}
      <section className="border-b bg-muted/30 py-6">
        <Marquee duration={50}>
          {domains.map((d) => (
            <Link
              key={d.tag}
              href={`/resources/${d.tag}`}
              className="flex shrink-0 items-center gap-2.5 rounded-full border bg-background py-1.5 pr-4 pl-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <DomainIcon tag={d.tag} className="size-7 rounded-full [&_svg]:size-3.5" />
              {d.name}
            </Link>
          ))}
        </Marquee>
      </section>

      {/* Stats */}
      <section className="container-page py-16">
        <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
          {[
            { value: stats.domains, label: "Tech domains" },
            { value: stats.paths, label: "Career paths" },
            { value: stats.dots, label: "Milestone dots" },
            { value: stats.certifications, label: "Certification milestones" },
          ].map((s) => (
            <StaggerItem key={s.label}>
              <div className="h-full bg-card px-5 py-8 text-center sm:py-10">
                <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  <Counter to={s.value} />
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Domains */}
      <section id="domains" className="scroll-mt-20 border-y bg-muted/30 py-20 sm:py-28">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              align="left"
              eyebrow="Domains"
              title={
                <>
                  {stats.domains} domains. <span className="text-brand-gradient">One clear path</span> through each.
                </>
              }
              description="Every domain opens into job-focused career paths you can explore dot by dot."
            />
            <Reveal>
              <Button asChild variant="outline" size="lg" className="h-10 rounded-full px-4">
                <Link href="/resources">
                  All resources <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </Reveal>
          </div>

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {domains.map((d) => (
              <StaggerItem key={d.tag}>
                <DomainCard domain={d} />
              </StaggerItem>
            ))}
            <StaggerItem>
              <Link
                href="/contact"
                className="flex h-full min-h-48 flex-col justify-center rounded-2xl border border-dashed p-5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <p className="font-mono text-xs tracking-wider uppercase">+ more soon</p>
                <p className="mt-3 font-semibold text-foreground">Want another domain?</p>
                <p className="mt-1 text-sm">Tell us what to build next.</p>
              </Link>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-20 sm:py-28">
        <SectionHeading eyebrow="How it works" title="Three steps. Zero guesswork." />
        <HowItWorks />
      </section>

      {/* Product preview */}
      <section className="relative overflow-hidden border-y bg-muted/30 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="See a real path"
            title="The whole roadmap, upfront"
            description="No mystery boxes. See every dot before you start — what's free, what's locked and how long each milestone takes. Try it: open a dot."
          />
          {samplePath && <ProductPreview path={samplePath} domainName={getDomain(samplePath.domainTag)?.name ?? ""} />}
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-20 sm:py-28">
        <SectionHeading
          eyebrow="Beyond the roadmap"
          title="Everything between learning and landing the job"
          description="Your path plugs into the tools you need for the last mile."
        />
        <FeatureBento />
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-y bg-muted/30 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Pricing"
            title="Start free. Upgrade when you're ready."
            description="Try any path for free, unlock a single dot when you need it, or go Pro for all 11 domains."
          />
          <Reveal className="mt-12">
            <PricingPlans prices={prices} />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-10 py-20 sm:py-28 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title="Questions, answered"
          description={
            <>
              Can&apos;t find what you need?{" "}
              <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
                Contact us
              </Link>
              .
            </>
          }
        />
        <Reveal>
          <Faq items={generalFaqs} />
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}
