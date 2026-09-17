import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Current session (deduplicated per request). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type AppUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export const isAdmin = (user: { role?: string | null }) => user.role === "admin";

/** Sensitive actions (like deleting the account) need a sign-in from the last 15 minutes. */
export function isFreshSession(createdAt: Date | string | undefined) {
  return createdAt !== undefined && Date.now() - new Date(createdAt).getTime() <= 15 * 60 * 1000;
}

/** Signed-in student or admin; otherwise redirect to login. */
export async function requireUser(nextPath?: string) {
  const session = await getSession();
  if (!session) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  if (session.user.banned) redirect("/account-suspended");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) notFound();
  return user;
}

/** Throttled "last active" stamp used by the admin users table. */
export async function touchActivity(userId: string) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  await db.user.updateMany({
    where: { id: userId, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoff } }] },
    data: { lastActiveAt: new Date() },
  });
}

/** Where a user should land after signing in. */
export async function homeFor(user: AppUser, next?: string | null) {
  if (isAdmin(user)) return next?.startsWith("/admin") ? next : "/admin";
  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { onboardedAt: true } });
  if (!profile?.onboardedAt) return `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}
