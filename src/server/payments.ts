import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import type { BillingInterval, Scope } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  paymentFailedTemplate,
  projectSoldTemplate,
  purchaseReceiptTemplate,
  refundTemplate,
  subscriptionCancelledTemplate,
  subscriptionHaltedTemplate,
  subscriptionRenewedTemplate,
} from "@/lib/email-templates";
import { env, features, isProduction } from "@/lib/env";
import { createOrderInvoice, createSubscriptionInvoice, describeOrder } from "@/server/invoices";
import { getSetting } from "@/server/settings";

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

export const razorpayEnabled = features.razorpay;
/** Razorpay plans are created automatically from the prices in admin settings. */
export const subscriptionsEnabled = razorpayEnabled;

/**
 * Local-only stand-in for Razorpay so gating can be tested before keys exist.
 * It calls the exact same fulfilment functions the webhook uses and can never
 * run in production.
 */
export const simulatorEnabled = !isProduction && !razorpayEnabled;

/** False in production until Razorpay keys are added — purchase buttons show "Payments opening soon". */
export const paymentsAvailable = razorpayEnabled || simulatorEnabled;

/** Fulfilment touches several tables; give slow networks more than the 5s default. */
const txOptions = { maxWait: 10_000, timeout: 20_000 };

let client: Razorpay | null = null;
function razorpay() {
  if (!razorpayEnabled) throw new Error("Razorpay is not configured");
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! });
  return client;
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/** Price for a one-off unlock: a specific override if present, else the default for the scope. */
export async function priceFor(scope: "PATH" | "DOT", scopeId: string) {
  const specific = await db.price.findFirst({ where: { scope, scopeId, isActive: true } });
  if (specific) return specific;
  const fallback = await db.price.findFirst({ where: { scope, scopeId: null, isActive: true } });
  if (!fallback) throw new Error(`No price configured for ${scope}`);
  return fallback;
}

