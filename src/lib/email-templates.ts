import "server-only";
import type { EmailContent } from "@/lib/email";
import { formatINR } from "@/lib/pricing";
import { siteConfig } from "@/lib/site";

const url = (path: string) => new URL(path, siteConfig.url).toString();
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

export const verifyEmailTemplate = (name: string, link: string): EmailContent => ({
  subject: "Confirm your email for Destiny Dots",
  preheader: "One click to activate your account.",
  heading: `Welcome, ${first(name)} — confirm your email`,
  paragraphs: ["Please confirm this is your email address to activate your Destiny Dots account. The link expires in 24 hours."],
  action: { label: "Confirm email", url: link },
  footerNote: "If you didn't create a Destiny Dots account, you can ignore this email.",
});

export const welcomeTemplate = (name: string): EmailContent => ({
  subject: "Welcome to Destiny Dots 🎯",
  preheader: "Your career roadmap starts here.",
  heading: `You're in, ${first(name)}!`,
  paragraphs: [
    "Destiny Dots breaks tech careers into small milestones — dots — each with hand-picked resources and a quick checkpoint.",
    "Take the 60-second quiz and we'll recommend the paths that fit your goals and the time you have each week. The first dots of every path are free.",
  ],
  action: { label: "Find my path", url: url("/welcome") },
});

export const resetPasswordTemplate = (name: string, link: string): EmailContent => ({
  subject: "Reset your Destiny Dots password",
  preheader: "This link expires in one hour.",
  heading: "Reset your password",
  paragraphs: [
    `Hi ${first(name)}, we received a request to reset your password. This link expires in one hour and can be used once.`,
    "If you didn't ask for this, you can safely ignore this email — your password won't change.",
  ],
  action: { label: "Choose a new password", url: link },
});

export const passwordChangedTemplate = (name: string): EmailContent => ({
  subject: "Your Destiny Dots password was changed",
  preheader: "If this wasn't you, reset it now.",
  heading: "Your password was changed",
  paragraphs: [
    `Hi ${first(name)}, the password for your account was just changed and other devices were signed out.`,
    "If you didn't do this, reset your password immediately and contact us.",
  ],
  action: { label: "Reset password", url: url("/forgot-password") },
});

/* -------------------------------------------------------------------------- */
/* Contact                                                                     */
/* -------------------------------------------------------------------------- */

export const contactAdminTemplate = (m: { name: string; email: string; topic: string; message: string; signedIn: boolean }): EmailContent => ({
  subject: `[Contact] ${m.topic} — ${m.name}`,
  preheader: m.message.slice(0, 90),
  heading: "New message from the contact form",
  paragraphs: ["Reply to this email to answer them directly."],
  quote: m.message,
  details: [
    ["Name", m.name],
    ["Email", m.email],
    ["Topic", m.topic],
    ["Account", m.signedIn ? "Signed-in user" : "Visitor"],
  ],
  action: { label: "Open inbox", url: url("/admin/messages") },
  footerNote: "Sent from the Destiny Dots contact form.",
});

export const contactAckTemplate = (m: { name: string; topic: string; message: string }): EmailContent => ({
  subject: "We've received your message",
  preheader: "Thanks for writing to Destiny Dots.",
  heading: `Thanks, ${first(m.name)} — we got your message`,
  paragraphs: [
    `Your message about "${m.topic}" has reached the Destiny Dots team. We'll reply to this email address as soon as we can.`,
    "Here's a copy for your records:",
  ],
  quote: m.message,
  footerNote: "You're receiving this because you contacted Destiny Dots.",
});

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

