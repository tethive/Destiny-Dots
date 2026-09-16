import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Briefcase, FileUser, Lock, Newspaper } from "lucide-react";
import { BrowseCatalog } from "@/components/browse-catalog";
import { DomainCard } from "@/components/domain-card";
import { OrbitingDomains } from "@/components/effects/orbit";
import { CtaBand } from "@/components/marketing/cta-band";
import { SearchLauncher } from "@/components/marketing/search-launcher";
import { PageHero, SectionHeading } from "@/components/marketing/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { domains } from "@/lib/catalog";
import { publicPaths, publicStats } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Resources — career paths for 11 tech domains",
  description:
    "Explore roadmaps for Cybersecurity, Ethical Hacking, AI/ML, Cloud, Data Engineering, Data Analysis, Blockchain, Full Stack, IoT, 5G and AR/VR.",
};

const memberTools = [
  { icon: Award, title: "Certification guides", body: "Exam format, difficulty and prep plans." },
  { icon: Briefcase, title: "Job listings", body: "Curated openings for your domain and level." },
  { icon: Newspaper, title: "Tech updates", body: "A weekly digest filtered to your interests." },
  { icon: FileUser, title: "Resume builder", body: "Live preview and PDF export." },
];

export default async function ResourcesPage() {
  const [stats, paths] = await Promise.all([publicStats(), publicPaths()]);

  return (
    <>
      <PageHero
        eyebrow={
          <>
            Resources · {stats.domains} domains · {stats.paths} paths
          </>
        }
        title="Every roadmap,"
        highlight="out in the open."
        description="Pick a domain, open a career path and see every dot — free and locked — before you sign up."
        aside={<OrbitingDomains className="mx-auto w-full max-w-[420px]" />}
      >
        <SearchLauncher className="mt-8" />
      </PageHero>

      <section className="container-page py-16 sm:py-20">
        <SectionHeading align="left" eyebrow="Domains" title="Choose a domain" />
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      <section className="border-y bg-muted/30 py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="All career paths"
            title="Search the full catalogue"
            description="Filter by domain or search by role, tool or topic."
          />
          <Reveal className="mt-10">
            <BrowseCatalog domains={domains} paths={paths} />
          </Reveal>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Also inside your account"
          title="Tools for the last mile"
          description="Free members get a taste; Pro unlocks everything."
        />
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {memberTools.map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <Link
                href="/signup"
                className="group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <Lock className="size-4 text-muted-foreground" aria-label="Requires an account" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Sign up to access <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <CtaBand
        title="Not sure where to start?"
        description="Sign up free and take a 60-second quiz — we'll recommend two or three paths that match your stage, interests and weekly time."
      />
    </>
  );
}