export async function validateCoupon(code: string | undefined, scope: Scope, scopeId?: string) {
  if (!code) return { coupon: null, error: null };
  if (scope === "PROJECT" || scope === "PLAN") return { coupon: null, error: "Coupons can't be used for this purchase." };
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.isActive) return { coupon: null, error: "That coupon code isn't valid." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { coupon: null, error: "That coupon has expired." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { coupon: null, error: "That coupon has been fully used." };
  if (coupon.scope && (coupon.scope !== scope || (coupon.scopeId && coupon.scopeId !== scopeId)))
    return { coupon: null, error: "That coupon doesn't apply to this purchase." };
  return { coupon, error: null };
}

export const applyDiscount = (amount: number, pct: number) => Math.max(1, Math.round((amount * (100 - pct)) / 100));

/** Creates (or re-creates after a price change) the Razorpay plan for an interval. */
export async function ensureRazorpayPlan(interval: BillingInterval) {
  const plan = await db.plan.findUniqueOrThrow({ where: { interval } });
  if (plan.razorpayPlanId) {
    const remote = await razorpay().plans.fetch(plan.razorpayPlanId).catch(() => null);
    if (remote && Number(remote.item.amount) === plan.priceInr * 100) return plan.razorpayPlanId;
  }
  const created = await razorpay().plans.create({
    period: interval === "MONTHLY" ? "monthly" : "yearly",
    interval: 1,
    item: { name: plan.name, amount: plan.priceInr * 100, currency: "INR", description: "Destiny Dots Pro — every dot in every path" },
    notes: { planId: plan.id },
  });
  await db.plan.update({ where: { id: plan.id }, data: { razorpayPlanId: created.id } });
  return created.id;
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                    */
/* -------------------------------------------------------------------------- */

export type CheckoutSession =
  | { mode: "razorpay"; kind: "order"; keyId: string; orderId: string; razorpayOrderId: string; amountPaise: number; description: string; prefill: Prefill }
  | { mode: "razorpay"; kind: "subscription"; keyId: string; subscriptionId: string; razorpaySubscriptionId: string; description: string; prefill: Prefill }
  | { mode: "simulator"; kind: "order"; orderId: string; amountInr: number; description: string }
  | { mode: "simulator"; kind: "subscription"; subscriptionId: string; amountInr: number; description: string };

type Prefill = { name: string; email: string };

async function prefillFor(userId: string): Promise<Prefill> {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
  return { name: u.name, email: u.email };
}

async function createRazorpayOrder(order: { id: string; userId: string; scope: Scope; scopeId: string | null; amountInr: number }, description: string) {
  const rzp = await razorpay().orders.create({
    amount: order.amountInr * 100,
    currency: "INR",
    receipt: order.id,
    notes: { orderId: order.id, userId: order.userId, scope: order.scope, scopeId: order.scopeId ?? "" },
  });
  await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
  return {
    mode: "razorpay" as const,
    kind: "order" as const,
    keyId: env.RAZORPAY_KEY_ID!,
    orderId: order.id,
    razorpayOrderId: rzp.id,
    amountPaise: order.amountInr * 100,
    description,
    prefill: await prefillFor(order.userId),
  };
}

export async function createOneOffCheckout(input: {
  userId: string;
  scope: "PATH" | "DOT";
  scopeId: string;
  description: string;
  couponCode?: string;
}): Promise<CheckoutSession | { error: string }> {
  const price = await priceFor(input.scope, input.scopeId);
  const { coupon, error } = await validateCoupon(input.couponCode, input.scope, input.scopeId);
  if (error) return { error };
  const amountInr = coupon ? applyDiscount(price.amountInr, coupon.discountPct) : price.amountInr;
  if (!razorpayEnabled && !simulatorEnabled) return { error: "Payments are not available right now." };

  const order = await db.order.create({
    data: {
      userId: input.userId,
      priceId: price.id,
      scope: input.scope,
      scopeId: input.scopeId,
      amountInr,
      couponId: coupon?.id,
      isSimulated: !razorpayEnabled,
    },
  });
  if (!razorpayEnabled) return { mode: "simulator", kind: "order", orderId: order.id, amountInr, description: input.description };
  return createRazorpayOrder(order, input.description);
}

export async function createProjectCheckout(input: { userId: string; projectId: string }): Promise<CheckoutSession | { error: string }> {
  const project = await db.project.findUnique({ where: { id: input.projectId } });
  if (!project || project.status !== "APPROVED") return { error: "This project isn't available." };
  if (project.sellerId === input.userId) return { error: "You can't buy your own project." };
  const owned = await db.projectPurchase.findUnique({ where: { projectId_buyerId: { projectId: project.id, buyerId: input.userId } } });
  if (owned && owned.status !== "REFUNDED") return { error: "You already own this project." };
  if (!razorpayEnabled && !simulatorEnabled) return { error: "Payments are not available right now." };

  const order = await db.order.create({
    data: { userId: input.userId, scope: "PROJECT", scopeId: project.id, amountInr: project.priceInr, isSimulated: !razorpayEnabled },
  });
  const description = `Project: ${project.title}`;
  if (!razorpayEnabled) return { mode: "simulator", kind: "order", orderId: order.id, amountInr: project.priceInr, description };
  return createRazorpayOrder(order, description);
}

export async function createSubscriptionCheckout(input: { userId: string; interval: BillingInterval }): Promise<CheckoutSession | { error: string }> {
  const plan = await db.plan.findUnique({ where: { interval: input.interval } });
  if (!plan || !plan.isActive) return { error: "This plan isn't available right now." };

  const active = await db.subscription.findFirst({
    where: { userId: input.userId, status: { in: ["ACTIVE", "PAST_DUE"] }, validUntil: { gt: new Date() } },
  });
  if (active) return { error: "You already have an active Pro subscription." };
  if (!subscriptionsEnabled && !simulatorEnabled) return { error: "Subscriptions are not available right now." };

  // Abandoned checkouts leave CREATED rows; clear the user's old ones.
  await db.subscription.deleteMany({ where: { userId: input.userId, status: "CREATED", createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } });

  const sub = await db.subscription.create({ data: { userId: input.userId, planId: plan.id, isSimulated: !subscriptionsEnabled } });
  const description = `${plan.name} — all paths, all dots`;
  if (!subscriptionsEnabled) return { mode: "simulator", kind: "subscription", subscriptionId: sub.id, amountInr: plan.priceInr, description };

  const rzp = await razorpay().subscriptions.create({
    plan_id: await ensureRazorpayPlan(input.interval),
    total_count: input.interval === "MONTHLY" ? 120 : 10,
    customer_notify: 1,
    notes: { subscriptionId: sub.id, userId: input.userId },
  });
  await db.subscription.update({ where: { id: sub.id }, data: { razorpaySubId: rzp.id } });
  return {
    mode: "razorpay",
    kind: "subscription",
    keyId: env.RAZORPAY_KEY_ID!,
    subscriptionId: sub.id,
    razorpaySubscriptionId: rzp.id,
    description,
    prefill: await prefillFor(input.userId),
  };
}

/* -------------------------------------------------------------------------- */
/* Fulfilment — called only from the verified webhook (or the dev simulator)   */
/* -------------------------------------------------------------------------- */

export async function fulfillOrder(orderId: string, razorpayPaymentId: string | null) {
  const [marketplace, business] = await Promise.all([getSetting("marketplace"), getSetting("business")]);
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === "PAID" || order.status === "REFUNDED") return null;
    await tx.order.update({ where: { id: orderId }, data: { status: "PAID", razorpayPaymentId } });

    let sale: { sellerId: string; title: string; earning: number } | null = null;
    if (order.scope === "PROJECT") {
      const project = await tx.project.findUniqueOrThrow({ where: { id: order.scopeId! } });
      const commission = Math.round((order.amountInr * marketplace.commissionPct) / 100);
      const purchase = {
        amountInr: order.amountInr,
        commissionInr: commission,
        sellerEarningInr: order.amountInr - commission,
        orderId: order.id,
        status: "PAID" as const,
        payoutId: null,
      };
      await tx.projectPurchase.upsert({
        where: { projectId_buyerId: { projectId: project.id, buyerId: order.userId } },
        update: { ...purchase, createdAt: new Date() },
        create: { ...purchase, projectId: project.id, buyerId: order.userId },
      });
      await tx.project.update({ where: { id: project.id }, data: { salesCount: { increment: 1 } } });
      sale = { sellerId: project.sellerId, title: project.title, earning: purchase.sellerEarningInr };
    } else {
      await tx.entitlement.create({
        data: { userId: order.userId, scope: order.scope, scopeId: order.scopeId, source: "ONE_TIME", orderId: order.id },
      });
    }
    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    const invoice = await createOrderInvoice(tx, order, razorpayPaymentId, business);
    return { order, invoice, sale };
  }, txOptions);
  if (!result) return;

  const { order, invoice, sale } = result;
  const buyer = await db.user.findUniqueOrThrow({ where: { id: order.userId }, select: { name: true, email: true } });
  const cta = await ctaForOrder(order);
  await sendEmail(
    buyer.email,
    purchaseReceiptTemplate({
      name: buyer.name,
      item: invoice.description,
      amountInr: order.amountInr,
      invoiceNumber: invoice.number,
      paidAt: invoice.issuedAt,
      paymentId: razorpayPaymentId,
      cta,
    }),
  );
  if (sale) {
    const seller = await db.user.findUnique({ where: { id: sale.sellerId }, select: { name: true, email: true } });
    if (seller) await sendEmail(seller.email, projectSoldTemplate({ name: seller.name, title: sale.title, earningInr: sale.earning, holdDays: marketplace.holdDays }));
  }
}