export const purchaseReceiptTemplate = (p: {
  name: string;
  item: string;
  amountInr: number;
  invoiceNumber: string;
  paidAt: Date;
  paymentId?: string | null;
  cta: { label: string; path: string };
}): EmailContent => ({
  subject: `Payment received — ${p.item}`,
  preheader: `${formatINR(p.amountInr)} paid. Invoice ${p.invoiceNumber}.`,
  heading: "Thanks for your purchase!",
  paragraphs: [`Hi ${first(p.name)}, your payment was successful and your access is ready.`],
  details: [
    ["Item", p.item],
    ["Amount paid", formatINR(p.amountInr)],
    ["Date", date(p.paidAt)],
    ["Invoice", p.invoiceNumber],
    ...(p.paymentId ? ([["Payment ID", p.paymentId]] as [string, string][]) : []),
  ],
  action: { label: p.cta.label, url: url(p.cta.path) },
  footerNote: `View or download this invoice any time from the Invoices page in your account. Questions about a charge? Reply to ${siteConfig.name} support.`,
});

export const subscriptionRenewedTemplate = (p: { name: string; plan: string; amountInr: number; invoiceNumber: string; validUntil: Date }): EmailContent => ({
  subject: `Your ${p.plan} renewed`,
  preheader: `${formatINR(p.amountInr)} charged. Pro access until ${date(p.validUntil)}.`,
  heading: "Your Pro subscription renewed",
  paragraphs: [`Hi ${first(p.name)}, thanks for staying with Destiny Dots Pro.`],
  details: [
    ["Plan", p.plan],
    ["Amount", formatINR(p.amountInr)],
    ["Access until", date(p.validUntil)],
    ["Invoice", p.invoiceNumber],
  ],
  action: { label: "View invoice", url: url(`/invoices/${encodeURIComponent(p.invoiceNumber)}`) },
});

export const paymentFailedTemplate = (p: { name: string; item: string }): EmailContent => ({
  subject: "Your payment didn't go through",
  preheader: "No money was taken. You can try again.",
  heading: "Payment unsuccessful",
  paragraphs: [
    `Hi ${first(p.name)}, your payment for ${p.item} didn't complete. If any amount was debited, your bank will reverse it automatically within 5–7 working days.`,
    "You can try again with UPI, a card or netbanking.",
  ],
  action: { label: "Try again", url: url("/billing") },
});

export const subscriptionHaltedTemplate = (p: { name: string; plan: string }): EmailContent => ({
  subject: "Action needed: your Pro renewal failed",
  preheader: "Update your payment method to keep Pro.",
  heading: "We couldn't renew your subscription",
  paragraphs: [
    `Hi ${first(p.name)}, Razorpay couldn't charge your payment method for ${p.plan} after several attempts, so the subscription is paused.`,
    "Your one-off unlocks and progress are safe. Restart Pro from the billing page whenever you're ready.",
  ],
  action: { label: "Go to billing", url: url("/billing") },
});

export const subscriptionCancelledTemplate = (p: { name: string; plan: string; validUntil: Date | null }): EmailContent => ({
  subject: "Your Pro subscription is cancelled",
  preheader: p.validUntil ? `Pro stays active until ${date(p.validUntil)}.` : "Your subscription has ended.",
  heading: "Subscription cancelled",
  paragraphs: [
    p.validUntil
      ? `Hi ${first(p.name)}, your ${p.plan} won't renew. You keep Pro access until ${date(p.validUntil)}.`
      : `Hi ${first(p.name)}, your ${p.plan} has ended.`,
    "Your progress and any one-off unlocks stay with your account.",
  ],
  action: { label: "Resubscribe", url: url("/billing") },
});

export const refundTemplate = (p: { name: string; item: string; amountInr: number; invoiceNumber?: string }): EmailContent => ({
  subject: `Refund issued — ${p.item}`,
  preheader: `${formatINR(p.amountInr)} is on its way back to you.`,
  heading: "Your refund is on its way",
  paragraphs: [
    `Hi ${first(p.name)}, we've refunded ${formatINR(p.amountInr)} for ${p.item}. It usually reaches your account in 5–7 working days, depending on your bank.`,
    "Access that came with this purchase has been removed.",
  ],
  details: p.invoiceNumber ? [["Invoice", p.invoiceNumber]] : undefined,
});

/* -------------------------------------------------------------------------- */
/* Marketplace                                                                 */
/* -------------------------------------------------------------------------- */

