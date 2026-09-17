"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { disputeResolvedTemplate, payoutPaidTemplate, projectReviewedTemplate } from "@/lib/email-templates";
import { decrypt } from "@/lib/security";
import { cleanupImports, importJobs, importUpdates } from "@/server/importers";
import { checkLinks, inspectLink } from "@/server/link-check";
import { sellerEarnings } from "@/server/marketplace";
import { saveSetting } from "@/server/settings";
import { deleteObject } from "@/lib/storage";
import { verifyUploadedObject } from "@/server/uploads";
import { requireAdmin } from "@/lib/session";
import { refundOrder } from "@/server/payments";

export type AdminResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

async function audit(actorId: string, action: string, targetType: string, targetId?: string | null, meta?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId: targetId ?? null, meta } });
}

const fail = (e: z.ZodError): AdminResult => ({ ok: false, error: e.issues[0]?.message ?? "Invalid input" });
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const csv = (s: string) =>
  s
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

function revalidateCatalogue(slug?: string, domainTag?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/learn/${slug}`, "layout");
  if (domainTag) revalidatePath(`/resources/${domainTag}`);
}

/* -------------------------------------------------------------------------- */
/* Paths                                                                       */
/* -------------------------------------------------------------------------- */

const pathSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  slug: z.string().trim().max(80).optional(),
  domainTag: z.string().min(1, "Choose a domain"),
  summary: z.string().trim().min(10, "Add a short summary").max(300),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  duration: z.string().trim().min(1, "Add a duration").max(40),
  roles: z.string().default(""),
  outcomes: z.string().default(""),
});

export async function savePath(id: string | null, input: z.input<typeof pathSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = pathSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { roles, outcomes, slug, ...rest } = parsed.data;
  const data = { ...rest, slug: slugify(slug || rest.title), roles: csv(roles), outcomes: lines(outcomes) };

  const clash = await db.careerPath.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } });
  if (clash) return { ok: false, error: "Another path already uses that URL slug." };

  const path = id ? await db.careerPath.update({ where: { id }, data }) : await db.careerPath.create({ data });
  await audit(admin.id, id ? "path.update" : "path.create", "CareerPath", path.id, { title: path.title });
  revalidateCatalogue(path.slug, path.domainTag);
  return { ok: true, id: path.id, message: id ? "Path saved" : "Path created" };
}

export async function setPathPublished(id: string, isPublished: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  const path = await db.careerPath.findUnique({ where: { id }, include: { _count: { select: { dots: true } } } });
  if (!path) return { ok: false, error: "Path not found" };
  if (isPublished && path._count.dots === 0) return { ok: false, error: "Add at least one dot before publishing." };
  await db.careerPath.update({ where: { id }, data: { isPublished } });
  await audit(admin.id, isPublished ? "path.publish" : "path.unpublish", "CareerPath", id, { title: path.title });
  revalidateCatalogue(path.slug, path.domainTag);
  return { ok: true, message: isPublished ? "Published — live for students" : "Moved back to draft" };
}

export async function deletePath(id: string): Promise<void> {
  const admin = await requireAdmin();
  const enrolled = await db.enrollment.count({ where: { pathId: id } });
  if (enrolled > 0) redirect(`/admin/paths/${id}?error=has-enrollments`);
  const path = await db.careerPath.delete({ where: { id } });
  await audit(admin.id, "path.delete", "CareerPath", id, { title: path.title });
  revalidateCatalogue(path.slug, path.domainTag);
  redirect("/admin/paths");
}

/* -------------------------------------------------------------------------- */
/* Dots                                                                        */
/* -------------------------------------------------------------------------- */

const dotSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(120),
  description: z.string().trim().min(5, "Add a description").max(400),
  hours: z.coerce.number().int().min(1).max(500),
  isFree: z.boolean(),
  certification: z.string().trim().max(120).optional(),
});

export async function saveDot(pathId: string, dotId: string | null, input: z.input<typeof dotSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = dotSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const data = { ...parsed.data, certification: parsed.data.certification || null };
  let id = dotId;
  if (dotId) {
    await db.dot.update({ where: { id: dotId }, data });
  } else {
    const last = await db.dot.aggregate({ where: { pathId }, _max: { order: true } });
    id = (await db.dot.create({ data: { ...data, pathId, order: (last._max.order ?? 0) + 1 } })).id;
  }
  await audit(admin.id, dotId ? "dot.update" : "dot.create", "Dot", id, { title: data.title });
  const path = await db.careerPath.findUnique({ where: { id: pathId }, select: { slug: true, domainTag: true } });
  revalidateCatalogue(path?.slug, path?.domainTag);
  revalidatePath(`/admin/paths/${pathId}`);
  return { ok: true, id: id!, message: dotId ? "Dot saved" : "Dot added" };
}

export async function deleteDot(dotId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const dot = await db.dot.findUnique({ where: { id: dotId } });
  if (!dot) return { ok: false, error: "Dot not found" };
  await db.$transaction(async (tx) => {
    await tx.dot.delete({ where: { id: dotId } });
    const rest = await tx.dot.findMany({ where: { pathId: dot.pathId }, orderBy: { order: "asc" } });
    // Two-phase renumber to avoid unique (pathId, order) collisions.
    for (const [i, d] of rest.entries()) await tx.dot.update({ where: { id: d.id }, data: { order: 10_000 + i } });
    for (const [i, d] of rest.entries()) await tx.dot.update({ where: { id: d.id }, data: { order: i + 1 } });
  });
  await audit(admin.id, "dot.delete", "Dot", dotId, { title: dot.title });
  revalidatePath(`/admin/paths/${dot.pathId}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Dot deleted" };
}

