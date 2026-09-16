import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrbitingDomains } from "@/components/effects/orbit";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { pricing } from "@/lib/pricing";

export function CtaBand({
  title = "Your next dot is waiting.",
  description = `Create a free account, take a 60-second quiz and get paths picked for you. The first ${pricing.freeDotsPerPath} dots of every path are on us.`,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal>
        <div className="relative isolate grid items-center gap-8 overflow-hidden rounded-3xl border bg-card px-6 py-12 shadow-xl shadow-foreground/5 sm:px-12 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]" aria-hidden />
          <div className="absolute top-1/2 right-0 -z-10 size-96 translate-x-1/4 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden />

          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{title}</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 rounded-full px-6 shadow-lg shadow-primary/25">
                <Link href="/signup">
                  Get started free <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
                <Link href="/resources">Explore resources</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto hidden w-full max-w-[360px] md:block">
            <OrbitingDomains />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
