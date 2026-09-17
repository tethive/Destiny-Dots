"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FlaskConical, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/pricing";
import { checkPaymentStatus, simulatePayment } from "@/server/actions/student";
import type { CheckoutSession } from "@/server/payments";

type StartFn = () => Promise<CheckoutSession | { error: string }>;
type Ctx = { start: (fn: StartFn) => Promise<void>; busy: boolean; available: boolean };

const CheckoutContext = createContext<Ctx>({ start: async () => {}, busy: false, available: false });
export const useCheckout = () => useContext(CheckoutContext);

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Shown wherever a purchase would start while payments aren't switched on yet. */
export function PaymentsSoonNotice({ className }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl border border-primary/20 bg-accent px-3 py-2.5 text-sm text-accent-foreground ${className ?? ""}`}>
      <Clock className="mt-0.5 size-4 shrink-0" />
      <span>
        <b>Payments are opening soon.</b> Everything free is available now — we&apos;ll email you when Pro and unlocks go live.
      </span>
    </p>
  );
}

const resultUrl = (outcome: "success" | "failed", kind: "order" | "subscription", id: string) =>
  `/payment/${outcome}?kind=${kind}&id=${encodeURIComponent(id)}&return=${encodeURIComponent(window.location.pathname + window.location.search)}`;

/**
 * Opens Razorpay Checkout (or the local simulator) and then waits for the
 * server-side webhook to confirm. The browser callback never grants access.
 */
export function CheckoutProvider({ user, available, children }: { user: { name: string; email: string }; available: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<Extract<CheckoutSession, { mode: "simulator" }> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const polling = useRef(false);

  const waitForConfirmation = useCallback(
    async (kind: "order" | "subscription", id: string) => {
      if (polling.current) return;
      polling.current = true;
      setConfirming(true);
      for (let i = 0; i < 30; i++) {
        const { status } = await checkPaymentStatus(kind, id);
        if (status === "PAID") {
          router.push(resultUrl("success", kind, id));
          break;
        }
        if (status === "FAILED") {
          router.push(resultUrl("failed", kind, id));
          break;
        }
        if (i === 29) toast.info("Payment received. Access will appear as soon as Razorpay confirms it.");
        await new Promise((r) => setTimeout(r, 2000));
      }
      setConfirming(false);
      polling.current = false;
    },
    [router],
  );

  const start = useCallback(
    async (fn: StartFn) => {
      if (!available) return void toast.info("Payments are opening soon — thanks for your patience!");
      setBusy(true);
      try {
        const session = await fn();
        if ("error" in session) return void toast.error(session.error);
        if (session.mode === "simulator") return setSim(session);

        if (!(await loadRazorpay()) || !window.Razorpay) {
          return void toast.error("Couldn't load the payment window. Check your connection and try again.");
        }
        const kind = session.kind;
        const id = kind === "order" ? session.orderId : session.subscriptionId;
        const rzp = new window.Razorpay({
          key: session.keyId,
          name: "Destiny Dots",
          description: session.description,
          image: `${window.location.origin}/android-chrome-192x192.png`,
          ...(kind === "order"
            ? { order_id: session.razorpayOrderId, amount: session.amountPaise, currency: "INR" }
            : { subscription_id: session.razorpaySubscriptionId }),
          prefill: { name: user.name, email: user.email },
          theme: { color: "#5b3fd6" },
          handler: () => void waitForConfirmation(kind, id),
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.on("payment.failed", () => toast.error("Payment failed. Please try another method."));
        rzp.open();
      } finally {
        setBusy(false);
      }
    },
    [user, waitForConfirmation, available],
  );

  return (
    <CheckoutContext.Provider value={{ start, busy, available }}>
      {children}

      <ResponsiveModal
        open={sim !== null}
        onOpenChange={(o) => !o && setSim(null)}
        title="Payment simulator"
        description="Razorpay keys aren't configured, so this local-only simulator stands in. It runs the same fulfilment code as the real webhook."
      >
        {sim && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <FlaskConical className="mt-0.5 size-4 shrink-0" />
              <span>Development only — never available in production and no money moves.</span>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">{sim.description}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(sim.amountInr)}</p>
            </div>
            <Button
              size="lg"
              className="h-10 w-full rounded-full"
              disabled={confirming}
              onClick={async () => {
                setConfirming(true);
                const res = await simulatePayment(sim.kind, sim.kind === "order" ? sim.orderId : sim.subscriptionId);
                setConfirming(false);
                if (!res.ok) return void toast.error(res.error);
                setSim(null);
                router.push(resultUrl("success", sim.kind, sim.kind === "order" ? sim.orderId : sim.subscriptionId));
                router.refresh();
              }}
            >
              {confirming ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Simulate successful payment
            </Button>
            <Button variant="outline" size="lg" className="h-10 w-full rounded-full" onClick={() => setSim(null)}>
              Cancel
            </Button>
          </div>
        )}
      </ResponsiveModal>

      {confirming && !sim && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border bg-popover px-4 py-2 text-sm shadow-xl md:bottom-6">
          <LoaderCircle className="size-4 animate-spin text-primary" /> Confirming your payment…
        </div>
      )}
    </CheckoutContext.Provider>
  );
}