export async function reorderDots(pathId: string, orderedIds: string[]): Promise<AdminResult> {
  const admin = await requireAdmin();
  const existing = await db.dot.findMany({ where: { pathId }, select: { id: true } });
  if (existing.length !== orderedIds.length || !existing.every((d) => orderedIds.includes(d.id))) {
    return { ok: false, error: "Dots changed — refresh and try again." };
  }
  await db.$transaction(async (tx) => {
    for (const [i, id] of orderedIds.entries()) await tx.dot.update({ where: { id }, data: { order: 10_000 + i } });
    for (const [i, id] of orderedIds.entries()) await tx.dot.update({ where: { id }, data: { order: i + 1 } });
  });
  await audit(admin.id, "dot.reorder", "CareerPath", pathId);
  revalidatePath(`/admin/paths/${pathId}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Order saved" };
}

export async function setDotResources(dotId: string, resourceIds: string[]): Promise<AdminResult> {
  const admin = await requireAdmin();
  await db.$transaction([
    db.dotResource.deleteMany({ where: { dotId } }),
    db.dotResource.createMany({ data: resourceIds.map((resourceId, i) => ({ dotId, resourceId, order: i + 1 })) }),
  ]);
  await audit(admin.id, "dot.resources", "Dot", dotId, { count: resourceIds.length });
  const dot = await db.dot.findUnique({ where: { id: dotId }, select: { pathId: true } });
  revalidatePath(`/admin/paths/${dot?.pathId}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Resources updated" };
}

const questionSchema = z.object({
  prompt: z.string().trim().min(5, "Question is too short"),
  options: z.array(z.string().trim().min(1, "Options can't be empty")).min(2, "Add at least two options").max(6),
  answerIndex: z.number().int().min(0),
  explanation: z.string().trim().max(400).optional(),
});

export async function setDotQuestions(dotId: string, questions: z.input<typeof questionSchema>[]): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = z.array(questionSchema).safeParse(questions);
  if (!parsed.success) return fail(parsed.error);
  if (parsed.data.some((q) => q.answerIndex >= q.options.length)) return { ok: false, error: "Pick a correct answer for every question." };
  await db.$transaction([
    db.quizQuestion.deleteMany({ where: { dotId } }),
    db.quizQuestion.createMany({
      data: parsed.data.map((q, i) => ({ ...q, explanation: q.explanation || null, dotId, order: i + 1 })),
    }),
  ]);
  await audit(admin.id, "dot.quiz", "Dot", dotId, { count: parsed.data.length });
  const dot = await db.dot.findUnique({ where: { id: dotId }, select: { pathId: true } });
  revalidatePath(`/admin/paths/${dot?.pathId}`);
  return { ok: true, message: "Checkpoint saved" };
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                   */
/* -------------------------------------------------------------------------- */

const resourceSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    url: z.union([z.literal(""), z.url("Enter a valid URL")]).default(""),
    type: z.enum(["VIDEO", "DOC", "PROJECT", "QUIZ", "LINK"]),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
    duration: z.string().trim().max(40).optional(),
    isPremium: z.boolean(),
    domainTags: z.array(z.string()),
    topics: z.string().default(""),
    file: z.object({ key: z.string().max(200), name: z.string().trim().min(1).max(200), mime: z.string().max(100) }).nullable().default(null),
  })
  .refine((r) => r.url || r.file, { message: "Add a link or upload a file", path: ["url"] });

