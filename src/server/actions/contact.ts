"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { contactInbox, sendEmail } from "@/lib/email";
import { contactAckTemplate, contactAdminTemplate } from "@/lib/email-templates";
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/security";
import { contactTopics } from "@/lib/contact";
import { getSession } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(80),
  email: z.email("Enter a valid email address.").max(160),
  topic: z.enum(contactTopics),
  message: z.string().trim().min(10, "Add a little more detail (at least 10 characters).").max(4000, "Please keep it under 4,000 characters."),
  /** Honeypot: real people never fill this hidden field. */
  website: z.string().max(0).optional().default(""),
  captcha: z.string().max(2048).nullable().optional(),
});

export type ContactResult = { ok: true } | { ok: false; error: string; field?: "name" | "email" | "message" };

/** Stores the message, emails the team (reply-to = sender) and sends the sender a confirmation. */
export async function submitContact(input: z.input<typeof schema>): Promise<ContactResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path[0];
    if (field === "website") return { ok: true }; // silently drop bots
    return { ok: false, error: issue.message, field: field === "name" || field === "email" || field === "message" ? field : undefined };
  }
  const data = parsed.data;
  const ip = await clientIp();

  if (!(await rateLimit("contact:ip", ip, 5, 60 * 60)) || !(await rateLimit("contact:email", data.email.toLowerCase(), 3, 60 * 60))) {
    return { ok: false, error: "You've sent a few messages already. Please try again in an hour, or email us directly." };
  }
  if (!(await verifyTurnstile(data.captcha, ip))) {
    return { ok: false, error: "We couldn't verify you're human. Please try again." };
  }

  const session = await getSession();
  await db.contactMessage.create({
    data: { name: data.name, email: data.email, topic: data.topic, message: data.message, userId: session?.user.id },
  });

  await Promise.all([
    sendEmail(contactInbox(), contactAdminTemplate({ ...data, signedIn: Boolean(session) }), { replyTo: data.email }),
    sendEmail(data.email, contactAckTemplate(data)),
  ]);
  return { ok: true };
}
