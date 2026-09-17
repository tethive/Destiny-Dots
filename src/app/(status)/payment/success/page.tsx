import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, PartyPopper, Receipt } from "lucide-react";
import { AutoRefresh } from "@/components/status/status-actions";
import { StatusDetails, StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { safeRedirectPath } from "@/lib/security";
import { requireUser } from "@/lib/session";
import { describeOrder } from "@/server/invoices";
import { ctaForOrder } from "@/server/payments";

export const metadata: Metadata = { title: "Payment confirmed", robots: { index: false } };

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function PaymentSuccessPage(props: PageProps<"/payment/success">) {
  const sp = await props.searchParams;
  const kind = sp.kind === "subscription" ? "subscription" : "order";
  const id = typeof sp.id === "string" ? sp.id.slice(0, 40) : "";
  const back = typeof sp.return === "string" ? safeRedirectPath(sp.return, "") : "";
  const user = await requireUser("/billing");
  const failedHref = `/payment/failed?kind=${kind}&id=${encodeURIComponent(id)}${back ? `&return=${encodeURIComponent(back)}` : ""}`;

  const pending = (
    <StatusScreen
      tone="info"
      code="Confirming payment"
      title="Hang tight — confirming your payment"
      description="Razorpay has received your payment and we're waiting for their confirmation. This usually takes a few seconds; you haven't been charged twice."
    >
      <AutoRefresh />
    </StatusScreen>
  );

  if (kind === "order") {
    const order = await db.order.findFirst({ where: { id, userId: user.id }, include: { invoice: true } });
    if (!order) redirect("/billing");
    if (order.status === "FAILED") redirect(failedHref);
    if (order.status === "PENDING") return pending;

    const [item, cta] = await Promise.all([order.invoice?.description ?? describeOrder(order), ctaForOrder(order)]);
    const refunded = order.status === "REFUNDED";
    return (
      <StatusScreen
        tone={refunded ? "warning" : "success"}
        icon={refunded ? Receipt : PartyPopper}
        code={refunded ? "Refunded" : "Payment confirmed"}
        title={refunded ? "This purchase was refunded" : "You're in! Access unlocked"}
        description={refunded ? "The amount is on its way back to your account." : "A receipt is on its way to your inbox."}
        actions={
          <>
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link href={back || cta.path}>{back ? "Back to where you were" : cta.label}</Link>
            </Button>
            {order.invoice && (
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
                <a href={`/api/invoices/${order.invoice.number}/pdf`}>
                  <Download data-icon="inline-start" /> Invoice PDF
                </a>
              </Button>
            )}
          </>
        }
      >
        <StatusDetails
          rows={[
            ["Item", item],
            ["Amount", formatINR(order.amountInr)],
            ["Date", day(order.updatedAt)],
            ...(order.invoice ? ([["Invoice", <Link key="inv" href={`/invoices/${order.invoice.number}`} className="text-primary hover:underline">{order.invoice.number}</Link>]] as [string, React.ReactNode][]) : []),
            ...(order.razorpayPaymentId ? ([["Payment ID", <span key="pid" className="font-mono text-xs">{order.razorpayPaymentId}</span>]] as [string, React.ReactNode][]) : []),
          ]}
        />
      </StatusScreen>
    );
  }

  const sub = await db.subscription.findFirst({
    where: { id, userId: user.id },
    include: { plan: true, invoices: { orderBy: { issuedAt: "desc" }, take: 1 } },
  });
  if (!sub) redirect("/billing");
  if (sub.status === "CREATED") return pending;
  const invoice = sub.invoices[0];

  return (
    <StatusScreen
      tone="success"
      icon={PartyPopper}
      code="Welcome to Pro"
      title="Pro is active — every dot is unlocked"
      description="All paths, premium resources and checkpoint quizzes are now open. A receipt is on its way to your inbox."
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href={back || "/dashboard"}>{back ? "Back to where you were" : "Start learning"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/billing">Manage billing</Link>
          </Button>
        </>
      }
    >
      <StatusDetails
        rows={[
          ["Plan", sub.plan.name],
          ["Amount", formatINR(invoice?.totalInr ?? sub.plan.priceInr)],
          ["Access until", sub.validUntil ? day(sub.validUntil) : "—"],
          ...(invoice ? ([["Invoice", <Link key="inv" href={`/invoices/${invoice.number}`} className="text-primary hover:underline">{invoice.number}</Link>]] as [string, React.ReactNode][]) : []),
        ]}
      />
    </StatusScreen>
  );
}