export async function saveResource(id: string | null, input: z.input<typeof resourceSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { file, ...rest } = parsed.data;
  const existing = id ? await db.resource.findUnique({ where: { id }, select: { fileKey: true, url: true } }) : null;

  let fileData: { fileKey: string | null; fileName: string | null; fileMime: string | null; fileSize: number | null } = {
    fileKey: null,
    fileName: null,
    fileMime: null,
    fileSize: null,
  };
  if (file) {
    if (file.key === existing?.fileKey) {
      fileData = { ...(await db.resource.findUniqueOrThrow({ where: { id: id! }, select: { fileKey: true, fileName: true, fileMime: true, fileSize: true } })) };
    } else {
      const verified = await verifyUploadedObject(file.key, "resource", file.mime);
      if ("error" in verified) return { ok: false, error: verified.error! };
      fileData = { fileKey: file.key, fileName: file.name, fileMime: file.mime, fileSize: verified.size! };
    }
  }

  const data = { ...rest, ...fileData, duration: rest.duration || null, topics: csv(rest.topics), isSample: false };
  const urlChanged = !existing || existing.url !== rest.url;
  const resource = id
    ? await db.resource.update({ where: { id }, data: { ...data, ...(urlChanged ? { linkStatus: "UNCHECKED", embeddable: null } : {}) } })
    : await db.resource.create({ data });
  if (existing?.fileKey && existing.fileKey !== resource.fileKey) await deleteObject(existing.fileKey).catch(() => null);
  if (resource.url && urlChanged) await inspectLink(resource.id, resource.url);

  await audit(admin.id, id ? "resource.update" : "resource.create", "Resource", resource.id, { title: resource.title });
  revalidatePath("/admin/resources");
  revalidatePath("/", "layout");
  return { ok: true, id: resource.id, message: id ? "Resource saved" : "Resource added" };
}

export async function deleteResource(id: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const r = await db.resource.delete({ where: { id } });
  if (r.fileKey) await deleteObject(r.fileKey).catch(() => null);
  await audit(admin.id, "resource.delete", "Resource", id, { title: r.title });
  revalidatePath("/admin/resources");
  return { ok: true, message: "Resource deleted" };
}

/** Dead-link checker, also refreshes whether each page can be embedded. */
export async function checkResourceLinks(ids?: string[]): Promise<AdminResult> {
  const admin = await requireAdmin();
  const { checked, broken } = await checkLinks(ids);
  await audit(admin.id, "resource.linkcheck", "Resource", null, { checked, broken });
  revalidatePath("/admin/resources");
  return { ok: true, message: `Checked ${checked} links — ${broken} broken` };
}

/* -------------------------------------------------------------------------- */
/* Users & access                                                              */
/* -------------------------------------------------------------------------- */

export async function grantAccess(userId: string, input: { scope: "PLAN" | "PATH"; scopeId?: string; days?: number; note?: string }): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (input.scope === "PATH" && !input.scopeId) return { ok: false, error: "Choose a path" };
  const validUntil = input.days ? new Date(Date.now() + input.days * 86_400_000) : null;
  const ent = await db.entitlement.create({
    data: {
      userId,
      scope: input.scope,
      scopeId: input.scope === "PATH" ? input.scopeId : null,
      source: "ADMIN_GRANT",
      validUntil,
      note: input.note?.slice(0, 200) || `Granted by ${admin.email}`,
    },
  });
  await audit(admin.id, "access.grant", "User", userId, { entitlementId: ent.id, scope: input.scope, scopeId: input.scopeId, days: input.days });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Access granted" };
}

