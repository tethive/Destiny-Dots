import "server-only";
import type { Level, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/server/settings";

export const projectCardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  domainTags: true,
  techStack: true,
  level: true,
  priceInr: true,
  ratingAvg: true,
  ratingCount: true,
  salesCount: true,
  approvedAt: true,
  seller: { select: { name: true, sellerProfile: { select: { displayName: true } } } },
  files: { where: { kind: "COVER" }, select: { key: true }, take: 1 },
} satisfies Prisma.ProjectSelect;

export type ProjectCard = Prisma.ProjectGetPayload<{ select: typeof projectCardSelect }>;

export type BrowseFilter = { q?: string; domain?: string; level?: Level; sort?: "new" | "popular" | "rating" | "price-asc" | "price-desc" };

export async function browseProjects(f: BrowseFilter) {
  const where: Prisma.ProjectWhereInput = {
    status: "APPROVED",
    seller: { deactivatedAt: null },
    ...(f.domain ? { domainTags: { has: f.domain } } : {}),
    ...(f.level ? { level: f.level } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" } },
            { summary: { contains: f.q, mode: "insensitive" } },
            { techStack: { has: f.q } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    f.sort === "popular"
      ? [{ salesCount: "desc" }]
      : f.sort === "rating"
        ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }]
        : f.sort === "price-asc"
          ? [{ priceInr: "asc" }]
          : f.sort === "price-desc"
            ? [{ priceInr: "desc" }]
            : [{ approvedAt: "desc" }];
  return db.project.findMany({ where, orderBy, take: 60, select: projectCardSelect });
}

/** Earnings for a seller, split by where each sale is in the payout cycle. */
export async function sellerEarnings(sellerId: string) {
  const { holdDays } = await getSetting("marketplace");
  const releaseBefore = new Date(Date.now() - holdDays * 86_400_000);
  const purchases = await db.projectPurchase.findMany({
    where: { project: { sellerId } },
    select: { id: true, sellerEarningInr: true, status: true, createdAt: true, payoutId: true, payout: { select: { status: true } } },
  });
  let onHold = 0;
  let payable = 0;
  let inPayout = 0;
  let paid = 0;
  const payableIds: string[] = [];
  for (const p of purchases) {
    if (p.status === "REFUNDED") continue;
    if (p.payoutId) {
      if (p.payout?.status === "PAID") paid += p.sellerEarningInr;
      else if (p.payout?.status === "PENDING") inPayout += p.sellerEarningInr;
      continue;
    }
    if (p.status === "DISPUTED" || p.createdAt > releaseBefore) onHold += p.sellerEarningInr;
    else {
      payable += p.sellerEarningInr;
      payableIds.push(p.id);
    }
  }
  return { onHold, payable, inPayout, paid, payableIds, holdDays };
}

/** Sellers with money ready to pay out (for the admin payouts queue). */
export async function payableSellers() {
  const { holdDays, minPayoutInr } = await getSetting("marketplace");
  const releaseBefore = new Date(Date.now() - holdDays * 86_400_000);
  const rows = await db.projectPurchase.groupBy({
    by: ["projectId"],
    where: { status: "PAID", payoutId: null, createdAt: { lte: releaseBefore } },
    _sum: { sellerEarningInr: true },
    _count: true,
  });
  if (!rows.length) return [];
  const projects = await db.project.findMany({ where: { id: { in: rows.map((r) => r.projectId) } }, select: { id: true, sellerId: true } });
  const bySeller = new Map<string, { amount: number; sales: number }>();
  for (const r of rows) {
    const sellerId = projects.find((p) => p.id === r.projectId)!.sellerId;
    const cur = bySeller.get(sellerId) ?? { amount: 0, sales: 0 };
    bySeller.set(sellerId, { amount: cur.amount + (r._sum.sellerEarningInr ?? 0), sales: cur.sales + r._count });
  }
  const sellers = await db.user.findMany({
    where: { id: { in: [...bySeller.keys()] } },
    select: { id: true, name: true, email: true, sellerProfile: { select: { payoutMethod: true, payoutHint: true, payoutName: true } } },
  });
  return sellers
    .map((s) => ({ ...s, ...bySeller.get(s.id)!, belowMinimum: bySeller.get(s.id)!.amount < minPayoutInr }))
    .sort((a, b) => b.amount - a.amount);
}

export const projectImageUrl = (key: string) => `/api/files/${key}`;
