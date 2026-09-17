import "server-only";
import { db } from "@/lib/db";

const DAY = 86_400_000;
const IST = 330 * 60_000;
const dayKey = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10);

export async function getOverview() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since7 = new Date(now.getTime() - 7 * DAY);

  const [
    users,
    signups30,
    signups7,
    activeSubs,
    paidOrders,
    recentOrders,
    newUsers,
    enrollCounts,
    paths,
    activeLearners7,
  ] = await Promise.all([
    db.user.count({ where: { role: { not: "admin" }, deletedAt: null } }),
    db.user.count({ where: { createdAt: { gte: since30 }, role: { not: "admin" } } }),
    db.user.count({ where: { createdAt: { gte: since7 }, role: { not: "admin" } } }),
    db.subscription.findMany({ where: { status: "ACTIVE", validUntil: { gt: now } }, include: { plan: true } }),
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountInr: true }, _count: true }),
    db.order.findMany({ where: { status: "PAID", createdAt: { gte: since30 } }, select: { amountInr: true, createdAt: true } }),
    db.user.findMany({ where: { createdAt: { gte: since30 }, role: { not: "admin" } }, select: { createdAt: true } }),
    db.enrollment.groupBy({ by: ["pathId"], _count: { pathId: true }, orderBy: { _count: { pathId: "desc" } }, take: 5 }),
    db.careerPath.findMany({ select: { id: true, title: true, slug: true } }),
    db.progress.findMany({ where: { completedAt: { gte: since7 } }, distinct: ["userId"], select: { userId: true } }),
  ]);

  const mrr = Math.round(activeSubs.reduce((n, s) => n + (s.plan.interval === "MONTHLY" ? s.plan.priceInr : s.plan.priceInr / 12), 0));
  const subRevenue = activeSubs.reduce((n, s) => n + s.plan.priceInr, 0);

  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * DAY);
    return { date: dayKey(d), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), signups: 0, revenue: 0 };
  });
  const idx = new Map(series.map((s, i) => [s.date, i]));
  for (const u of newUsers) {
    const i = idx.get(dayKey(u.createdAt));
    if (i !== undefined) series[i].signups++;
  }
  for (const o of recentOrders) {
    const i = idx.get(dayKey(o.createdAt));
    if (i !== undefined) series[i].revenue += o.amountInr;
  }

  const byId = new Map(paths.map((p) => [p.id, p]));
  const topPaths = enrollCounts.map((e) => ({ title: byId.get(e.pathId)?.title ?? "Unknown", slug: byId.get(e.pathId)?.slug, enrolled: e._count.pathId }));

  return {
    users,
    signups30,
    signups7,
    activeSubscribers: activeSubs.length,
    mrr,
    subRevenue,
    oneOffRevenue: paidOrders._sum.amountInr ?? 0,
    paidOrders: paidOrders._count,
    activeLearners7: activeLearners7.length,
    series,
    topPaths,
  };
}

/**
 * Drop-off: for each dot of a path, the share of enrolled students who
 * completed it. The first steep fall shows where students quit.
 */
export async function getDropOff(pathId: string) {
  const [path, enrolled] = await Promise.all([
    db.careerPath.findUnique({
      where: { id: pathId },
      include: { dots: { orderBy: { order: "asc" }, include: { _count: { select: { progress: true } } } } },
    }),
    db.enrollment.count({ where: { pathId } }),
  ]);
  if (!path) return null;
  return {
    path: { id: path.id, title: path.title },
    enrolled,
    dots: path.dots.map((d) => ({
      order: d.order,
      title: d.title,
      completed: d._count.progress,
      rate: enrolled ? Math.min(1, d._count.progress / enrolled) : 0,
    })),
  };
}

/** Matrix of completion rates for the most-enrolled paths (heatmap). */
export async function getDropOffMatrix(limit = 6) {
  const top = await db.enrollment.groupBy({
    by: ["pathId"],
    _count: { pathId: true },
    orderBy: { _count: { pathId: "desc" } },
    take: limit,
  });
  const rows = await Promise.all(top.map((t) => getDropOff(t.pathId)));
  return rows.filter((r): r is NonNullable<typeof r> => r !== null);
}