export async function revokeEntitlement(entitlementId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const ent = await db.entitlement.update({ where: { id: entitlementId }, data: { revokedAt: new Date() } });
  await audit(admin.id, "access.revoke", "User", ent.userId, { entitlementId });
  revalidatePath(`/admin/users/${ent.userId}`);
  return { ok: true, message: "Access revoked" };
}

export async function setUserRole(userId: string, role: "admin" | "student"): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.id && role !== "admin") return { ok: false, error: "You can't remove your own admin role." };
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "user.role", "User", userId, { role });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: `Role changed to ${role}` };
}

export async function setUserBan(userId: string, banned: boolean, reason?: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "You can't suspend yourself." };
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { banned, banReason: banned ? reason?.slice(0, 200) || null : null } }),
    ...(banned ? [db.session.deleteMany({ where: { userId } })] : []),
  ]);
  await audit(admin.id, banned ? "user.ban" : "user.unban", "User", userId, { reason });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: banned ? "User suspended and signed out" : "Suspension lifted" };
}

/* -------------------------------------------------------------------------- */
/* Payments, coupons, prices                                                   */
/* -------------------------------------------------------------------------- */

export async function adminRefundOrder(orderId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const res = await refundOrder(orderId);
  if ("error" in res) return { ok: false, error: res.error! };
  await audit(admin.id, "order.refund", "Order", orderId);
  revalidatePath("/admin/payments");
  return { ok: true, message: "Refunded and access revoked" };
}

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes only"),
  discountPct: z.coerce.number().int().min(1).max(100),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  scope: z.enum(["ANY", "PATH", "DOT"]),
  scopeId: z.string().optional(),
});

