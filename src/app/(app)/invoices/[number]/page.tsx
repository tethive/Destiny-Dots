import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { PrintButton } from "@/components/invoice/print-button";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { getInvoiceView } from "@/server/invoices";

export async function generateMetadata(props: PageProps<"/invoices/[number]">): Promise<Metadata> {
  const { number } = await props.params;
  return { title: `Invoice ${number}` };
}

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function InvoicePage(props: PageProps<"/invoices/[number]">) {
  const { number } = await props.params;
  const user = await requireUser(`/invoices/${number}`);
  const i = await getInvoiceView(number, user);
  if (!i) notFound();
  const heading = i.kind === "TAX_INVOICE" ? "Tax Invoice" : "Bill of Supply";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All invoices
        </Link>
        <div className="flex gap-2">
          <PrintButton />
          <Button asChild size="lg" className="rounded-full">
            <a href={`/api/invoices/${i.number}/pdf`}>
              <Download data-icon="inline-start" /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      <article className="rounded-2xl border bg-card p-6 shadow-xs sm:p-10 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-lg font-semibold">
              <span className="text-primary">●</span> {i.business.legalName}
            </p>
            <p className="text-sm text-muted-foreground">{i.business.address}</p>
            <p className="text-sm text-muted-foreground">
              {i.business.email} · {i.business.phone}
            </p>
            {i.sellerGstin && <p className="text-sm text-muted-foreground">GSTIN: {i.sellerGstin}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
            <p className="font-mono text-sm text-muted-foreground">{i.number}</p>
            <span
              className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${i.status === "REFUNDED" ? "bg-destructive/10 text-destructive" : "bg-success/12 text-success"}`}
            >
              {i.status}
            </span>
          </div>
        </header>

        <dl className="mt-8 grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Billed to</dt>
            <dd className="mt-1 font-medium">{i.billingName}</dd>
            <dd className="text-muted-foreground">{i.billingEmail}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Invoice date</dt>
            <dd className="mt-1">{day(i.issuedAt)}</dd>
            {i.periodEnd && (
              <>
                <dt className="mt-3 text-xs tracking-wide text-muted-foreground uppercase">Service period</dt>
                <dd className="mt-1">
                  {i.periodStart ? `${day(i.periodStart)} – ` : "Until "}
                  {day(i.periodEnd)}
                </dd>
              </>
            )}
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Payment</dt>
            <dd className="mt-1">{i.isSimulated ? "Test payment (simulated)" : "Razorpay"}</dd>
            {i.razorpayPaymentId && <dd className="font-mono text-xs text-muted-foreground">{i.razorpayPaymentId}</dd>}
          </div>
        </dl>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-center font-medium">SAC</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">{i.description}</td>
                <td className="py-3 text-center text-muted-foreground">999293</td>
                <td className="py-3 text-right tabular-nums">{formatINR(i.subtotalInr)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <dl className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(i.subtotalInr)}</dd>
          </div>
          {i.discountInr > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="tabular-nums">− {formatINR(i.discountInr)}</dd>
            </div>
          )}
          {i.kind === "TAX_INVOICE" && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">GST 18% (included)</dt>
              <dd className="tabular-nums">{formatINR(i.taxInr)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total paid</dt>
            <dd className="tabular-nums">{formatINR(i.totalInr)}</dd>
          </div>
        </dl>

        <p className="mt-10 text-xs text-muted-foreground">
          {i.kind === "BILL_OF_SUPPLY" ? "Supplier not registered under GST; no tax has been charged. " : "Amounts are inclusive of GST. "}
          This is a computer-generated document and does not require a signature.
        </p>
      </article>
    </div>
  );
}
