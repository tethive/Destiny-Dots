import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export type Access = {
  plan: boolean;
  planValidUntil: Date | null;
  paths: Set<string>;
  dots: Set<string>;
};

/**
 * Active entitlements for a user. Entitlements are only ever written by the
 * payment webhook (or an admin grant) — never by a browser callback.
 */
export const getAccess = cache(async (userId: string): Promise<Access> => {
  const now = new Date();
  const rows = await db.entitlement.findMany({
    where: {
      userId,
      revokedAt: null,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
    select: { scope: true, scopeId: true, validUntil: true },
  });
  const planRows = rows.filter((r) => r.scope === "PLAN");
  return {
    plan: planRows.length > 0,
    planValidUntil: planRows.some((r) => r.validUntil === null)
      ? null
      : planRows.reduce<Date | null>((max, r) => (!max || (r.validUntil && r.validUntil > max) ? r.validUntil : max), null),
    paths: new Set(rows.filter((r) => r.scope === "PATH" && r.scopeId).map((r) => r.scopeId!)),
    dots: new Set(rows.filter((r) => r.scope === "DOT" && r.scopeId).map((r) => r.scopeId!)),
  };
});

/** Access check order from the spec: free → subscription → path unlock → dot unlock. */
export function canOpenDot(access: Access, dot: { id: string; pathId: string; isFree: boolean }) {
  return dot.isFree || access.plan || access.paths.has(dot.pathId) || access.dots.has(dot.id);
}