export async function createCoupon(input: z.input<typeof couponSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const code = d.code.toUpperCase();
  if (await db.coupon.findUnique({ where: { code } })) return { ok: false, error: "That code already exists." };
  const coupon = await db.coupon.create({
    data: {
      code,
      discountPct: d.discountPct,
      maxUses: d.maxUses ?? null,
      expiresAt: d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+05:30`) : null,
      scope: d.scope === "ANY" ? null : d.scope,
      scopeId: d.scope === "ANY" ? null : d.scopeId || null,
    },
  });
  await audit(admin.id, "coupon.create", "Coupon", coupon.id, { code });
  revalidatePath("/admin/payments");
  return { ok: true, message: `Coupon ${code} created` };
}

export async function setCouponActive(id: string, isActive: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  await db.coupon.update({ where: { id }, data: { isActive } });
  await audit(admin.id, isActive ? "coupon.enable" : "coupon.disable", "Coupon", id);
  revalidatePath("/admin/payments");
  return { ok: true };
}

const pricingSchema = z.object({
  monthly: z.coerce.number().int().min(1),
  yearly: z.coerce.number().int().min(1),
  dot: z.coerce.number().int().min(1),
  path: z.coerce.number().int().min(1),
});

export async function updatePricing(input: z.input<typeof pricingSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = pricingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const p = parsed.data;
  await db.$transaction([
    db.plan.update({ where: { interval: "MONTHLY" }, data: { priceInr: p.monthly } }),
    db.plan.update({ where: { interval: "YEARLY" }, data: { priceInr: p.yearly } }),
    db.price.updateMany({ where: { scope: "DOT", scopeId: null }, data: { amountInr: p.dot } }),
    db.price.updateMany({ where: { scope: "PATH", scopeId: null }, data: { amountInr: p.path } }),
  ]);
  await audit(admin.id, "pricing.update", "Plan", null, p);
  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: "Prices updated. Remember to update the matching Razorpay plans and the public pricing page copy.",
  };
}

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

const updateSchema = z.object({
  title: z.string().trim().min(5).max(160),
  slug: z.string().trim().max(100).optional(),
  excerpt: z.string().trim().min(10).max(300),
  body: z.string().trim().min(20, "Write the post body"),
  domainTags: z.array(z.string()),
  readMinutes: z.coerce.number().int().min(1).max(60),
  isPublished: z.boolean(),
});

export async function saveUpdate(id: string | null, input: z.input<typeof updateSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { slug, ...rest } = parsed.data;
  const data = { ...rest, slug: slugify(slug || rest.title), isSample: false };
  if (await db.techUpdate.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } })) {
    return { ok: false, error: "Another post already uses that slug." };
  }
  const existing = id ? await db.techUpdate.findUnique({ where: { id } }) : null;
  const publishedAt = data.isPublished ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null;
  const post = id
    ? await db.techUpdate.update({ where: { id }, data: { ...data, publishedAt } })
    : await db.techUpdate.create({ data: { ...data, publishedAt } });
  await audit(admin.id, id ? "update.edit" : "update.create", "TechUpdate", post.id, { title: post.title });
  revalidatePath("/updates", "layout");
  revalidatePath("/admin/content/updates");
  return { ok: true, id: post.id, message: "Post saved" };
}

const jobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(80),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
  level: z.enum(["INTERNSHIP", "ENTRY", "MID", "SENIOR"]),
  domainTags: z.array(z.string()).min(1, "Pick at least one domain"),
  pathSlugs: z.array(z.string()),
  url: z.url("Enter the application URL"),
  salary: z.string().trim().max(60).optional(),
  description: z.string().trim().max(600).optional(),
  expiresAt: z.string().optional(),
  isPublished: z.boolean(),
});

export async function saveJob(id: string | null, input: z.input<typeof jobSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const data = {
    ...d,
    salary: d.salary || null,
    description: d.description || null,
    expiresAt: d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+05:30`) : null,
    isSample: false,
  };
  const job = id ? await db.jobListing.update({ where: { id }, data }) : await db.jobListing.create({ data });
  await audit(admin.id, id ? "job.update" : "job.create", "JobListing", job.id, { title: job.title });
  revalidatePath("/jobs");
  revalidatePath("/admin/content/jobs");
  return { ok: true, id: job.id, message: "Job saved" };
}

const certSchema = z.object({
  name: z.string().trim().min(3).max(160),
  slug: z.string().trim().max(100).optional(),
  provider: z.string().trim().min(2).max(120),
  domainTags: z.array(z.string()).min(1, "Pick at least one domain"),
  overview: z.string().trim().min(20),
  examFormat: z.string().trim().min(10),
  difficulty: z.enum(["FOUNDATIONAL", "ASSOCIATE", "PROFESSIONAL", "EXPERT"]),
  prepTime: z.string().trim().min(2).max(60),
  officialUrl: z.url("Enter the official exam URL"),
  topics: z.string().default(""),
  pathSlugs: z.array(z.string()),
  isPublished: z.boolean(),
});

export async function saveCertification(id: string | null, input: z.input<typeof certSchema>): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = certSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { slug, topics, ...rest } = parsed.data;
  const data = { ...rest, slug: slugify(slug || rest.name), topics: lines(topics), isSample: false };
  if (await db.certificationGuide.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } })) {
    return { ok: false, error: "Another guide already uses that slug." };
  }
  const cert = id ? await db.certificationGuide.update({ where: { id }, data }) : await db.certificationGuide.create({ data });
  await audit(admin.id, id ? "cert.update" : "cert.create", "CertificationGuide", cert.id, { name: cert.name });
  revalidatePath("/certifications", "layout");
  revalidatePath("/admin/content/certifications");
  return { ok: true, id: cert.id, message: "Guide saved" };
}

export async function setCertificationResources(certificationId: string, resourceIds: string[]): Promise<AdminResult> {
  const admin = await requireAdmin();
  const ids = z.array(z.string().max(40)).max(200).parse([...new Set(resourceIds)]);
  const cert = await db.certificationGuide.findUnique({ where: { id: certificationId }, select: { slug: true } });
  if (!cert) return { ok: false, error: "Guide not found" };
  await db.$transaction([
    db.certificationResource.deleteMany({ where: { certificationId } }),
    db.certificationResource.createMany({ data: ids.map((resourceId, i) => ({ certificationId, resourceId, order: i + 1 })) }),
  ]);
  await audit(admin.id, "cert.resources", "CertificationGuide", certificationId, { count: ids.length });
  revalidatePath("/admin/content/certifications");
  revalidatePath(`/certifications/${cert.slug}`);
  return { ok: true, message: "Resources updated" };
}

