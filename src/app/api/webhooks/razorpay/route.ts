import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  activateSubscription,
  endSubscription,
  failOrder,
  fulfillOrder,
  refundOrder,
  verifyWebhookSignature,
} from "@/server/payments";

type Entity = Record<string, unknown> & { id: string; notes?: Record<string, string> };
type RazorpayEvent = {
  event: string;
  payload: {
    order?: { entity: Entity };
    payment?: { entity: Entity };
    subscription?: { entity: Entity };
    refund?: { entity: Entity };
  };
};

const MAX_BODY_BYTES = 256 * 1024;

/**
 * The only place (besides admin grants) where access is granted in production.
 * Razorpay signs the raw body with the webhook secret; we verify, dedupe by
 * event id, check amounts against our own records, then fulfil.
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ error: "payload too large" }, { status: 413 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES || !verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: RazorpayEvent;
  try {
    body = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "missing event id" }, { status: 400 });

  try {
    await db.paymentEvent.create({ data: { eventId, event: body.event, payload: body as unknown as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  const order = body.payload.order?.entity;
  const payment = body.payload.payment?.entity;
  const subscription = body.payload.subscription?.entity;
  const refund = body.payload.refund?.entity;

  try {
    switch (body.event) {
      case "order.paid": {
        if (!order) break;
        const local = await db.order.findUnique({ where: { razorpayOrderId: order.id } });
        if (local && order.currency === "INR" && Number(order.amount_paid) >= local.amountInr * 100) {
          await fulfillOrder(local.id, payment?.id ?? null);
        }
        break;
      }
      case "payment.failed": {
        const orderId = payment?.order_id as string | undefined;
        if (!orderId) break;
        const local = await db.order.findUnique({ where: { razorpayOrderId: orderId } });
        if (local) await failOrder(local.id);
        break;
      }
      case "subscription.activated":
      case "subscription.charged": {
        if (!subscription) break;
        const local = await db.subscription.findUnique({ where: { razorpaySubId: subscription.id } });
        const end = Number(subscription.current_end);
        const start = Number(subscription.current_start);
        if (local && end) {
          await activateSubscription(
            local.id,
            { start: start ? new Date(start * 1000) : null, end: new Date(end * 1000) },
            {
              paymentId: body.event === "subscription.charged" ? (payment?.id ?? null) : null,
              amountInr: payment?.amount ? Number(payment.amount) / 100 : null,
            },
          );
        }
        break;
      }
      case "subscription.pending":
      case "subscription.halted": {
        if (!subscription) break;
        const local = await db.subscription.findUnique({ where: { razorpaySubId: subscription.id } });
        if (local && body.event === "subscription.halted") await endSubscription(local.id, "PAST_DUE");
        break;
      }
      case "subscription.cancelled":
      case "subscription.completed": {
        if (!subscription) break;
        const local = await db.subscription.findUnique({ where: { razorpaySubId: subscription.id } });
        if (local) await endSubscription(local.id, body.event === "subscription.completed" ? "EXPIRED" : "CANCELLED");
        break;
      }
      case "refund.processed": {
        // Refunds issued from the Razorpay dashboard: revoke access only for full refunds.
        const paymentId = refund?.payment_id as string | undefined;
        if (!paymentId) break;
        const local = await db.order.findFirst({ where: { razorpayPaymentId: paymentId, status: "PAID" } });
        if (local && Number(refund!.amount) >= local.amountInr * 100) {
          await refundOrder(local.id, { alreadyRefundedAtRazorpay: true });
        }
        break;
      }
    }
  } catch (e) {
    // Let Razorpay retry: forget the event so the retry isn't treated as a duplicate.
    await db.paymentEvent.delete({ where: { eventId } }).catch(() => null);
    console.error("[razorpay webhook] processing failed", body.event, e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
