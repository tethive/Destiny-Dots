import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/server/settings";

type Tx = Prisma.TransactionClient;

/** Indian financial year for a date, e.g. 15 Sep 2026 → "2026-27". */
export function financialYear(date: Date) {
  const ist = new Date(date.getTime() + 330 * 60_000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Gap-free sequential number inside the transaction: DD-2026-27-00001. */
async function nextInvoiceNumber(tx: Tx, issuedAt: Date) {
  const fy = financialYear(issuedAt);
  const counter = await tx.invoiceCounter.upsert({
    where: { financialYear: fy },
    update: { last: { increment: 1 } },
    create: { financialYear: fy, last: 1 },
  });
  return `DD-${fy}-${String(counter.last).padStart(5, "0")}`;
}

export type BusinessSettings = Awaited<ReturnType<typeof getSetting<"business">>>;

/** GST is included in the price. Until a GSTIN is set, invoices are bills of supply with no tax line. */
function taxFor(totalInr: number, business: BusinessSettings) {
  if (!business.gstin) return { kind: "BILL_OF_SUPPLY" as const, taxInr: 0, sellerGstin: null };
  return { kind: "TAX_INVOICE" as const, taxInr: Math.round((totalInr * 18) / 118), sellerGstin: business.gstin };
}

export async function describeOrder(order: { scope: string; scopeId: string | null }, client: Tx | typeof db = db) {
  if (!order.scopeId) return "Destiny Dots purchase";
  if (order.scope === "PATH") {
    const p = await client.careerPath.findUnique({ where: { id: order.scopeId }, select: { title: true } });
    return `Path unlock — ${p?.title ?? "Career path"}`;
  }
  if (order.scope === "DOT") {
    const d = await client.dot.findUnique({ where: { id: order.scopeId }, select: { order: true, title: true, path: { select: { title: true } } } });
    return d ? `Dot unlock — Dot ${d.order}: ${d.title} (${d.path.title})` : "Dot unlock";
  }
  if (order.scope === "PROJECT") {
    const p = await client.project.findUnique({ where: { id: order.scopeId }, select: { title: true } });
    return `Marketplace project — ${p?.title ?? "Project"}`;
  }
  return "Destiny Dots purchase";
}

export async function createOrderInvoice(
  tx: Tx,
  order: { id: string; userId: string; scope: string; scopeId: string | null; amountInr: number; isSimulated: boolean; priceId: string | null },
  razorpayPaymentId: string | null,
  business: BusinessSettings,
) {
  const existing = await tx.invoice.findUnique({ where: { orderId: order.id } });
  if (existing) return existing;
  const user = await tx.user.findUniqueOrThrow({ where: { id: order.userId }, select: { name: true, email: true } });
  const price = order.priceId ? await tx.price.findUnique({ where: { id: order.priceId }, select: { amountInr: true } }) : null;
  const description = await describeOrder(order, tx);
  const issuedAt = new Date();
  const subtotal = order.scope === "PROJECT" ? order.amountInr : (price?.amountInr ?? order.amountInr);
  const tax = taxFor(order.amountInr, business);
  return tx.invoice.create({
    data: {
      number: await nextInvoiceNumber(tx, issuedAt),
      userId: order.userId,
      orderId: order.id,
      razorpayPaymentId,
      description,
      billingName: user.name,
      billingEmail: user.email,
      subtotalInr: subtotal,
      discountInr: Math.max(0, subtotal - order.amountInr),
      totalInr: order.amountInr,
      isSimulated: order.isSimulated,
      issuedAt,
      ...tax,
    },
  });
}

export async function createSubscriptionInvoice(
  tx: Tx,
  sub: { id: string; userId: string; isSimulated: boolean; plan: { name: string; priceInr: number } },
  charge: { paymentId: string | null; amountInr: number; periodStart: Date | null; periodEnd: Date },
  business: BusinessSettings,
) {
  if (charge.paymentId) {
    const existing = await tx.invoice.findUnique({ where: { razorpayPaymentId: charge.paymentId } });
    if (existing) return { invoice: existing, created: false };
  }
  const user = await tx.user.findUniqueOrThrow({ where: { id: sub.userId }, select: { name: true, email: true } });
  const issuedAt = new Date();
  const tax = taxFor(charge.amountInr, business);
  const invoice = await tx.invoice.create({
    data: {
      number: await nextInvoiceNumber(tx, issuedAt),
      userId: sub.userId,
      subscriptionId: sub.id,
      razorpayPaymentId: charge.paymentId,
      description: `${sub.plan.name} subscription`,
      billingName: user.name,
      billingEmail: user.email,
      subtotalInr: charge.amountInr,
      totalInr: charge.amountInr,
      periodStart: charge.periodStart,
      periodEnd: charge.periodEnd,
      isSimulated: sub.isSimulated,
      issuedAt,
      ...tax,
    },
  });
  return { invoice, created: true };
}

/** An invoice the current user may see (their own, or any for admins), shaped for the PDF and page. */
export async function getInvoiceView(number: string, user: { id: string; role?: string | null }) {
  const invoice = await db.invoice.findUnique({ where: { number } });
  if (!invoice || (invoice.userId !== user.id && user.role !== "admin")) return null;
  const business = await getSetting("business");
  return { ...invoice, business };
}