export async function deleteContent(kind: "update" | "job" | "cert", id: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (kind === "update") await db.techUpdate.delete({ where: { id } });
  if (kind === "job") await db.jobListing.delete({ where: { id } });
  if (kind === "cert") await db.certificationGuide.delete({ where: { id } });
  await audit(admin.id, `${kind}.delete`, kind, id);
  revalidatePath("/admin/content", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: "Deleted" };
}

export async function deleteAllSampleContent(): Promise<AdminResult> {
  const admin = await requireAdmin();
  const [u, j, c] = await db.$transaction([
    db.techUpdate.deleteMany({ where: { isSample: true } }),
    db.jobListing.deleteMany({ where: { isSample: true } }),
    db.certificationGuide.deleteMany({ where: { isSample: true } }),
  ]);
  await audit(admin.id, "content.purgeSamples", "Content", null, { updates: u.count, jobs: j.count, certs: c.count });
  revalidatePath("/", "layout");
  return { ok: true, message: `Removed ${u.count} updates, ${j.count} jobs and ${c.count} guides marked as samples` };
}

/* -------------------------------------------------------------------------- */
/* Contact inbox                                                               */
/* -------------------------------------------------------------------------- */

export async function setMessageStatus(id: string, status: "NEW" | "REPLIED" | "CLOSED" | "SPAM"): Promise<AdminResult> {
  const admin = await requireAdmin();
  z.enum(["NEW", "REPLIED", "CLOSED", "SPAM"]).parse(status);
  await db.contactMessage.update({ where: { id }, data: { status } });
  await audit(admin.id, "message.status", "ContactMessage", id, { status });
  revalidatePath("/admin/messages");
  return { ok: true, message: "Updated" };
}

/* -------------------------------------------------------------------------- */
/* Marketplace                                                                 */
/* -------------------------------------------------------------------------- */

export async function reviewProject(projectId: string, approve: boolean, reason?: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const note = reason?.trim().slice(0, 1000);
  if (!approve && (!note || note.length < 10)) return { ok: false, error: "Tell the seller what to fix (at least 10 characters)." };
  const project = await db.project.findUnique({ where: { id: projectId }, include: { seller: { select: { name: true, email: true } } } });
  if (!project) return { ok: false, error: "Project not found" };
  await db.project.update({
    where: { id: projectId },
    data: approve ? { status: "APPROVED", approvedAt: project.approvedAt ?? new Date(), rejectionReason: null } : { status: "REJECTED", rejectionReason: note },
  });
  await sendEmail(
    project.seller.email,
    projectReviewedTemplate({ name: project.seller.name, title: project.title, approved: approve, reason: note, slug: project.slug, id: project.id }),
  );
  await audit(admin.id, approve ? "project.approve" : "project.reject", "Project", projectId, { title: project.title, reason: note });
  revalidatePath("/admin/marketplace");
  revalidatePath("/marketplace", "layout");
  return { ok: true, message: approve ? "Approved and published" : "Sent back to the seller" };
}

export async function unpublishProject(projectId: string, reason: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (reason.trim().length < 10) return { ok: false, error: "Add a reason (at least 10 characters)." };
  await db.project.update({ where: { id: projectId }, data: { status: "REJECTED", rejectionReason: reason.trim().slice(0, 1000) } });
  await audit(admin.id, "project.unpublish", "Project", projectId, { reason });
  revalidatePath("/admin/marketplace");
  revalidatePath("/marketplace", "layout");
  return { ok: true, message: "Listing removed from the marketplace" };
}

export async function resolveDispute(disputeId: string, refund: boolean, resolution: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const text = resolution.trim();
  if (text.length < 10) return { ok: false, error: "Explain the decision (at least 10 characters)." };
  const dispute = await db.projectDispute.findUnique({
    where: { id: disputeId },
    include: { purchase: { include: { buyer: { select: { name: true, email: true } }, project: { include: { seller: { select: { name: true, email: true } } } } } } },
  });
  if (!dispute || dispute.status !== "OPEN") return { ok: false, error: "This dispute is already resolved." };

  if (refund) {
    const res = await refundOrder(dispute.purchase.orderId);
    if ("error" in res) return { ok: false, error: res.error! };
  } else {
    await db.projectPurchase.update({ where: { id: dispute.purchaseId }, data: { status: "PAID" } });
  }
  await db.projectDispute.update({ where: { id: disputeId }, data: { status: refund ? "REFUNDED" : "REJECTED", resolution: text, resolvedAt: new Date() } });
  const { buyer, project } = dispute.purchase;
  await Promise.all([
    sendEmail(buyer.email, disputeResolvedTemplate({ name: buyer.name, title: project.title, refunded: refund, resolution: text })),
    sendEmail(project.seller.email, disputeResolvedTemplate({ name: project.seller.name, title: project.title, refunded: refund, resolution: text })),
  ]);
  await audit(admin.id, "dispute.resolve", "ProjectDispute", disputeId, { refund });
  revalidatePath("/admin/marketplace");
  return { ok: true, message: refund ? "Buyer refunded" : "Dispute closed without refund" };
}

