"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { accountDeactivatedTemplate, accountDeletedTemplate } from "@/lib/email-templates";
import { setFlash } from "@/lib/flash";
import { formatINR } from "@/lib/pricing";
import { getSession, isAdmin, isFreshSession, requireUser } from "@/lib/session";
import { deleteObject } from "@/lib/storage";
import { sellerEarnings } from "@/server/marketplace";

export type AccountResult = { ok: false; error: string };

async function signOutHere() {
  await auth.api.signOut({ headers: await headers() }).catch(() => null);
}

/**
 * Pauses the account: signs out everywhere and hides the student's marketplace
 * listings. Signing in again reactivates it (see the session hook in lib/auth).
 */
export async function deactivateMyAccount(): Promise<AccountResult> {
  const user = await requireUser("/settings?tab=account");
  if (isAdmin(user)) return { ok: false, error: "Admin accounts can't be paused. Ask another admin to change your role first." };

  await db.user.update({ where: { id: user.id }, data: { deactivatedAt: new Date() } });
  await sendEmail(user.email, accountDeactivatedTemplate(user.name));
  await signOutHere();
  await db.session.deleteMany({ where: { userId: user.id } });
  await setFlash("account-deactivated");
  redirect("/account-closed");
}

/**
 * Deletes the account. Billing records (orders, invoices, subscriptions) must be
 * kept for tax purposes, so the user row is anonymised rather than removed and
 * everything personal is deleted.
 */
export async function deleteMyAccount(input: { confirm: string }): Promise<AccountResult> {
  const user = await requireUser("/settings?tab=account");
  const session = await getSession();
  if (isAdmin(user)) return { ok: false, error: "Admin accounts can't be deleted here. Ask another admin to change your role first." };
  if (input.confirm.trim() !== "DELETE") return { ok: false, error: "Type DELETE in capital letters to confirm." };
  // A recent sign-in, so a borrowed, already-open laptop can't delete the account.
  if (!isFreshSession(session?.session.createdAt)) {
    return { ok: false, error: "For your security, log out and log in again, then delete your account within 15 minutes." };
  }

  const [activeSub, openDisputes, earnings] = await Promise.all([
    db.subscription.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE"] }, cancelAtEnd: false, isSimulated: false } }),
    db.projectDispute.count({ where: { status: "OPEN", purchase: { OR: [{ buyerId: user.id }, { project: { sellerId: user.id } }] } } }),
    sellerEarnings(user.id),
  ]);
  if (activeSub) return { ok: false, error: "Cancel your Pro subscription in Billing first, so you aren't charged again." };
  if (openDisputes) return { ok: false, error: "You have an open marketplace dispute. We need to resolve it before deleting your account." };
  const owed = earnings.onHold + earnings.payable + earnings.inPayout;
  if (owed > 0) {
    return { ok: false, error: `You have ${formatINR(owed)} in seller earnings still to be paid. Contact us so we can pay you before deleting your account.` };
  }

  const projects = await db.project.findMany({
    where: { sellerId: user.id },
    select: { id: true, _count: { select: { purchases: true } }, files: { select: { key: true } } },
  });
  const unsold = projects.filter((p) => p._count.purchases === 0);
  const sold = projects.filter((p) => p._count.purchases > 0);

  // Sign this browser out before the session rows disappear.
  await signOutHere();

  await db.$transaction([
    db.session.deleteMany({ where: { userId: user.id } }),
    db.account.deleteMany({ where: { userId: user.id } }),
    db.verification.deleteMany({ where: { OR: [{ identifier: { contains: user.email, mode: "insensitive" } }, { value: user.id }] } }),
    db.profile.deleteMany({ where: { userId: user.id } }),
    db.resume.deleteMany({ where: { userId: user.id } }),
    db.enrollment.deleteMany({ where: { userId: user.id } }),
    db.progress.deleteMany({ where: { userId: user.id } }),
    db.bookmark.deleteMany({ where: { userId: user.id } }),
    db.quizAttempt.deleteMany({ where: { userId: user.id } }),
    db.savedJob.deleteMany({ where: { userId: user.id } }),
    db.marketplaceWaitlist.deleteMany({ where: { userId: user.id } }),
    db.entitlement.deleteMany({ where: { userId: user.id } }),
    db.contactMessage.deleteMany({ where: { userId: user.id } }),
    db.sellerProfile.deleteMany({ where: { userId: user.id } }),
    // Buyers keep access to projects they paid for; everything else goes.
    db.project.updateMany({ where: { id: { in: sold.map((p) => p.id) } }, data: { status: "ARCHIVED" } }),
    db.project.deleteMany({ where: { id: { in: unsold.map((p) => p.id) } } }),
    db.user.update({
      where: { id: user.id },
      data: {
        name: "Deleted user",
        email: `deleted-${user.id}@deleted.invalid`,
        emailVerified: false,
        image: null,
        banned: true,
        banReason: "Account deleted by its owner",
        lastActiveAt: null,
        deactivatedAt: new Date(),
        deletedAt: new Date(),
      },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: "account.deleted",
        targetType: "User",
        targetId: user.id,
        meta: { soldProjectsKept: sold.length, unsoldProjectsDeleted: unsold.length },
      },
    }),
  ]);

  // Best effort: the rows are gone either way.
  await Promise.allSettled(unsold.flatMap((p) => p.files.map((f) => deleteObject(f.key))));
  await sendEmail(user.email, accountDeletedTemplate(user.name));
  await setFlash("account-deleted");
  redirect("/account-closed");
}
