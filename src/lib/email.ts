import "server-only";
import { Resend } from "resend";
import { env, features, isProduction } from "@/lib/env";
import { escapeHtml } from "@/lib/security";
import { contactConfig, siteConfig } from "@/lib/site";
import { recordUsageSnapshot, trackUsage, utcDay } from "@/server/usage";

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export type EmailContent = {
  subject: string;
  /** Short preview text shown next to the subject in inboxes. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** Label/value rows, e.g. order details. */
  details?: [string, string][];
  action?: { label: string; url: string };
  /** Quoted block, e.g. a copy of the contact message. */
  quote?: string;
  footerNote?: string;
};

const brand = "#5b3fd6";

function renderHtml(c: EmailContent) {
  const p = (t: string) => `<p style="margin:0 0 14px;line-height:1.65;color:#3b3850;font-size:15px">${escapeHtml(t)}</p>`;
  const details = c.details?.length
    ? `<table role="presentation" width="100%" style="margin:18px 0;border-collapse:collapse;font-size:14px">${c.details
        .map(
          ([k, v]) =>
            `<tr><td style="padding:9px 0;border-bottom:1px solid #eceaf3;color:#6b6880">${escapeHtml(k)}</td><td style="padding:9px 0;border-bottom:1px solid #eceaf3;text-align:right;color:#1c1830;font-weight:600">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const quote = c.quote
    ? `<div style="margin:18px 0;padding:14px 16px;border-left:3px solid ${brand};background:#f6f4fd;border-radius:8px;color:#3b3850;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(c.quote)}</div>`
    : "";
  const action = c.action
    ? `<p style="margin:26px 0"><a href="${escapeHtml(c.action.url)}" style="display:inline-block;background:${brand};color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">${escapeHtml(c.action.label)}</a></p>
       <p style="margin:0 0 14px;color:#8a879c;font-size:12px;line-height:1.5">If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(c.action.url)}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f3f8;padding:24px 12px">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(c.preheader)}</span>
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
    <p style="margin:0;font-weight:700;font-size:16px;color:#1c1830"><span style="color:${brand}">●</span> ${escapeHtml(siteConfig.name)}</p>
    <h1 style="font-size:22px;line-height:1.3;margin:24px 0 14px;color:#1c1830">${escapeHtml(c.heading)}</h1>
    ${c.paragraphs.map(p).join("")}
    ${quote}${details}${action}
    <hr style="border:none;border-top:1px solid #eceaf3;margin:28px 0 16px">
    <p style="margin:0;color:#8a879c;font-size:12px;line-height:1.6">${escapeHtml(c.footerNote ?? "You're receiving this because of activity on your Destiny Dots account.")}<br>
    ${escapeHtml(siteConfig.name)} · ${escapeHtml(contactConfig.address)} · ${escapeHtml(contactConfig.email)}</p>
  </div></body></html>`;
}

function renderText(c: EmailContent) {
  return [
    c.heading,
    "",
    ...c.paragraphs,
    ...(c.quote ? ["", c.quote.replace(/^/gm, "> ")] : []),
    ...(c.details?.length ? ["", ...c.details.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(c.action ? ["", `${c.action.label}: ${c.action.url}`] : []),
    "",
    "—",
    `${siteConfig.name} · ${contactConfig.email}`,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                     */
/* -------------------------------------------------------------------------- */

let resend: Resend | null = null;

/** Resend returns the account's used quota with every send (the daily figure only on the free plan). */
async function recordResendQuota(headers: Record<string, string> | null) {
  if (!headers) return;
  const pick = (name: string) => (headers[name] === undefined ? null : Number(headers[name]));
  const daily = pick("x-resend-daily-quota");
  const monthly = pick("x-resend-monthly-quota");
  const day = utcDay();
  await Promise.all([
    daily !== null && recordUsageSnapshot("resend", "account_daily", daily, day),
    monthly !== null && recordUsageSnapshot("resend", "account_monthly", monthly, day),
  ]);
}

/**
 * Sends through Resend. Never throws: email failure must not break sign-up or
 * fulfilment, so errors are logged for follow-up. In development without a key
 * the message is printed to the server console.
 */
export async function sendEmail(to: string, content: EmailContent, options: { replyTo?: string } = {}) {
  if (!features.email) {
    if (isProduction) {
      console.error(`[email] RESEND_API_KEY missing — dropped "${content.subject}"`);
      return { ok: false };
    }
    console.info(`\n[email:dev] To: ${to}${options.replyTo ? ` (reply-to ${options.replyTo})` : ""}\n[email:dev] ${content.subject}\n${renderText(content)}\n`);
    return { ok: true };
  }
  resend ??= new Resend(env.RESEND_API_KEY);
  try {
    const { error, headers } = await resend.emails.send({
      from: env.EMAIL_FROM ?? `${siteConfig.name} <onboarding@resend.dev>`,
      to,
      replyTo: options.replyTo,
      subject: content.subject,
      html: renderHtml(content),
      text: renderText(content),
    });
    await recordResendQuota(headers);
    if (error) {
      console.error("[email] send failed", content.subject, error);
      await trackUsage("resend", "failed");
      return { ok: false };
    }
    await trackUsage("resend", "emails");
    return { ok: true };
  } catch (e) {
    console.error("[email] send threw", content.subject, e);
    await trackUsage("resend", "failed");
    return { ok: false };
  }
}

export const contactInbox = () => env.CONTACT_INBOX ?? contactConfig.email;