export async function ctaForOrder(order: { scope: Scope; scopeId: string | null }) {
  if (order.scope === "PROJECT" && order.scopeId) {
    const p = await db.project.findUnique({ where: { id: order.scopeId }, select: { slug: true } });
    return { label: "Open your project", path: p ? `/marketplace/${p.slug}` : "/marketplace/purchases" };
  }
  if (order.scope === "PATH" && order.scopeId) {
    const p = await db.careerPath.findUnique({ where: { id: order.scopeId }, select: { slug: true } });
    return { label: "Start learning", path: p ? `/learn/${p.slug}` : "/my-paths" };
  }
  if (order.scope === "DOT" && order.scopeId) {
    const d = await db.dot.findUnique({ where: { id: order.scopeId }, select: { order: true, path: { select: { slug: true } } } });
    return { label: "Open the dot", path: d ? `/learn/${d.path.slug}/${d.order}` : "/my-paths" };
  }
  return { label: "Go to dashboard", path: "/dashboard" };
}

export async function failOrder(orderId: string) {
  const { count } = await db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "FAILED" } });
  if (!count) return;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { user: { select: { name: true, email: true } } } });
  await sendEmail(order.user.email, paymentFailedTemplate({ name: order.user.name, item: await describeOrder(order) }));
}

