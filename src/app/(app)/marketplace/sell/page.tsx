import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, HandCoins, Hourglass, Plus, Store, Wallet } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/app/page-header";
import { SellerProfileForm } from "@/components/marketplace/seller-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { sellerEarnings } from "@/server/marketplace";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Sell on the marketplace" };

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const statusVariant = { DRAFT: "outline", PENDING: "secondary", APPROVED: "default", REJECTED: "destructive", ARCHIVED: "outline" } as const;

export default async function SellPage() {
  const user = await requireUser("/marketplace/sell");
  const [settings, profile, projects, earnings, payouts] = await Promise.all([
    getSetting("marketplace"),
    db.sellerProfile.findUnique({ where: { userId: user.id } }),
    db.project.findMany({ where: { sellerId: user.id }, orderBy: { updatedAt: "desc" } }),
    sellerEarnings(user.id),
    db.payout.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link href="/marketplace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Marketplace
        </Link>
        <PageHeader
          className="mb-0"
          title="Seller dashboard"
          description={`List your projects, track sales and get paid to your UPI or bank account. Destiny Dots keeps ${settings.commissionPct}% per sale.`}
          actions={
            profile && (
              <Button asChild size="lg" className="rounded-full">
                <Link href="/marketplace/sell/new">
                  <Plus data-icon="inline-start" /> New listing
                </Link>
              </Button>
            )
          }
        />
      </div>

      {!profile ? (
        <section className="rounded-2xl border bg-card p-6 shadow-xs">
          <h2 className="text-lg font-semibold">Set up selling</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">Tell buyers who you are and where to send your earnings. Bank and UPI details are encrypted and only used for payouts.</p>
          <SellerProfileForm commissionPct={settings.commissionPct} holdDays={settings.holdDays} />
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Payable now" value={formatINR(earnings.payable)} hint={`Minimum payout ${formatINR(settings.minPayoutInr)}`} icon={Wallet} />
            <StatCard label="On hold" value={formatINR(earnings.onHold)} hint={`${earnings.holdDays}-day buyer protection`} icon={Hourglass} />
            <StatCard label="Payout in progress" value={formatINR(earnings.inPayout)} icon={Clock} />
            <StatCard label="Paid to you" value={formatINR(earnings.paid)} icon={HandCoins} />
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Your listings</h2>
            {projects.length === 0 ? (
              <EmptyState
                icon={Store}
                title="No listings yet"
                description="Turn a project you're proud of into a listing. Add a clear README — it's the first thing buyers look at."
                action={
                  <Button asChild>
                    <Link href="/marketplace/sell/new">Create a listing</Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-5">Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                        <TableHead className="pr-5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="max-w-sm pl-5">
                            <p className="truncate font-medium">{p.title}</p>
                            <p className="text-xs text-muted-foreground">Updated {day(p.updatedAt)}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[p.status]}>{p.status === "PENDING" ? "in review" : p.status.toLowerCase()}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(p.priceInr)}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.salesCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.ratingCount ? p.ratingAvg.toFixed(1) : "—"}</TableCell>
                          <TableCell className="pr-5 text-right whitespace-nowrap">
                            {p.status === "APPROVED" && (
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/marketplace/${p.slug}`}>View</Link>
                              </Button>
                            )}
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/marketplace/sell/${p.id}`}>Edit</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="font-semibold">Payout history</h2>
              <p className="mt-1 text-sm text-muted-foreground">Payouts are sent to {profile.payoutHint}.</p>
              <ul className="mt-4 divide-y text-sm">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span>
                      {formatINR(p.amountInr)}
                      <span className="block text-xs text-muted-foreground">
                        {p.paidAt ? `Paid ${day(p.paidAt)} · ref ${p.reference}` : `Prepared ${day(p.createdAt)}`}
                      </span>
                    </span>
                    <Badge variant={p.status === "PAID" ? "default" : "outline"}>{p.status.toLowerCase()}</Badge>
                  </li>
                ))}
                {payouts.length === 0 && <li className="py-3 text-muted-foreground">No payouts yet.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="mb-4 font-semibold">Seller profile & payout account</h2>
              <SellerProfileForm
                commissionPct={settings.commissionPct}
                holdDays={settings.holdDays}
                initial={{ displayName: profile.displayName, bio: profile.bio ?? "", payoutMethod: profile.payoutMethod, payoutName: profile.payoutName, payoutHint: profile.payoutHint }}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