/** Reveals a seller's bank/UPI details to an admin preparing a payout. Every view is audit-logged. */
export async function revealPayoutDetails(sellerId: string): Promise<{ ok: true; details: Record<string, string>; name: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const profile = await db.sellerProfile.findUnique({ where: { userId: sellerId } });
  if (!profile) return { ok: false, error: "Seller profile not found" };
  await audit(admin.id, "payout.details.view", "SellerProfile", sellerId);
  return { ok: true, details: JSON.parse(decrypt(profile.payoutDetailsEnc)) as Record<string, string>, name: profile.payoutName };
}

export async function createPayout(sellerId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const profile = await db.sellerProfile.findUnique({ where: { userId: sellerId } });
  if (!profile) return { ok: false, error: "The seller hasn't added payout details." };
  const { payableIds, payable } = await sellerEarnings(sellerId);
  if (!payableIds.length) return { ok: false, error: "Nothing is payable for this seller yet." };
  const payout = await db.$transaction(async (tx) => {
    const created = await tx.payout.create({ data: { sellerId, amountInr: payable, method: profile.payoutMethod } });
    const { count } = await tx.projectPurchase.updateMany({ where: { id: { in: payableIds }, payoutId: null, status: "PAID" }, data: { payoutId: created.id } });
    if (count !== payableIds.length) throw new Error("Sales changed while preparing the payout. Try again.");
    return created;
  });
  await audit(admin.id, "payout.create", "Payout", payout.id, { sellerId, amount: payable });
  revalidatePath("/admin/marketplace");
  return { ok: true, id: payout.id, message: "Payout prepared. Send the money, then mark it paid." };
}

export async function markPayoutPaid(payoutId: string, reference: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const ref = reference.trim();
  if (ref.length < 4 || ref.length > 60) return { ok: false, error: "Enter the UTR / UPI reference number." };
  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    include: { seller: { select: { name: true, email: true, sellerProfile: { select: { payoutHint: true } } } } },
  });
  if (!payout || payout.status !== "PENDING") return { ok: false, error: "This payout is not pending." };
  await db.payout.update({ where: { id: payoutId }, data: { status: "PAID", reference: ref, paidAt: new Date() } });
  await sendEmail(
    payout.seller.email,
    payoutPaidTemplate({ name: payout.seller.name, amountInr: payout.amountInr, reference: ref, hint: payout.seller.sellerProfile?.payoutHint ?? payout.method }),
  );
  await audit(admin.id, "payout.paid", "Payout", payoutId, { reference: ref });
  revalidatePath("/admin/marketplace");
  return { ok: true, message: "Marked as paid and the seller was notified" };
}

export async function cancelPayout(payoutId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout || payout.status !== "PENDING") return { ok: false, error: "Only pending payouts can be cancelled." };
  await db.$transaction([
    db.projectPurchase.updateMany({ where: { payoutId }, data: { payoutId: null } }),
    db.payout.update({ where: { id: payoutId }, data: { status: "CANCELLED" } }),
  ]);
  await audit(admin.id, "payout.cancel", "Payout", payoutId);
  revalidatePath("/admin/marketplace");
  return { ok: true, message: "Payout cancelled; the sales are payable again" };
}

export async function saveMarketplaceSettings(input: unknown): Promise<AdminResult> {
  const admin = await requireAdmin();
  const res = await saveSetting("marketplace", input);
  if (!res.ok) return { ok: false, error: res.error };
  await audit(admin.id, "settings.marketplace", "AppSetting", "marketplace", res.value);
  revalidatePath("/admin/marketplace");
  revalidatePath("/marketplace", "layout");
  return { ok: true, message: "Marketplace settings saved" };
}

