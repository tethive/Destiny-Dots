import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { safeRedirectPath } from "@/lib/security";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Payment not completed", robots: { index: false } };

export default async function PaymentFailedPage(props: PageProps<"/payment/failed">) {
  await requireUser("/billing");
  const sp = await props.searchParams;
  const back = typeof sp.return === "string" ? safeRedirectPath(sp.return, "") : "";
  const cancelled = sp.reason === "cancelled";

  return (
    <StatusScreen
      tone={cancelled ? "warning" : "error"}
      icon={CreditCard}
      code={cancelled ? "Payment cancelled" : "Payment failed"}
      title={cancelled ? "You closed the payment window" : "Your payment didn't go through"}
      description={
        cancelled
          ? "No money was taken. You can pick up where you left off whenever you're ready."
          : "You haven't been charged. If money did leave your account, your bank reverses it automatically within 5–7 working days. You can try again with UPI, a card or netbanking."
      }
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href={back || "/billing"}>Try again</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/contact">Get help</Link>
          </Button>
        </>
      }
    >
      <ul className="space-y-1.5 rounded-2xl border bg-card p-4 text-left text-sm text-muted-foreground shadow-xs">
        <li>• Check your card or UPI limit and that online payments are enabled.</li>
        <li>• Some banks need you to approve the payment in their app.</li>
        <li>• Still stuck? Write to us with the time of the attempt.</li>
      </ul>
    </StatusScreen>
  );
}
