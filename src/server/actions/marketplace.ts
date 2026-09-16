"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { contactInbox, sendEmail } from "@/lib/email";
import { disputeOpenedTemplate, projectSubmittedAdminTemplate } from "@/lib/email-templates";
import { encrypt, rateLimit } from "@/lib/security";
import { requireUser } from "@/lib/session";
import { deleteObject } from "@/lib/storage";
import { hasPurchased, listZipEntries, readZipText } from "@/server/files";
import { createProjectCheckout } from "@/server/payments";
import { getSetting } from "@/server/settings";
import { verifyUploadedObject } from "@/server/uploads";

export type MarketResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const fail = (e: z.ZodError): MarketResult => ({ ok: false, error: e.issues[0]?.message ?? "Please check the form" });

async function requireMarketplace() {
  const settings = await getSetting("marketplace");
  if (!settings.enabled) throw new Error("The marketplace is currently closed.");
  return settings;
}

/* -------------------------------------------------------------------------- */
/* Seller onboarding                                                           */
/* -------------------------------------------------------------------------- */

const sellerSchema = z.discriminatedUnion("payoutMethod", [
  z.object({
    payoutMethod: z.literal("UPI"),
    displayName: z.string().trim().min(2).max(60),
    bio: z.string().trim().max(300).optional(),
    payoutName: z.string().trim().min(2, "Enter the account holder's name").max(80),
    upiId: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[\w.-]{2,256}@[a-z]{2,64}$/, "Enter a valid UPI ID, like name@okaxis"),
    acceptTerms: z.literal(true, { error: "Please accept the seller terms" }),
  }),
  z.object({
    payoutMethod: z.literal("BANK"),
    displayName: z.string().trim().min(2).max(60),
    bio: z.string().trim().max(300).optional(),
    payoutName: z.string().trim().min(2, "Enter the account holder's name").max(80),
    accountNumber: z.string().trim().regex(/^\d{9,18}$/, "Account numbers are 9–18 digits"),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
    acceptTerms: z.literal(true, { error: "Please accept the seller terms" }),
  }),
]);

export async function saveSellerProfile(input: z.input<typeof sellerSchema>): Promise<MarketResult> {
  const user = await requireUser();
  await requireMarketplace();
  const parsed = sellerSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const details = d.payoutMethod === "UPI" ? { upiId: d.upiId } : { accountNumber: d.accountNumber, ifsc: d.ifsc };
  const hint = d.payoutMethod === "UPI" ? `UPI ••••@${d.upiId.split("@")[1]}` : `A/c ••••${d.accountNumber.slice(-4)} · ${d.ifsc.slice(0, 4)}`;
  const data = {
    displayName: d.displayName,
    bio: d.bio || null,
    payoutMethod: d.payoutMethod,
    payoutName: d.payoutName,
    payoutDetailsEnc: encrypt(JSON.stringify(details)),
    payoutHint: hint,
    termsAcceptedAt: new Date(),
  };
  await db.sellerProfile.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  revalidatePath("/marketplace/sell");
  return { ok: true, message: "Seller profile saved" };
}

/* -------------------------------------------------------------------------- */
/* Listings                                                                    */
/* -------------------------------------------------------------------------- */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

async function ownProject(userId: string, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.sellerId !== userId) throw new Error("Project not found");
  return project;
}

