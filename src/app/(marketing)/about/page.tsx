import type { Metadata } from "next";
import { Compass, Layers, ListChecks, RefreshCw, Rocket, Search, ShieldCheck, Target } from "lucide-react";
import { DomainIcon } from "@/components/domain";
import { IsoStack } from "@/components/effects/emblems";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero, SectionHeading } from "@/components/marketing/section";
import { Counter } from "@/components/motion/counter";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { domains } from "@/lib/catalog";
import { publicStats } from "@/server/catalog";

export const metadata: Metadata = {
  title: "About",
  description: "Why we built Destiny Dots and how we curate every career path.",
};

const principles = [
  {
    icon: Compass,
    title: "The whole map, upfront",
    body: "You see every dot of a path before you start — locked ones included. Knowing where you're headed is half the motivation.",
  },
  {
    icon: ListChecks,
    title: "Curated, not aggregated",
    body: "The internet has infinite tutorials. We pick the few that matter, in the right order, and tell you when you're done.",
  },
  {
    icon: Target,
    title: "Job-oriented by design",
    body: "Paths are built backwards from real roles and the certifications employers ask for — not from what's trending this week.",
  },
  {
    icon: RefreshCw,
    title: "Kept fresh",
    body: "Resources in fast-moving fields go stale quickly. Our team reviews content regularly and replaces broken or outdated links.",
  },
];

const buildSteps = [
  { icon: Search, title: "Research the role", body: "Job descriptions, hiring managers and certification blueprints define the destination." },
  { icon: Layers, title: "Break it into dots", body: "Each milestone is small enough to finish in a few weeks, with a clear definition of done." },
  { icon: ShieldCheck, title: "Hand-pick resources", body: "Free first, premium when it's genuinely better. Every link is reviewed by the team." },
  { icon: Rocket, title: "Publish & improve", body: "Paths go live only when complete, then improve as we see where students get stuck." },
];

export default async function AboutPage() {
  const stats = await publicStats();

  return (
    <>
      <PageHero
        eyebrow="About Destiny Dots"
        title="Connecting where you are to"
        highlight="where you want to be."
        description="Students have more learning material than ever — and less clarity about what to learn next. We're fixing that, one dot at a time."
        aside={<IsoStack />}
      />

      {/* Story + mission */}
      <section className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <Reveal className="space-y-5 text-[1.05rem] leading-8 text-muted-foreground">
          <p className="text-2xl leading-snug font-semibold tracking-tight text-foreground sm:text-3xl">
            Ask ten people how to become a SOC analyst and you&apos;ll get ten answers, a hundred links and no sense of
            order.
          </p>
          <p>
            Many students spend months jumping between courses without ever feeling job-ready. We think a career path
            should work like a transit map. Each stop — each <span className="font-medium text-foreground">dot</span> — is
            a clear milestone with the best resources we could find, a realistic time estimate and a checkpoint to prove
            you got it.
          </p>
          <p>
            Complete a dot, and the next one lights up. That&apos;s the whole idea — and it works across every field we
            cover, from ethical hacking to AR/VR.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-xl shadow-foreground/5 sm:p-10">
            <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
            <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <p className="eyebrow relative">Our mission</p>
            <p className="relative mt-4 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
              Help every student find the right path — and the right resources — to build the career they want.
            </p>
            <div className="relative mt-10 grid grid-cols-3 gap-4 border-t pt-6">
              {[
                { v: stats.domains, l: "Domains" },
                { v: stats.paths, l: "Career paths" },
                { v: stats.dots, l: "Dots" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-3xl font-semibold tracking-tight">
                    <Counter to={s.v} />
                  </p>
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Principles */}
      <section className="border-y bg-muted/30 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading eyebrow="What we believe" title="Four rules we build by" />
          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2">
            {principles.map(({ icon: Icon, title, body }, i) => (
              <StaggerItem key={title}>
                <TiltCard max={4} className="rounded-2xl">
                  <div className="h-full rounded-2xl border bg-card p-7 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* How a roadmap gets made */}
      <section className="container-page py-20 sm:py-28">
        <SectionHeading
          eyebrow="Behind every path"
          title="How a roadmap gets made"
          description="Content on Destiny Dots is created and reviewed by our team only — no anonymous uploads."
        />
        <div className="relative mx-auto mt-14 max-w-3xl">
          <span className="absolute top-6 bottom-6 left-6 w-px bg-linear-to-b from-primary via-primary/40 to-transparent" aria-hidden />
          <ol className="space-y-5">
            {buildSteps.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 0.06} className="relative flex gap-6">
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border bg-background text-primary shadow-sm">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="flex-1 rounded-2xl border bg-card p-5 shadow-xs">
                  <p className="font-mono text-[11px] text-muted-foreground">STEP 0{i + 1}</p>
                  <h3 className="mt-1 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1 text-muted-foreground">{body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Domains strip */}
      <section className="border-y bg-muted/30 py-14">
        <div className="container-page">
          <Reveal>
            <p className="text-center text-sm text-muted-foreground">The domains we cover</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {domains.map((d) => (
                <span key={d.tag} className="inline-flex items-center gap-2 rounded-full border bg-background py-1 pr-3.5 pl-1 text-sm font-medium">
                  <DomainIcon tag={d.tag} className="size-7 rounded-full [&_svg]:size-3.5" />
                  {d.name}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
