import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeIndianRupee, ClipboardCheck, Store, Wallet } from "lucide-react";
import {
  DisputeActions,
  MarketplaceSettingsForm,
  PayoutDetailsButton,
  PendingPayoutActions,
  PreparePayoutButton,
} from "@/components/admin/marketplace-actions";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { payableSellers } from "@/server/marketplace";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Marketplace" };

const tabs = [
  { value: "review", label: "Review queue" },
  { value: "listings", label: "All listings" },
  { value: "disputes", label: "Disputes" },
  { value: "payouts", label: "Payouts" },
  { value: "settings", label: "Settings" },
] as const;

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function AdminMarketplacePage(props: PageProps<"/admin/marketplace">) {
  await requireAdmin();
  const { tab: rawTab } = await props.searchParams;
  const tab = tabs.some((t) => t.value === rawTab) ? (rawTab as (typeof tabs)[number]["value"]) : "review";

  const [settings, pendingCount, openDisputes, gmv, commission, pendingPayouts] = await Promise.all([
    getSetting("marketplace"),
    db.project.count({ where: { status: "PENDING" } }),
    db.projectDispute.count({ where: { status: "OPEN" } }),
    db.projectPurchase.aggregate({ where: { status: { not: "REFUNDED" } }, _sum: { amountInr: true }, _count: true }),
    db.projectPurchase.aggregate({ where: { status: { not: "REFUNDED" } }, _sum: { commissionInr: true } }),
    db.payout.aggregate({ where: { status: "PENDING" }, _sum: { amountInr: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Marketplace" description={`${settings.enabled ? "Open" : "Closed"} · ${settings.commissionPct}% commission · ${settings.holdDays}-day buyer protection`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={pendingCount} icon={ClipboardCheck} />
        <StatCard label="Open disputes" value={openDisputes} icon={AlertTriangle} />
        <StatCard label="Sales volume" value={formatINR(gmv._sum.amountInr ?? 0)} hint={`${gmv._count} sales · ${formatINR(commission._sum.commissionInr ?? 0)} commission`} icon={BadgeIndianRupee} />
        <StatCard label="Payouts to send" value={formatINR(pendingPayouts._sum.amountInr ?? 0)} icon={Wallet} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/marketplace?tab=${t.value}`}
            className={cn("shrink-0 border-b-2 px-3 py-2 text-sm font-medium", tab === t.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            {t.value === "review" && pendingCount > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{pendingCount}</span>}
            {t.value === "disputes" && openDisputes > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-xs text-white">{openDisputes}</span>}
          </Link>
        ))}
      </nav>

      {tab === "review" || tab === "listings" ? <Listings pendingOnly={tab === "review"} /> : null}
      {tab === "disputes" && <Disputes />}
      {tab === "payouts" && <Payouts minPayout={settings.minPayoutInr} />}
      {tab === "settings" && (
        <section className="max-w-xl rounded-2xl border bg-card p-5 shadow-xs">
          <MarketplaceSettingsForm initial={settings} />
        </section>
      )}
    </div>
  );
}

async function Listings({ pendingOnly }: { pendingOnly: boolean }) {
  const projects = await db.project.findMany({
    where: pendingOnly ? { status: "PENDING" } : {},
    orderBy: pendingOnly ? { submittedAt: "asc" } : { updatedAt: "desc" },
    take: 200,
    include: { seller: { select: { name: true, email: true } } },
  });
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Project</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-sm pl-5">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.submittedAt ? `Submitted ${day(p.submittedAt)}` : `Created ${day(p.createdAt)}`}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {p.seller.name}
                  <span className="block text-xs text-muted-foreground">{p.seller.email}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "APPROVED" ? "default" : p.status === "REJECTED" ? "destructive" : "outline"}>{p.status.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(p.priceInr)}</TableCell>
                <TableCell className="text-right tabular-nums">{p.salesCount}</TableCell>
                <TableCell className="pr-5 text-right">
                  <Button asChild size="sm" variant={p.status === "PENDING" ? "default" : "outline"}>
                    <Link href={`/admin/marketplace/${p.id}`}>{p.status === "PENDING" ? "Review" : "Open"}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Store className="mx-auto mb-2 size-5" />
                  {pendingOnly ? "Nothing waiting for review." : "No listings yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

async function Disputes() {
  const disputes = await db.projectDispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { purchase: { include: { buyer: { select: { name: true, email: true } }, project: { select: { id: true, title: true, seller: { select: { name: true } } } } } } },
  });
  if (!disputes.length) return <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No disputes. 🎉</p>;
  return (
    <ul className="space-y-3">
      {disputes.map((d) => (
        <li key={d.id} className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/admin/marketplace/${d.purchase.project.id}`} className="font-semibold hover:underline">
                {d.purchase.project.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                Buyer {d.purchase.buyer.name} ({d.purchase.buyer.email}) · seller {d.purchase.project.seller.name} · {formatINR(d.purchase.amountInr)} · opened {day(d.createdAt)}
              </p>
            </div>
            <Badge variant={d.status === "OPEN" ? "destructive" : "outline"}>{d.status.toLowerCase()}</Badge>
          </div>
          <p className="mt-3 text-sm font-medium">{d.reason}</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{d.details}</p>
          {d.resolution && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">Resolution: {d.resolution}</p>}
          {d.status === "OPEN" && (
            <div className="mt-4">
              <DisputeActions disputeId={d.id} amountInr={d.purchase.amountInr} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

async function Payouts({ minPayout }: { minPayout: number }) {
  const [sellers, payouts] = await Promise.all([
    payableSellers(),
    db.payout.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { seller: { select: { id: true, name: true, email: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card shadow-xs">
        <div className="p-5 pb-2">
          <h2 className="font-semibold">Ready to pay</h2>
          <p className="text-sm text-muted-foreground">Sales past the protection period without disputes. Minimum payout {formatINR(minPayout)}.</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableBody>
              {sellers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-5">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.email} · {s.sellerProfile?.payoutHint ?? "no payout details"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-semibold tabular-nums">{formatINR(s.amount)}</p>
                    <p className="text-xs text-muted-foreground">{s.sales} sales</p>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <PreparePayoutButton sellerId={s.id} disabled={s.belowMinimum || !s.sellerProfile} />
                    {s.belowMinimum && <p className="mt-1 text-xs text-muted-foreground">Below minimum</p>}
                  </TableCell>
                </TableRow>
              ))}
              {sellers.length === 0 && (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted-foreground">Nothing payable right now.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-2xl border bg-card shadow-xs">
        <h2 className="p-5 pb-2 font-semibold">Payouts</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Seller</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    {p.seller.name}
                    <span className="block text-xs text-muted-foreground">
                      {p.method} · prepared {day(p.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(p.amountInr)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PAID" ? "default" : p.status === "PENDING" ? "secondary" : "outline"}>{p.status.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.reference ?? "—"}</TableCell>
                  <TableCell className="pr-5">
                    {p.status === "PENDING" && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <PayoutDetailsButton sellerId={p.seller.id} />
                        <PendingPayoutActions payoutId={p.id} amountInr={p.amountInr} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No payouts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
