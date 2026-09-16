import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeIndianRupee, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { CouponForm, CouponToggle, RefundButton } from "@/components/admin/payment-actions";
import { FilterSelect } from "@/components/app/filter-select";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";
import { razorpayEnabled } from "@/server/payments";

export const metadata: Metadata = { title: "Payments" };

const fmt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export default async function AdminPaymentsPage(props: PageProps<"/admin/payments">) {
  await requireAdmin();
  const { status } = await props.searchParams;
  const statusFilter = typeof status === "string" ? (status as OrderStatus) : undefined;
  const since30 = daysAgo(30);

  const [orders, paid, failed30, refunded, subs, coupons, paths] = await Promise.all([
    db.order.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } }, coupon: { select: { code: true } } },
    }),
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountInr: true }, _count: true }),
    db.order.count({ where: { status: "FAILED", createdAt: { gte: since30 } } }),
    db.order.aggregate({ where: { status: "REFUNDED" }, _sum: { amountInr: true }, _count: true }),
    db.subscription.findMany({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } }, include: { plan: true, user: { select: { id: true, name: true, email: true } } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.careerPath.findMany({ where: { isPublished: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Payments" description={razorpayEnabled ? "Live data from Razorpay webhooks." : "Razorpay keys aren't set — orders shown here come from the local simulator."} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="One-off revenue" value={formatINR(paid._sum.amountInr ?? 0)} hint={`${paid._count} paid orders`} icon={BadgeIndianRupee} />
        <StatCard label="Active subscriptions" value={subs.filter((s) => s.status === "ACTIVE").length} icon={Sparkles} />
        <StatCard label="Failed (30 days)" value={failed30} icon={AlertTriangle} />
        <StatCard label="Refunded" value={formatINR(refunded._sum.amountInr ?? 0)} hint={`${refunded._count} orders`} icon={RotateCcw} />
      </div>

      {subs.some((s) => s.status === "PAST_DUE") && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {subs.filter((s) => s.status === "PAST_DUE").length} subscriptions have failed renewals.
        </p>
      )}

      <section className="rounded-2xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
          <h2 className="font-semibold">Transactions</h2>
          <FilterSelect
            param="status"
            placeholder="All statuses"
            value={statusFilter}
            options={["PAID", "PENDING", "FAILED", "REFUNDED"].map((s) => ({ value: s, label: s.toLowerCase() }))}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">When</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-5 whitespace-nowrap">{fmt(o.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${o.user.id}`} className="hover:underline">
                      {o.user.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{o.user.email}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.scope.toLowerCase()} unlock
                    {o.coupon && <span className="block text-xs text-muted-foreground">coupon {o.coupon.code}</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(o.amountInr)}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "PAID" ? "default" : o.status === "FAILED" ? "destructive" : "outline"}>{o.status.toLowerCase()}</Badge>
                    {o.isSimulated && <span className="ml-1 text-xs text-muted-foreground">sim</span>}
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">{o.razorpayPaymentId ?? o.razorpayOrderId ?? "—"}</TableCell>
                  <TableCell className="pr-5 text-right">{o.status === "PAID" && <RefundButton orderId={o.id} amount={o.amountInr} />}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Create coupon</h2>
          <p className="mt-1 text-sm text-muted-foreground">Percentage discounts for one-off unlocks.</p>
          <CouponForm paths={paths} />
        </section>

        <section className="rounded-2xl border bg-card shadow-xs">
          <h2 className="p-5 pb-3 font-semibold">Coupons</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Code</TableHead>
                <TableHead className="text-right">Off</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="pr-5 text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-5 font-mono font-medium">
                    {c.code}
                    <span className="block font-sans text-xs text-muted-foreground">{c.scope ? `${c.scope.toLowerCase()} only` : "any unlock"}</span>
                  </TableCell>
                  <TableCell className="text-right">{c.discountPct}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.usedCount}
                    {c.maxUses ? `/${c.maxUses}` : ""}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {c.expiresAt ? c.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <CouponToggle id={c.id} active={c.isActive} />
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 pl-5 text-muted-foreground">
                    <CheckCircle2 className="mr-1 inline size-4" /> No coupons yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