/**
 * Activation or renewal: extend Pro access to the end of the paid period and
 * issue an invoice for the charge (once per Razorpay payment).
 */
export async function activateSubscription(
  subscriptionId: string,
  period: { start: Date | null; end: Date },
  charge: { paymentId: string | null; amountInr: number | null },
) {
  const business = await getSetting("business");
  const result = await db.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
    if (!sub) return null;
    const firstActivation = sub.status === "CREATED";
    await tx.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", validUntil: period.end } });
    const existing = await tx.entitlement.findFirst({ where: { subscriptionId: sub.id, scope: "PLAN" } });
    if (existing) {
      await tx.entitlement.update({ where: { id: existing.id }, data: { validUntil: period.end, revokedAt: null } });
    } else {
      await tx.entitlement.create({
        data: { userId: sub.userId, scope: "PLAN", source: "SUBSCRIPTION", subscriptionId: sub.id, validUntil: period.end },
      });
    }
    // subscription.activated and subscription.charged can both arrive for the first payment; invoice only real charges.
    if (!charge.paymentId && !sub.isSimulated) return { sub, invoice: null, firstActivation };
    const { invoice, created } = await createSubscriptionInvoice(tx, sub, {
      paymentId: charge.paymentId,
      amountInr: charge.amountInr ?? sub.plan.priceInr,
      periodStart: period.start,
      periodEnd: period.end,
    }, business);
    return { sub, invoice: created ? invoice : null, firstActivation };
  }, txOptions);
  if (!result?.invoice) return;

  const { sub, invoice, firstActivation } = result;
  const user = await db.user.findUniqueOrThrow({ where: { id: sub.userId }, select: { name: true, email: true } });
  const priorInvoices = await db.invoice.count({ where: { subscriptionId: sub.id, id: { not: invoice.id } } });
  if (firstActivation || priorInvoices === 0) {
    await sendEmail(
      user.email,
      purchaseReceiptTemplate({
        name: user.name,
        item: invoice.description,
        amountInr: invoice.totalInr,
        invoiceNumber: invoice.number,
        paidAt: invoice.issuedAt,
        paymentId: charge.paymentId,
        cta: { label: "Start learning", path: "/dashboard" },
      }),
    );
  } else {
    await sendEmail(
      user.email,
      subscriptionRenewedTemplate({ name: user.name, plan: sub.plan.name, amountInr: invoice.totalInr, invoiceNumber: invoice.number, validUntil: period.end }),
    );
  }
}