export async function saveBusinessSettings(input: unknown): Promise<AdminResult> {
  const admin = await requireAdmin();
  const res = await saveSetting("business", input);
  if (!res.ok) return { ok: false, error: res.error };
  await audit(admin.id, "settings.business", "AppSetting", "business", res.value);
  revalidatePath("/admin/settings");
  return { ok: true, message: "Business details saved. New invoices will use them." };
}

/* -------------------------------------------------------------------------- */
/* Auto-imports                                                                */
/* -------------------------------------------------------------------------- */

export async function runImport(kind: "jobs" | "updates"): Promise<AdminResult> {
  const admin = await requireAdmin();
  const reports = kind === "jobs" ? await importJobs() : await importUpdates();
  // Job imports also prune anything that is not India-based.
  if (kind === "jobs") await cleanupImports();
  const created = reports.reduce((n, r) => n + r.created, 0);
  const failed = reports.filter((r) => r.error);
  await audit(admin.id, `import.${kind}`, "Import", null, { reports });
  revalidatePath("/admin/content/imports");
  if (!reports.length) return { ok: false, error: "No sources are enabled or configured for this import." };
  const failures = failed.length ? ` ${failed.map((r) => `${r.source}: ${r.error}`).join("; ")}` : "";
  return { ok: true, message: `Imported ${created} new ${kind === "jobs" ? "jobs" : "updates"} from ${reports.length - failed.length} source(s).${failures}` };
}

export async function saveImportSettings(input: unknown): Promise<AdminResult> {
  const admin = await requireAdmin();
  const res = await saveSetting("imports", input);
  if (!res.ok) return { ok: false, error: res.error };
  const blocked = res.value.rssFeeds.find((f) => !f.url.startsWith("https://"));
  if (blocked) return { ok: false, error: `Feeds must use https: ${blocked.name}` };
  await audit(admin.id, "settings.imports", "AppSetting", "imports");
  revalidatePath("/admin/content/imports");
  return { ok: true, message: "Import settings saved" };
}

export async function reviewImported(kind: "jobs" | "updates", ids: string[], action: "publish" | "delete"): Promise<AdminResult> {
  const admin = await requireAdmin();
  const list = z.array(z.string().max(40)).max(500).parse(ids);
  if (!list.length) return { ok: false, error: "Select at least one item." };
  let count = 0;
  if (kind === "jobs") {
    count =
      action === "publish"
        ? (await db.jobListing.updateMany({ where: { id: { in: list } }, data: { isPublished: true } })).count
        : (await db.jobListing.deleteMany({ where: { id: { in: list }, source: { not: "manual" } } })).count;
  } else {
    count =
      action === "publish"
        ? (await db.techUpdate.updateMany({ where: { id: { in: list } }, data: { isPublished: true } })).count
        : (await db.techUpdate.deleteMany({ where: { id: { in: list }, source: { not: "manual" } } })).count;
  }
  await audit(admin.id, `import.${action}`, kind, null, { count });
  revalidatePath("/admin/content/imports");
  revalidatePath(kind === "jobs" ? "/jobs" : "/updates", "layout");
  return { ok: true, message: `${action === "publish" ? "Published" : "Deleted"} ${count} item(s)` };
}

export async function revokeAdminSession(sessionId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const session = await db.session.findUnique({ where: { id: sessionId }, select: { userId: true } });
  if (!session) return { ok: false, error: "Session not found" };
  await db.session.delete({ where: { id: sessionId } });
  await audit(admin.id, "session.revoke", "Session", sessionId, { userId: session.userId });
  revalidatePath("/admin/security");
  return { ok: true, message: "Session signed out" };
}

export async function saveUsageLimits(input: unknown): Promise<AdminResult> {
  const admin = await requireAdmin();
  const res = await saveSetting("usage", input);
  if (!res.ok) return { ok: false, error: res.error };
  await audit(admin.id, "settings.usage", "AppSetting", "usage", res.value);
  revalidatePath("/admin/usage");
  return { ok: true, message: "Limits saved" };
}