export const projectSubmittedAdminTemplate = (p: { title: string; seller: string; id: string }): EmailContent => ({
  subject: `[Marketplace] Review needed: ${p.title}`,
  preheader: `${p.seller} submitted a project.`,
  heading: "A project is waiting for review",
  paragraphs: [`${p.seller} submitted "${p.title}" to the marketplace.`],
  action: { label: "Review listing", url: url(`/admin/marketplace/${p.id}`) },
});

export const projectReviewedTemplate = (p: { name: string; title: string; approved: boolean; reason?: string | null; slug: string; id: string }): EmailContent => ({
  subject: p.approved ? `Your project "${p.title}" is live` : `Changes needed: ${p.title}`,
  preheader: p.approved ? "Students can now buy it." : "Update your listing and resubmit.",
  heading: p.approved ? "Your project is live 🎉" : "Your listing needs changes",
  paragraphs: p.approved
    ? [`Hi ${first(p.name)}, "${p.title}" was approved and is now listed on the Destiny Dots marketplace.`]
    : [`Hi ${first(p.name)}, "${p.title}" wasn't approved yet. Here's what to fix before resubmitting:`],
  quote: p.approved ? undefined : (p.reason ?? undefined),
  action: p.approved
    ? { label: "View listing", url: url(`/marketplace/${p.slug}`) }
    : { label: "Edit listing", url: url(`/marketplace/sell/${p.id}`) },
});

export const projectSoldTemplate = (p: { name: string; title: string; earningInr: number; holdDays: number }): EmailContent => ({
  subject: `You made a sale: ${p.title}`,
  preheader: `${formatINR(p.earningInr)} added to your earnings.`,
  heading: "You made a sale! 🎉",
  paragraphs: [
    `Hi ${first(p.name)}, a student just bought "${p.title}".`,
    `${formatINR(p.earningInr)} (after commission) will be payable after the ${p.holdDays}-day protection period.`,
  ],
  action: { label: "View earnings", url: url("/marketplace/sell") },
});

export const payoutPaidTemplate = (p: { name: string; amountInr: number; reference: string; hint: string }): EmailContent => ({
  subject: `Payout sent: ${formatINR(p.amountInr)}`,
  preheader: `Reference ${p.reference}`,
  heading: "Your payout has been sent",
  paragraphs: [`Hi ${first(p.name)}, we've sent your marketplace earnings.`],
  details: [
    ["Amount", formatINR(p.amountInr)],
    ["Sent to", p.hint],
    ["Reference", p.reference],
  ],
  action: { label: "View payouts", url: url("/marketplace/sell") },
});

export const disputeOpenedTemplate = (p: { title: string; reason: string; details: string; forAdmin: boolean; name: string }): EmailContent => ({
  subject: p.forAdmin ? `[Marketplace] Dispute opened: ${p.title}` : `A buyer reported an issue with ${p.title}`,
  preheader: p.reason,
  heading: p.forAdmin ? "A buyer opened a dispute" : "A buyer reported an issue",
  paragraphs: p.forAdmin
    ? [`A buyer opened a dispute on "${p.title}". Earnings for this sale are on hold until it's resolved.`]
    : [`Hi ${first(p.name)}, a buyer reported a problem with "${p.title}". Our team will review it and may contact you. Earnings for this sale are on hold meanwhile.`],
  quote: `${p.reason}\n\n${p.details}`,
  action: p.forAdmin ? { label: "Review dispute", url: url("/admin/marketplace?tab=disputes") } : undefined,
});

export const disputeResolvedTemplate = (p: { name: string; title: string; refunded: boolean; resolution: string }): EmailContent => ({
  subject: `Dispute resolved: ${p.title}`,
  preheader: p.refunded ? "A refund was issued." : "No refund was issued.",
  heading: "Your dispute has been resolved",
  paragraphs: [`Hi ${first(p.name)}, the dispute on "${p.title}" was reviewed. ${p.refunded ? "The buyer was refunded." : "No refund was issued."}`],
  quote: p.resolution,
});