/** Cancellation keeps access until the period already paid for ends. */
export async function endSubscription(subscriptionId: string, status: "CANCELLED" | "EXPIRED" | "PAST_DUE") {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true, user: { select: { name: true, email: true } } } });
  if (!sub || sub.status === status) return;
  await db.subscription.update({ where: { id: subscriptionId }, data: { status } });
  if (status === "PAST_DUE") {
    await sendEmail(sub.user.email, subscriptionHaltedTemplate({ name: sub.user.name, plan: sub.plan.name }));
  } else if (status === "CANCELLED") {
    await sendEmail(sub.user.email, subscriptionCancelledTemplate({ name: sub.user.name, plan: sub.plan.name, validUntil: sub.validUntil }));
  }
}

export async function cancelSubscription(userId: string, subscriptionId: string) {
  const sub = await db.subscription.findFirst({ where: { id: subscriptionId, userId } });
  if (!sub) return { error: "Subscription not found." };
  if (sub.cancelAtEnd) return { error: "This subscription is already set to cancel." };
  if (sub.razorpaySubId && razorpayEnabled) {
    await razorpay().subscriptions.cancel(sub.razorpaySubId, true); // cancel at cycle end
  }
  await db.subscription.update({ where: { id: sub.id }, data: { cancelAtEnd: true } });
  if (sub.isSimulated) await endSubscription(sub.id, "CANCELLED");
  return { ok: true };
}

/**
 * Full refund: calls Razorpay (unless the refund came from Razorpay itself),
 * revokes access or marks the project purchase refunded, and emails the buyer.
 */
export async function refundOrder(orderId: string, options: { alreadyRefundedAtRazorpay?: boolean } = {}) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { user: { select: { name: true, email: true } }, invoice: true } });
  if (!order || order.status !== "PAID") return { error: "Only paid orders can be refunded." };
  if (order.razorpayPaymentId && razorpayEnabled && !order.isSimulated && !options.alreadyRefundedAtRazorpay) {
    await razorpay().payments.refund(order.razorpayPaymentId, { amount: order.amountInr * 100, notes: { orderId: order.id } });
  }
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    await tx.entitlement.updateMany({ where: { orderId: order.id, revokedAt: null }, data: { revokedAt: new Date(), note: "Refunded" } });
    await tx.invoice.updateMany({ where: { orderId: order.id }, data: { status: "REFUNDED" } });
    if (order.scope === "PROJECT") {
      const purchase = await tx.projectPurchase.findUnique({ where: { orderId: order.id } });
      if (purchase && purchase.status !== "REFUNDED") {
        await tx.projectPurchase.update({ where: { id: purchase.id }, data: { status: "REFUNDED" } });
        await tx.project.update({ where: { id: purchase.projectId }, data: { salesCount: { decrement: 1 } } });
      }
    }
  });
  await sendEmail(
    order.user.email,
    refundTemplate({ name: order.user.name, item: order.invoice?.description ?? (await describeOrder(order)), amountInr: order.amountInr, invoiceNumber: order.invoice?.number }),
  );
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

function safeEqualHex(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

/** Display prices for paywalls (defaults; per-path/dot overrides apply at checkout). */
export async function displayPrices(pathId?: string, dotId?: string) {
  const [plans, dot, path] = await Promise.all([
    db.plan.findMany({ where: { isActive: true } }),
    dotId ? priceFor("DOT", dotId) : db.price.findFirst({ where: { scope: "DOT", scopeId: null } }),
    pathId ? priceFor("PATH", pathId) : db.price.findFirst({ where: { scope: "PATH", scopeId: null } }),
  ]);
  return {
    dot: dot?.amountInr ?? 149,
    path: path?.amountInr ?? 599,
    monthly: plans.find((p) => p.interval === "MONTHLY")?.priceInr ?? 299,
    yearly: plans.find((p) => p.interval === "YEARLY")?.priceInr ?? 1999,
  };
}
