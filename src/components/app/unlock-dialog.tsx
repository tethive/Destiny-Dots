"use client";

import { useState } from "react";
import { Check, LoaderCircle, ShieldCheck, TicketPercent } from "lucide-react";
import { useCheckout } from "@/components/app/checkout";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR, savingPct } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { startSubscription, startUnlock } from "@/server/actions/student";

export type UnlockTarget = { pathId: string; pathTitle: string; dotId?: string; dotOrder?: number; dotTitle?: string };
export type Prices = { dot: number; path: number; monthly: number; yearly: number };

/** In-app paywall: subscription is the dominant option; one-off unlocks support coupons. */
export function UnlockDialog({
  target,
  prices,
  ownedDots,
  onOpenChange,
}: {
  target: UnlockTarget | null;
  prices: Prices;
  ownedDots: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { start, busy } = useCheckout();
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [coupon, setCoupon] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);

  const close = () => onOpenChange(false);

  return (
    <ResponsiveModal
      open={target !== null}
      onOpenChange={onOpenChange}
      title={target?.dotId ? "Unlock this dot" : "Unlock this path"}
      description={
        target && (
          <>
            {target.dotTitle && (
              <span className="font-medium text-foreground">
                Dot {target.dotOrder}: {target.dotTitle} —{" "}
              </span>
            )}
            {target.pathTitle}
          </>
        )
      }
    >
      {target && (
        <div className="space-y-3">
          {ownedDots >= 2 && (
            <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              You&apos;ve unlocked {ownedDots} dots already — Pro gives you every dot for {formatINR(prices.monthly)}/month.
            </p>
          )}

          <div className="relative rounded-xl border-2 border-primary bg-accent/40 p-4">
            <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              Best value
            </span>
            <p className="font-semibold">Pro — every dot, all 11 domains</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["MONTHLY", "YEARLY"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterval(i)}
                  aria-pressed={interval === i}
                  className={cn(
                    "rounded-lg border bg-background p-2.5 text-left transition-colors",
                    interval === i && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <span className="block text-xs text-muted-foreground">{i === "MONTHLY" ? "Monthly" : `Yearly · save ${savingPct(prices)}%`}</span>
                  <span className="block font-semibold tabular-nums">
                    {formatINR(i === "MONTHLY" ? prices.monthly : prices.yearly)}
                    <span className="text-xs font-normal text-muted-foreground">{i === "MONTHLY" ? "/mo" : "/yr"}</span>
                  </span>
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {["Every premium resource & checkpoint", "Cancel anytime, keep one-off unlocks"].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="mt-4 h-10 w-full rounded-full"
              disabled={busy}
              onClick={async () => {
                close();
                await start(() => startSubscription(interval));
              }}
            >
              {busy && <LoaderCircle className="animate-spin" />} Subscribe
            </Button>
          </div>

          {target.dotId && (
            <Button
              variant="outline"
              size="lg"
              className="h-10 w-full rounded-full"
              disabled={busy}
              onClick={async () => {
                close();
                await start(() => startUnlock({ scope: "DOT", scopeId: target.dotId!, couponCode: coupon || undefined }));
              }}
            >
              Unlock just this dot — {formatINR(prices.dot)}
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            className="h-10 w-full rounded-full"
            disabled={busy}
            onClick={async () => {
              close();
              await start(() => startUnlock({ scope: "PATH", scopeId: target.pathId, couponCode: coupon || undefined }));
            }}
          >
            Unlock the full path — {formatINR(prices.path)}
          </Button>

          {showCoupon ? (
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Coupon code for one-off unlocks"
              className="h-10"
              aria-label="Coupon code"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCoupon(true)}
              className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <TicketPercent className="size-4" /> Have a coupon?
            </button>
          )}

          <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            Secure payments by Razorpay — UPI, cards and netbanking. One-off unlocks are yours forever.
          </p>
        </div>
      )}
    </ResponsiveModal>
  );
}
