"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canOpenDot, getAccess } from "@/server/access";
import {
  cancelSubscription,
  createOneOffCheckout,
  createSubscriptionCheckout,
  fulfillOrder,
  activateSubscription,
  simulatorEnabled,
} from "@/server/payments";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/* -------------------------------------------------------------------------- */
/* Onboarding & profile                                                        */
/* -------------------------------------------------------------------------- */

const onboardingSchema = z.object({
  stage: z.enum(["STUDENT", "FRESH_GRADUATE", "WORKING_PROFESSIONAL"]),
  domainInterests: z.array(z.string()).min(1, "Pick at least one domain"),
  weeklyTime: z.enum(["UNDER_5", "FIVE_TO_TEN", "OVER_10"]),
  goalTimeline: z.enum(["THREE_MONTHS", "SIX_MONTHS", "ONE_YEAR", "EXPLORING"]),
});

export async function saveOnboarding(input: z.infer<typeof onboardingSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await db.profile.upsert({
    where: { userId: user.id },
    update: { ...parsed.data, onboardedAt: new Date() },
    create: { userId: user.id, ...parsed.data, onboardedAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  headline: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  stage: z.enum(["STUDENT", "FRESH_GRADUATE", "WORKING_PROFESSIONAL"]).optional(),
  weeklyTime: z.enum(["UNDER_5", "FIVE_TO_TEN", "OVER_10"]).optional(),
  goalTimeline: z.enum(["THREE_MONTHS", "SIX_MONTHS", "ONE_YEAR", "EXPLORING"]).optional(),
  domainInterests: z.array(z.string()).min(1, "Pick at least one domain"),
});

export async function updateProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, ...profile } = parsed.data;
  // Update the name through Better Auth so the cached session cookie is refreshed too.
  await auth.api.updateUser({ body: { name }, headers: await headers() });
  await db.profile.upsert({ where: { userId: user.id }, update: profile, create: { userId: user.id, ...profile } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved — recommendations updated." };
}

/* -------------------------------------------------------------------------- */
/* Learning                                                                    */
/* -------------------------------------------------------------------------- */

export async function enrol(pathId: string): Promise<ActionResult> {
  const user = await requireUser();
  const path = await db.careerPath.findFirst({ where: { id: pathId, isPublished: true }, select: { slug: true } });
  if (!path) return { ok: false, error: "This path isn't available." };
  await db.enrollment.upsert({
    where: { userId_pathId: { userId: user.id, pathId } },
    update: { lastActivityAt: new Date() },
    create: { userId: user.id, pathId },
  });
  revalidatePath(`/learn/${path.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-paths");
  return { ok: true, message: "Enrolled — your progress is now tracked." };
}

export async function leavePath(pathId: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.enrollment.deleteMany({ where: { userId: user.id, pathId } });
  revalidatePath("/my-paths");
  revalidatePath("/dashboard");
  return { ok: true, message: "Removed from your paths. Your completed dots are kept." };
}

async function loadDotForUser(userId: string, dotId: string) {
  const dot = await db.dot.findUnique({ where: { id: dotId }, include: { path: { select: { id: true, slug: true, isPublished: true } } } });
  if (!dot || !dot.path.isPublished) return null;
  const access = await getAccess(userId);
  return canOpenDot(access, dot) ? dot : null;
}

export async function setDotComplete(dotId: string, complete: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const dot = await loadDotForUser(user.id, dotId);
  if (!dot) return { ok: false, error: "Unlock this dot to track progress." };

  if (complete) {
    await db.progress.upsert({ where: { userId_dotId: { userId: user.id, dotId } }, update: {}, create: { userId: user.id, dotId } });
  } else {
    await db.progress.deleteMany({ where: { userId: user.id, dotId } });
  }

  // Auto-enrol and keep path completion in sync.
  const [total, done] = await Promise.all([
    db.dot.count({ where: { pathId: dot.pathId } }),
    db.progress.count({ where: { userId: user.id, dot: { pathId: dot.pathId } } }),
  ]);
  await db.enrollment.upsert({
    where: { userId_pathId: { userId: user.id, pathId: dot.pathId } },
    update: { lastActivityAt: new Date(), completedAt: done === total ? new Date() : null },
    create: { userId: user.id, pathId: dot.pathId, completedAt: done === total ? new Date() : null },
  });

  revalidatePath(`/learn/${dot.path.slug}`, "layout");
  revalidatePath("/dashboard");
  return { ok: true, message: complete ? "Dot complete — nice work!" : "Marked as not complete." };
}

export async function toggleBookmark(resourceId: string): Promise<ActionResult & { bookmarked?: boolean }> {
  const user = await requireUser();
  const existing = await db.bookmark.findUnique({ where: { userId_resourceId: { userId: user.id, resourceId } } });
  if (existing) {
    await db.bookmark.delete({ where: { userId_resourceId: { userId: user.id, resourceId } } });
  } else {
    await db.bookmark.create({ data: { userId: user.id, resourceId } });
  }
  revalidatePath("/bookmarks");
  return { ok: true, bookmarked: !existing, message: existing ? "Bookmark removed" : "Saved to bookmarks" };
}

export async function submitQuiz(
  dotId: string,
  answers: number[],
): Promise<ActionResult & { score?: number; total?: number; passed?: boolean; correct?: number[]; explanations?: (string | null)[] }> {
  const user = await requireUser();
  const dot = await loadDotForUser(user.id, dotId);
  if (!dot) return { ok: false, error: "Unlock this dot to take its checkpoint." };
  const questions = await db.quizQuestion.findMany({ where: { dotId }, orderBy: { order: "asc" } });
  if (!questions.length) return { ok: false, error: "This checkpoint has no questions yet." };

  const score = questions.reduce((n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0), 0);
  const passed = score / questions.length >= 0.7;
  await db.quizAttempt.create({ data: { userId: user.id, dotId, score, total: questions.length, passed } });
  if (passed) {
    await db.progress.upsert({ where: { userId_dotId: { userId: user.id, dotId } }, update: {}, create: { userId: user.id, dotId } });
    await db.enrollment.upsert({
      where: { userId_pathId: { userId: user.id, pathId: dot.pathId } },
      update: { lastActivityAt: new Date() },
      create: { userId: user.id, pathId: dot.pathId },
    });
  }
  revalidatePath(`/learn/${dot.path.slug}`, "layout");
  return {
    ok: true,
    score,
    total: questions.length,
    passed,
    correct: questions.map((q) => q.answerIndex),
    explanations: questions.map((q) => q.explanation),
  };
}

/* -------------------------------------------------------------------------- */
/* Tools                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveResume(data: Prisma.InputJsonValue, template: string): Promise<ActionResult> {
  const user = await requireUser();
  const size = JSON.stringify(data).length;
  if (size > 60_000) return { ok: false, error: "Your resume is too long to save." };
  await db.resume.upsert({
    where: { userId: user.id },
    update: { data, template },
    create: { userId: user.id, data, template },
  });
  return { ok: true, message: "Resume saved" };
}

export async function toggleSavedJob(jobId: string): Promise<ActionResult & { saved?: boolean }> {
  const user = await requireUser();
  const existing = await db.savedJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId } } });
  if (existing) await db.savedJob.delete({ where: { userId_jobId: { userId: user.id, jobId } } });
  else await db.savedJob.create({ data: { userId: user.id, jobId } });
  revalidatePath("/jobs");
  return { ok: true, saved: !existing };
}

export async function joinMarketplaceWaitlist(interest: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.marketplaceWaitlist.upsert({
    where: { userId: user.id },
    update: { interest: interest.slice(0, 200) },
    create: { userId: user.id, interest: interest.slice(0, 200) },
  });
  revalidatePath("/marketplace");
  return { ok: true, message: "You're on the list — we'll email you at launch." };
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

export async function startUnlock(input: { scope: "PATH" | "DOT"; scopeId: string; couponCode?: string }) {
  const user = await requireUser();
  if (input.scope === "DOT") {
    const dot = await db.dot.findUnique({ where: { id: input.scopeId }, include: { path: { select: { title: true } } } });
    if (!dot) return { error: "Dot not found." };
    return createOneOffCheckout({
      userId: user.id,
      scope: "DOT",
      scopeId: dot.id,
      description: `Unlock Dot ${dot.order}: ${dot.title} (${dot.path.title})`,
      couponCode: input.couponCode,
    });
  }
  const path = await db.careerPath.findUnique({ where: { id: input.scopeId } });
  if (!path) return { error: "Path not found." };
  return createOneOffCheckout({
    userId: user.id,
    scope: "PATH",
    scopeId: path.id,
    description: `Unlock the full ${path.title} path`,
    couponCode: input.couponCode,
  });
}

export async function startSubscription(interval: "MONTHLY" | "YEARLY") {
  const user = await requireUser();
  return createSubscriptionCheckout({ userId: user.id, interval });
}

/** Dev simulator only — mimics Razorpay calling our webhook. */
export async function simulatePayment(kind: "order" | "subscription", id: string): Promise<ActionResult> {
  if (!simulatorEnabled) return { ok: false, error: "The payment simulator is disabled." };
  const user = await requireUser();
  if (kind === "order") {
    const order = await db.order.findFirst({ where: { id, userId: user.id, isSimulated: true } });
    if (!order) return { ok: false, error: "Order not found." };
    await fulfillOrder(order.id, null);
  } else {
    const sub = await db.subscription.findFirst({ where: { id, userId: user.id, isSimulated: true }, include: { plan: true } });
    if (!sub) return { ok: false, error: "Subscription not found." };
    const start = new Date();
    const end = new Date(start);
    if (sub.plan.interval === "MONTHLY") end.setMonth(end.getMonth() + 1);
    else end.setFullYear(end.getFullYear() + 1);
    await activateSubscription(sub.id, { start, end }, { paymentId: null, amountInr: sub.plan.priceInr });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Simulated payment confirmed" };
}

/** Polled by the checkout UI after Razorpay closes — access appears once the webhook lands. */
export async function checkPaymentStatus(kind: "order" | "subscription", id: string) {
  const user = await requireUser();
  if (kind === "order") {
    const order = await db.order.findFirst({ where: { id, userId: user.id }, select: { status: true } });
    return { status: order?.status ?? "PENDING" };
  }
  const sub = await db.subscription.findFirst({ where: { id, userId: user.id }, select: { status: true } });
  return { status: sub?.status === "ACTIVE" ? "PAID" : sub?.status === "CANCELLED" ? "FAILED" : "PENDING" };
}

export async function cancelMySubscription(subscriptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const res = await cancelSubscription(user.id, subscriptionId);
  if ("error" in res) return { ok: false, error: res.error! };
  revalidatePath("/billing");
  return { ok: true, message: "Cancelled — you keep Pro until the end of this billing period." };
}

export async function signOutEverywhere() {
  const user = await requireUser();
  await db.session.deleteMany({ where: { userId: user.id } });
  redirect("/login");
}

export async function skipOnboarding(): Promise<ActionResult> {
  const user = await requireUser();
  await db.profile.upsert({
    where: { userId: user.id },
    update: { onboardedAt: new Date() },
    create: { userId: user.id, onboardedAt: new Date() },
  });
  return { ok: true };
}

/** Form action: enrol then open the path. */
export async function enrolAndStart(pathId: string): Promise<void> {
  const res = await enrol(pathId);
  if (!res.ok) redirect("/explore");
  const path = await db.careerPath.findUnique({ where: { id: pathId }, select: { slug: true } });
  redirect(`/learn/${path!.slug}`);
}

/** Revoke one of the current user's sessions by id (tokens never leave the server). */
export async function revokeMySession(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
  revalidatePath("/settings");
  return { ok: true, message: "Session revoked" };
}
