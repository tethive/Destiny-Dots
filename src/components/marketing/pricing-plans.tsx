"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, planFeatures, savingPct, type Prices } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Interval = "monthly" | "yearly";

export function PricingPlans({ prices }: { prices: Prices }) {
  const [interval, setInterval] = useState<Interval>("yearly");
  const yearlySavingPct = savingPct(prices);

  return (
    <div>
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Billing interval" className="inline-flex rounded-full border bg-muted/60 p-1">
          {(["monthly", "yearly"] as const).map((opt) => {
            const active = interval === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setInterval(opt)}
                className={cn(
                  "relative inline-flex h-8 items-center gap-2 rounded-full px-4 text-sm font-medium capitalize transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="billing-interval"
                    className="absolute inset-0 -z-10 rounded-full bg-background shadow-sm ring-1 ring-border"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {opt}
                {opt === "yearly" && (
                  <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    Save {yearlySavingPct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
        <Plan
          name="Free"
          blurb="Explore every roadmap and start learning."
          price={formatINR(0)}
          unit="forever"
          features={planFeatures.free}
          cta={{ href: "/signup", label: "Get started free" }}
        />

        <div className="border-beam shadow-2xl shadow-primary/15 lg:-my-4">
          <Plan
            highlighted
            name="Pro"
            blurb="Everything, across all 11 domains."
            price={formatINR(interval === "monthly" ? prices.monthly : prices.yearly)}
            unit={interval === "monthly" ? "/ month" : "/ year"}
            note={
              interval === "yearly"
                ? `Just ${formatINR(Math.round(prices.yearly / 12))} a month, billed yearly`
                : `Or ${formatINR(prices.yearly)} a year — save ${yearlySavingPct}%`
            }
            features={planFeatures.pro}
            cta={{ href: `/signup?intent=subscribe-${interval}`, label: "Go Pro" }}
          />
        </div>

        <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-xs sm:p-7">
          <p className="text-base font-semibold">Pay as you go</p>
          <p className="mt-1 text-sm text-muted-foreground">Unlock only what you need.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: "One dot", value: prices.dot },
              { label: "Full path", value: prices.path },
            ].map((o) => (
              <div key={o.label} className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{o.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{formatINR(o.value)}</p>
              </div>
            ))}
          </div>
          <FeatureList features={planFeatures.oneOff} />
          <Button asChild variant="outline" size="lg" className="mt-auto h-10 w-full rounded-full">
            <Link href="/resources">Explore resources</Link>
          </Button>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Prices in INR, inclusive of applicable taxes. Pay with UPI, cards or netbanking via Razorpay.
      </p>
    </div>
  );
}

function Plan({
  name,
  blurb,
  price,
  unit,
  note,
  features,
  cta,
  highlighted = false,
}: {
  name: string;
  blurb: string;
  price: string;
  unit: string;
  note?: string;
  features: string[];
  cta: { href: string; label: string };
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl bg-card p-6 sm:p-7",
        highlighted ? "lg:py-10" : "border shadow-xs",
      )}
    >
      {highlighted && (
        <>
          <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <span className="absolute top-6 right-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            Most popular
          </span>
        </>
      )}
      <p className="relative text-base font-semibold">{name}</p>
      <p className="relative mt-1 text-sm text-muted-foreground">{blurb}</p>
      <div className="relative mt-6 flex h-11 items-baseline gap-1.5 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={price}
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -28, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-semibold tracking-tight tabular-nums"
          >
            {price}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <p className={cn("relative mt-1 min-h-5 text-sm", highlighted ? "text-primary" : "text-transparent")}>{note ?? "·"}</p>
      <FeatureList features={features} />
      <Button
        asChild
        variant={highlighted ? "default" : "outline"}
        size="lg"
        className={cn("relative mt-auto h-10 w-full rounded-full", highlighted && "shadow-lg shadow-primary/25")}
      >
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="relative mt-6 mb-8 space-y-3 text-sm">
      {features.map((f) => (
        <li key={f} className="flex gap-2.5">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}