export async function saveProject(
  id: string | null,
  input: { title: string; summary: string; description: string; domainTags: string[]; techStack: string; level: string; priceInr: number; demoUrl: string },
): Promise<MarketResult> {
  const user = await requireUser();
  const settings = await requireMarketplace();
  const seller = await db.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return { ok: false, error: "Set up your seller profile first." };

  const schema = z.object({
    title: z.string().trim().min(6, "Give your project a descriptive title").max(90),
    summary: z.string().trim().min(20, "Summary needs at least 20 characters").max(200),
    description: z.string().trim().min(120, "Describe the project in at least 120 characters").max(12000),
    domainTags: z.array(z.string()).min(1, "Pick at least one domain").max(3),
    techStack: z
      .string()
      .transform((s) => [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12))
      .pipe(z.array(z.string().max(30)).min(1, "List the main technologies")),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
    priceInr: z.coerce
      .number()
      .int()
      .min(settings.minPriceInr, `Minimum price is ₹${settings.minPriceInr}`)
      .max(settings.maxPriceInr, `Maximum price is ₹${settings.maxPriceInr}`),
    demoUrl: z.union([z.literal(""), z.url("Enter a valid demo URL").refine((u) => u.startsWith("https://"), "Demo links must use https")]),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const data = { ...parsed.data, demoUrl: parsed.data.demoUrl || null };

  if (id) {
    const project = await ownProject(user.id, id);
    // Edits to a live listing go back through review.
    const status = project.status === "APPROVED" ? "PENDING" : project.status === "REJECTED" ? "DRAFT" : project.status;
    await db.project.update({ where: { id }, data: { ...data, status, submittedAt: status === "PENDING" ? new Date() : project.submittedAt } });
    revalidatePath(`/marketplace/sell/${id}`);
    revalidatePath("/marketplace");
    return {
      ok: true,
      id,
      message: project.status === "APPROVED" ? "Saved — your changes will go live after a quick review." : "Draft saved",
    };
  }

  if (!(await rateLimit("project:create", user.id, 10, 24 * 60 * 60))) return { ok: false, error: "You've created a lot of listings today. Try again tomorrow." };
  const raw = slugify(data.title) || "project";
  // Avoid clashing with /marketplace/sell and /marketplace/purchases.
  const base = ["sell", "purchases"].includes(raw) ? `${raw}-project` : raw;
  let slug = base;
  for (let n = 2; await db.project.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  const project = await db.project.create({ data: { ...data, slug, sellerId: user.id } });
  revalidatePath("/marketplace/sell");
  return { ok: true, id: project.id, message: "Draft created — now add a cover image and your source files." };
}

const fileSchema = z.object({
  key: z.string().max(200),
  name: z.string().trim().min(1).max(200),
  mime: z.string().max(100),
  kind: z.enum(["COVER", "SCREENSHOT", "SOURCE"]),
});

export async function attachProjectFile(projectId: string, input: z.input<typeof fileSchema>): Promise<MarketResult> {
  const user = await requireUser();
  const project = await ownProject(user.id, projectId);
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const f = parsed.data;
  const purpose = f.kind === "SOURCE" ? "project-source" : "project-image";
  if (!f.key.startsWith(`${purpose}/${project.id}/`)) return { ok: false, error: "Invalid file reference." };
  const verified = await verifyUploadedObject(f.key, purpose, f.mime);
  if ("error" in verified) return { ok: false, error: verified.error! };

  if (f.kind === "SCREENSHOT" && (await db.projectFile.count({ where: { projectId, kind: "SCREENSHOT" } })) >= 6) {
    await deleteObject(f.key).catch(() => null);
    return { ok: false, error: "You can add up to 6 screenshots." };
  }
  if (f.kind !== "SCREENSHOT") {
    const old = await db.projectFile.findMany({ where: { projectId, kind: f.kind } });
    await db.projectFile.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    await Promise.all(old.map((o) => deleteObject(o.key).catch(() => null)));
  }
  await db.projectFile.create({ data: { projectId, kind: f.kind, key: f.key, name: f.name, mime: f.mime, size: verified.size! } });
  if (project.status === "APPROVED") await db.project.update({ where: { id: projectId }, data: { status: "PENDING", submittedAt: new Date() } });
  revalidatePath(`/marketplace/sell/${projectId}`);
  return { ok: true, message: "File added" };
}

export async function removeProjectFile(fileId: string): Promise<MarketResult> {
  const user = await requireUser();
  const file = await db.projectFile.findUnique({ where: { id: fileId }, include: { project: { select: { sellerId: true, id: true } } } });
  if (!file || file.project.sellerId !== user.id) return { ok: false, error: "File not found" };
  const bought = await db.projectPurchase.count({ where: { projectId: file.project.id, status: { not: "REFUNDED" } } });
  if (file.kind === "SOURCE" && bought > 0) return { ok: false, error: "Buyers rely on this archive — upload a replacement instead of removing it." };
  await db.projectFile.delete({ where: { id: fileId } });
  await deleteObject(file.key).catch(() => null);
  revalidatePath(`/marketplace/sell/${file.project.id}`);
  return { ok: true, message: "File removed" };
}

export async function submitProject(projectId: string): Promise<MarketResult> {
  const user = await requireUser();
  await requireMarketplace();
  const project = await ownProject(user.id, projectId);
  if (project.status === "PENDING") return { ok: false, error: "This listing is already waiting for review." };
  const files = await db.projectFile.findMany({ where: { projectId }, select: { kind: true } });
  if (!files.some((f) => f.kind === "COVER")) return { ok: false, error: "Add a cover image before submitting." };
  if (!files.some((f) => f.kind === "SOURCE")) return { ok: false, error: "Upload your source code ZIP before submitting." };
  await db.project.update({ where: { id: projectId }, data: { status: "PENDING", submittedAt: new Date(), rejectionReason: null } });
  await sendEmail(contactInbox(), projectSubmittedAdminTemplate({ title: project.title, seller: user.name, id: project.id }));
  revalidatePath("/marketplace/sell");
  revalidatePath(`/marketplace/sell/${projectId}`);
  return { ok: true, message: "Submitted for review — we'll email you once it's approved." };
}

export async function archiveProject(projectId: string, archived: boolean): Promise<MarketResult> {
  const user = await requireUser();
  const project = await ownProject(user.id, projectId);
  if (archived) await db.project.update({ where: { id: projectId }, data: { status: "ARCHIVED" } });
  else if (project.status === "ARCHIVED") await db.project.update({ where: { id: projectId }, data: { status: project.approvedAt ? "PENDING" : "DRAFT", submittedAt: new Date() } });
  revalidatePath("/marketplace/sell");
  revalidatePath("/marketplace");
  return { ok: true, message: archived ? "Listing hidden from the marketplace" : "Listing restored" };
}

/* -------------------------------------------------------------------------- */
/* Buying                                                                      */
/* -------------------------------------------------------------------------- */

export async function startProjectPurchase(projectId: string) {
  const user = await requireUser();
  await requireMarketplace();
  if (!(await rateLimit("checkout", user.id, 20, 60 * 60))) return { error: "Too many checkout attempts. Please wait a little." };
  return createProjectCheckout({ userId: user.id, projectId });
}

export async function browseProjectSource(projectId: string, path?: string) {
  const user = await requireUser();
  const project = await db.project.findUnique({ where: { id: projectId }, select: { sellerId: true, files: { where: { kind: "SOURCE" }, select: { key: true }, take: 1 } } });
  if (!project?.files[0]) return { error: "No source archive." };
  const allowed = project.sellerId === user.id || user.role === "admin" || (await hasPurchased(user.id, projectId));
  if (!allowed) return { error: "Buy this project to browse its files." };
  if (!(await rateLimit("source-browse", user.id, 300, 60 * 60))) return { error: "Slow down a little." };
  try {
    if (path) return await readZipText(project.files[0].key, path);
    return { entries: await listZipEntries(project.files[0].key) };
  } catch {
    return { error: "This archive couldn't be read." };
  }
}

export async function saveReview(projectId: string, input: { rating: number; body: string }): Promise<MarketResult> {
  const user = await requireUser();
  const parsed = z
    .object({ rating: z.number().int().min(1).max(5), body: z.string().trim().min(10, "Write at least a sentence").max(1500) })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  if (!(await hasPurchased(user.id, projectId))) return { ok: false, error: "Only buyers can review a project." };
  await db.$transaction(async (tx) => {
    await tx.projectReview.upsert({
      where: { projectId_buyerId: { projectId, buyerId: user.id } },
      update: parsed.data,
      create: { ...parsed.data, projectId, buyerId: user.id },
    });
    const agg = await tx.projectReview.aggregate({ where: { projectId }, _avg: { rating: true }, _count: true });
    await tx.project.update({ where: { id: projectId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  });
  const p = await db.project.findUnique({ where: { id: projectId }, select: { slug: true } });
  revalidatePath(`/marketplace/${p?.slug}`);
  return { ok: true, message: "Thanks for your review!" };
}

export async function openDispute(purchaseId: string, input: { reason: string; details: string }): Promise<MarketResult> {
  const user = await requireUser();
  const { holdDays } = await getSetting("marketplace");
  const parsed = z
    .object({
      reason: z.enum(["Files missing or broken", "Not as described", "Plagiarised or not the seller's work", "Other"]),
      details: z.string().trim().min(30, "Explain the problem in at least 30 characters").max(2000),
    })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const purchase = await db.projectPurchase.findUnique({
    where: { id: purchaseId },
    include: { project: { include: { seller: { select: { name: true, email: true } } } }, dispute: true },
  });
  if (!purchase || purchase.buyerId !== user.id) return { ok: false, error: "Purchase not found." };
  if (purchase.dispute) return { ok: false, error: "You've already reported this purchase." };
  if (purchase.status !== "PAID" || purchase.payoutId) return { ok: false, error: "This purchase can no longer be disputed." };
  if (purchase.createdAt < new Date(Date.now() - holdDays * 86_400_000)) {
    return { ok: false, error: `Issues must be reported within ${holdDays} days of purchase. Contact support for help.` };
  }
  await db.$transaction([
    db.projectDispute.create({ data: { purchaseId, ...parsed.data } }),
    db.projectPurchase.update({ where: { id: purchaseId }, data: { status: "DISPUTED" } }),
  ]);
  const t = { title: purchase.project.title, ...parsed.data };
  await Promise.all([
    sendEmail(contactInbox(), disputeOpenedTemplate({ ...t, forAdmin: true, name: "team" })),
    sendEmail(purchase.project.seller.email, disputeOpenedTemplate({ ...t, forAdmin: false, name: purchase.project.seller.name })),
  ]);
  revalidatePath(`/marketplace/${purchase.project.slug}`);
  return { ok: true, message: "Reported — our team will review it and email you." };
}
