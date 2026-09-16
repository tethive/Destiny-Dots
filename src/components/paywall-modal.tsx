"use client";

import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { defaultPrices, formatINR, savingPct, type Prices } from "@/lib/pricing";

export type PaywallTarget = {
  pathTitle: string;
  pathHref: string;
  pathSlug: string;
  dotOrder: number;
  dotTitle: string;
};

/**
 * Visitor paywall. Shown "at the moment of desire" — when a visitor taps a
 * locked dot or premium resource. Every option routes through sign-up first;
 * the Razorpay checkout itself only happens for logged-in students, and
 * content is only ever unlocked by the server-side webhook.
 */
export function PaywallModal({
  target,
  onOpenChange,
  prices = defaultPrices,
}: {
  target: PaywallTarget | null;
  onOpenChange: (open: boolean) => void;
  prices?: Prices;
}) {
  // After sign-up, land on the path's learning page where checkout happens.
  const next = target ? encodeURIComponent(`/learn/${target.pathSlug}`) : "";
  const signup = (intent: string, to = next) => `/signup?next=${to}&intent=${intent}`;

  return (
    <ResponsiveModal
      open={target !== null}
      onOpenChange={onOpenChange}
      title="Unlock this dot"
      description={
        target && (
          <>
            <span className="font-medium text-foreground">
              Dot {target.dotOrder}: {target.dotTitle}
            </span>{" "}
            — {target.pathTitle}
          </>
        )
      }
    >
      {target && (
        <div className="space-y-3">
          {/* Subscription — visually dominant */}
          <div className="relative rounded-xl border-2 border-primary bg-accent/60 p-4">
            <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              Recommended
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">Subscribe to everything</p>
              <p className="text-sm">
                <span className="text-lg font-bold">{formatINR(prices.monthly)}</span>
                <span className="text-muted-foreground">/mo</span>
              </p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> Every dot in every path
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> Or {formatINR(prices.yearly)}/year —
                save {savingPct(prices)}%
              </li>
            </ul>
            <Button asChild className="mt-4 h-10 w-full" size="lg">
              <Link href={signup("subscribe", encodeURIComponent("/billing"))}>Subscribe — {formatINR(prices.monthly)}/mo</Link>
            </Button>
          </div>

          <Button asChild variant="outline" className="h-10 w-full" size="lg">
            <Link href={signup(`dot-${target.dotOrder}`)}>Unlock just this dot — {formatINR(prices.dot)}</Link>
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Or{" "}
            <Link href={signup("path")} className="font-medium text-primary underline-offset-4 hover:underline">
              unlock the full path — {formatINR(prices.path)}
            </Link>
          </p>

          <div className="mt-5! flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>
              You&apos;ll create a free account first. Payments are handled securely by Razorpay — UPI, cards and
              netbanking.
            </span>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login?next=${next}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      )}
    </ResponsiveModal>
  );
}
