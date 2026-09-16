import type { Metadata } from "next";
import Link from "next/link";
import { Download, Receipt } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { financialYear } from "@/server/invoices";

export const metadata: Metadata = { title: "Invoices" };

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function InvoicesPage() {
  const user = await requireUser("/invoices");
  const invoices = await db.invoice.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" } });
  const fy = financialYear(new Date());
  const paidThisYear = invoices.filter((i) => i.status === "PAID" && financialYear(i.issuedAt) === fy).reduce((n, i) => n + i.totalInr, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Invoices" description="Every payment you've made, with a downloadable invoice for your records." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard label="Invoices" value={invoices.length} icon={Receipt} />
        <StatCard label={`Paid in FY ${fy}`} value={formatINR(paidThisYear)} />
        <StatCard label="Refunded" value={invoices.filter((i) => i.status === "REFUNDED").length} />
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="When you unlock a dot, a path, a project or go Pro, the invoice appears here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="pl-5 font-mono text-xs whitespace-nowrap">
                      <Link href={`/invoices/${i.number}`} className="hover:underline">
                        {i.number}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{day(i.issuedAt)}</TableCell>
                    <TableCell className="max-w-72 truncate">{i.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(i.totalInr)}</TableCell>
                    <TableCell>
                      <Badge variant={i.status === "PAID" ? "default" : "outline"}>{i.status.toLowerCase()}</Badge>
                      {i.isSimulated && <span className="ml-1 text-xs text-muted-foreground">test</span>}
                    </TableCell>
                    <TableCell className="pr-5 text-right whitespace-nowrap">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/invoices/${i.number}`}>View</Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" aria-label={`Download ${i.number}`}>
                        <a href={`/api/invoices/${i.number}/pdf`}>
                          <Download />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
