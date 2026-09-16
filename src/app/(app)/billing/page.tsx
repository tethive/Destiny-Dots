import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, FlaskConical, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import { CancelSubscriptionButton, SubscribeButtons } from "@/components/app/billing-actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatINR, savingPct } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { getAccess } from "@/server/access";
import { displayPrices, razorpayEnabled, simulatorEnabled } from "@/server/payments";

export const metadata: Metadata = { title: "Billing" };

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function BillingPage() {
  const user = await requireUser("/billing");
  const [access, subscription, orders, entitlements, prices] = await Promise.all([
    getAccess(user.id),
    db.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE", "CANCELLED"] } },
      orderBy: { updatedAt: "desc" },
      include: { plan: true },
    }),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.entitlement.findMany({ where: { userId: user.id, scope: { in: ["PATH", "DOT"] }, revokedAt: null } }),
    displayPrices(),
  ]);

  const [pathIds, dotIds] = [
    entitlements.filter((e) => e.scope === "PATH").map((e) => e.scopeId!),
    entitlements.filter((e) => e.scope === "DOT").map((e) => e.scopeId!),
  ];
  const [paths, dots] = await Promise.all([
    db.careerPath.findMany({ where: { id: { in: pathIds } }, select: { id: true, slug: true, title: true } }),
    db.dot.findMany({ where: { id: { in: dotIds } }, select: { id: true, order: true, title: true, path: { select: { slug: true, title: true } } } }),
  ]);
  const describe = (scope: string, id: string | null) => {
    if (scope === "PATH") return `Path: ${paths.find((p) => p.id === id)?.title ?? "—"}`;
    const d = dots.find((x) => x.id === id);
    return d ? `Dot ${d.order}: ${d.title}` : "Dot";
  };
  const statusBadge = { PAID: "default", PENDING: "secondary", FAILED: "destructive", REFUNDED: "outline" } as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Billing"
        description="Your plan, unlocks and payment history."
        actions={
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/invoices">
              <Receipt data-icon="inline-start" /> Invoices
            </Link>
          </Button>
        }
      />

      {simulatorEnabled && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <FlaskConical className="mt-0.5 size-4 shrink-0" /> Razorpay keys aren&apos;t set, so checkout uses the local payment simulator. Add
          test keys to <code className="font-mono">.env</code> to use real Razorpay test mode.
        </p>
      )}

      <section className="relative isolate overflow-hidden rounded-3xl border bg-card p-6 shadow-xs sm:p-8">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]" aria-hidden />
        {access.plan && subscription ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="size-4" /> Current plan
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{subscription.plan.name}</h2>
              <p className="mt-1 text-muted-foreground">
                {formatINR(subscription.plan.priceInr)} / {subscription.plan.interval === "MONTHLY" ? "month" : "year"} ·{" "}
                {subscription.cancelAtEnd || subscription.status === "CANCELLED"
                  ? `ends on ${subscription.validUntil ? fmt(subscription.validUntil) : "—"}`
                  : `renews on ${subscription.validUntil ? fmt(subscription.validUntil) : "—"}`}
              </p>
              {subscription.status === "PAST_DUE" && (
                <p className="mt-2 text-sm text-destructive">Your last renewal failed. Update your payment method in the Razorpay email to keep Pro.</p>
              )}
            </div>
            {!subscription.cancelAtEnd && subscription.status === "ACTIVE" && <CancelSubscriptionButton subscriptionId={subscription.id} />}
          </div>
        ) : access.plan ? (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="size-4" /> Pro access
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Granted by the Destiny Dots team</h2>
            <p className="mt-1 text-muted-foreground">
              {access.planValidUntil ? `Valid until ${fmt(access.planValidUntil)}` : "No expiry date."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <h2 className="mt-1 text-2xl font-semibold">Free</h2>
              <p className="mt-1 max-w-md text-muted-foreground">
                Go Pro for every dot in every path — {formatINR(prices.monthly)}/month or {formatINR(prices.yearly)}/year (save {savingPct(prices)}%).
              </p>
            </div>
            <SubscribeButtons prices={prices} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 font-semibold">
          <CreditCard className="size-4 text-muted-foreground" /> Your unlocks
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">One-off unlocks stay yours forever, even without Pro.</p>
        {paths.length + dots.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No one-off unlocks yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {paths.map((p) => (
              <li key={p.id}>
                <Link href={`/learn/${p.slug}`} className="block rounded-xl border px-3 py-2.5 text-sm hover:bg-muted">
                  <span className="font-medium">Full path</span> · {p.title}
                </Link>
              </li>
            ))}
            {dots.map((d) => (
              <li key={d.id}>
                <Link href={`/learn/${d.path.slug}/${d.order}`} className="block rounded-xl border px-3 py-2.5 text-sm hover:bg-muted">
                  <span className="font-medium">Dot {d.order}</span> · {d.title}
                  <span className="block text-xs text-muted-foreground">{d.path.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card shadow-xs">
        <h2 className="flex items-center gap-2 p-5 pb-3 font-semibold">
          <Receipt className="size-4 text-muted-foreground" /> Payment history
        </h2>
        {orders.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-5 whitespace-nowrap">{fmt(o.createdAt)}</TableCell>
                    <TableCell className="min-w-48">
                      {describe(o.scope, o.scopeId)}
                      {o.isSimulated && <span className="ml-2 text-xs text-muted-foreground">(simulated)</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(o.amountInr)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <Badge variant={statusBadge[o.status]} className="capitalize">
                        {o.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        {razorpayEnabled ? "Payments are processed securely by Razorpay." : "Payments will be processed securely by Razorpay."} See our{" "}
        <Link href="/refund-policy" className="underline underline-offset-4">
          refund & cancellation policy
        </Link>
        .
      </p>
    </div>
  );
}
