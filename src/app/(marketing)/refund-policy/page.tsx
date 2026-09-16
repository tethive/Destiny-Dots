import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { formatINR } from "@/lib/pricing";
import { displayPrices } from "@/server/payments";
import { contactConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Refunds & cancellation" };

export default async function RefundPolicyPage() {
  const prices = await displayPrices();
  return (
    <LegalPage
      title="Refunds & cancellation"
      updated="15 September 2026"
      intro="Clear rules for subscriptions and one-off unlocks, so you always know where you stand."
    >
      <h2>Pro subscriptions</h2>
      <ul>
        <li>
          Pro is billed monthly ({formatINR(prices.monthly)}) or yearly ({formatINR(prices.yearly)}) and renews
          automatically.
        </li>
        <li>You can cancel anytime from your billing page. Cancellation stops the next renewal.</li>
        <li>After cancelling, you keep Pro access until the end of the period you&apos;ve already paid for.</li>
        <li>
          If you&apos;re charged for a renewal you didn&apos;t intend, contact us within 7 days of the charge and
          we&apos;ll review a refund.
        </li>
      </ul>

      <h2>One-off unlocks</h2>
      <ul>
        <li>
          Dot ({formatINR(prices.dot)}) and path ({formatINR(prices.path)}) unlocks are yours to keep —
          they stay unlocked even if you later cancel a subscription.
        </li>
        <li>
          Because content is available immediately, one-off unlocks are generally non-refundable. If content is
          missing, broken or not as described, contact us within 7 days and we&apos;ll fix it or refund you.
        </li>
      </ul>

      <h2>Failed or duplicate payments</h2>
      <p>
        If money was debited but access wasn&apos;t granted, or you were charged twice, write to us with your payment
        reference. Verified duplicate or failed charges are refunded in full.
      </p>

      <h2>How refunds are paid</h2>
      <p>
        Approved refunds are returned to the original payment method via Razorpay, typically within 5–7 working days
        depending on your bank.
      </p>

      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a> with your registered email and
        payment reference.
      </p>
    </LegalPage>
  );
}
