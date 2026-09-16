import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq, pricingFaqs } from "@/components/marketing/faq";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { PageHero, SectionHeading } from "@/components/marketing/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { formatINR, pricing } from "@/lib/pricing";
import { displayPrices } from "@/server/payments";

export async function generateMetadata(): Promise<Metadata> {
  const prices = await displayPrices();
  return {
    title: "Pricing",
    description: `Start free. Unlock a dot from ${formatINR(prices.dot)}, or get every path with Pro from ${formatINR(prices.monthly)}/month.`,
  };
}

type Cell = boolean | string;
const rows: { label: string; free: Cell; oneOff: Cell; pro: Cell }[] = [
  { label: "See the full dot map of every path", free: true, oneOff: true, pro: true },
  { label: "Free dots per path", free: String(pricing.freeDotsPerPath), oneOff: String(pricing.freeDotsPerPath), pro: "All" },
  { label: "Progress tracking & bookmarks", free: true, oneOff: true, pro: true },
  { label: "Locked dots", free: false, oneOff: "What you unlock", pro: "All paths" },
  { label: "Premium resources & practice sets", free: false, oneOff: "In unlocked dots", pro: true },
  { label: "Checkpoint quizzes", free: false, oneOff: "In unlocked dots", pro: true },
  { label: "Access duration", free: "—", oneOff: "Forever", pro: "While subscribed" },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto size-5 text-primary" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto size-5 text-muted-foreground/60" aria-label="Not included" />;
  return <span className="text-sm">{value}</span>;
}

export default async function PricingPage() {
  const prices = await displayPrices();
  return (
    <>
      <PageHero
        eyebrow="Pricing · INR · UPI ready"
        title="Pay for progress,"
        highlight="not promises."
        description="Every path starts free. Unlock a single dot when you need it, or go Pro for all 11 domains."
      />

      <section className="relative -mt-px pb-20 pt-16 sm:pb-24">
        <div className="container-page">
          <Reveal>
            <PricingPlans prices={prices} />
          </Reveal>
          <Stagger className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { icon: Smartphone, title: "UPI, cards & netbanking", body: "Checkout powered by Razorpay." },
              { icon: ShieldCheck, title: "Keep what you unlock", body: "One-off unlocks stay yours forever." },
              { icon: RefreshCcw, title: "Cancel anytime", body: "Pro access runs to the end of your period." },
            ].map(({ icon: Icon, title, body }) => (
              <StaggerItem key={title}>
                <div className="flex h-full gap-3 rounded-2xl border bg-card p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="border-y bg-secondary/50 py-20">
        <div className="container-page">
          <SectionHeading title="Compare plans" />
          <Reveal className="mt-10 overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th scope="col" className="px-5 py-4 text-sm font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th scope="col" className="w-40 px-5 py-4 text-center text-sm font-semibold">
                    Free
                  </th>
                  <th scope="col" className="w-40 px-5 py-4 text-center text-sm font-semibold">
                    Pay as you go
                  </th>
                  <th scope="col" className="w-40 bg-primary px-5 py-4 text-center text-sm font-semibold text-primary-foreground">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <th scope="row" className="px-5 py-4 text-sm font-medium">
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <CellValue value={row.oneOff} />
                    </td>
                    <td className="bg-primary/5 px-5 py-4 text-center">
                      <CellValue value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Billing FAQ"
            title="Money questions"
            description={
              <>
                See our{" "}
                <Link href="/refund-policy" className="font-medium text-primary underline-offset-4 hover:underline">
                  refund & cancellation policy
                </Link>{" "}
                for the details.
              </>
            }
          />
          <Faq items={pricingFaqs(prices)} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
