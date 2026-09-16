import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type UserFilter = { q: string; plan?: string; role?: string; status?: string; page: number };
export const USERS_PAGE = 30;

export function userFilterFromParams(sp: Record<string, string | string[] | undefined>): UserFilter {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return { q: str(sp.q) ?? "", plan: str(sp.plan), role: str(sp.role), status: str(sp.status), page: Math.max(1, Number(str(sp.page) ?? 1)) };
}

function activePlanWhere(): Prisma.EntitlementWhereInput {
  const now = new Date();
  return { scope: "PLAN", revokedAt: null, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] };
}

export function userWhere(f: UserFilter): Prisma.UserWhereInput {
  return {
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] } : {}),
    ...(f.role ? { role: f.role } : {}),
    ...(f.status === "banned" ? { banned: true } : {}),
    ...(f.plan === "pro" ? { entitlements: { some: activePlanWhere() } } : {}),
    ...(f.plan === "free" ? { entitlements: { none: activePlanWhere() } } : {}),
  };
}

export async function listUsers(f: UserFilter, all = false) {
  const where = userWhere(f);
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: all ? 10_000 : USERS_PAGE,
      skip: all ? 0 : (f.page - 1) * USERS_PAGE,
      include: {
        _count: { select: { enrollments: true, progress: true } },
        entitlements: { where: activePlanWhere(), select: { id: true }, take: 1 },
      },
    }),
    db.user.count({ where }),
  ]);
  return {
    users: rows.map(({ entitlements, ...u }) => ({ ...u, isPro: entitlements.length > 0 })),
    total,
    pages: Math.max(1, Math.ceil(total / USERS_PAGE)),
  };
}
