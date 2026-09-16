import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cleanupImports, importJobs, importUpdates } from "@/server/importers";
import { checkLinks } from "@/server/link-check";

export const maxDuration = 300;

/** Vercel Cron calls these with "Authorization: Bearer <CRON_SECRET>". */
function authorized(request: Request) {
  const secret = env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

const tasks = {
  "import-jobs": async () => ({ reports: await importJobs() }),
  "import-updates": async () => ({ reports: await importUpdates() }),
  maintenance: async () => {
    const [cleanup, links, abandoned] = await Promise.all([
      cleanupImports(),
      checkLinks(undefined, 60),
      // Checkouts that were opened but never paid.
      db.order.updateMany({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) } }, data: { status: "FAILED" } }),
    ]);
    return { cleanup, links, abandonedOrders: abandoned.count };
  },
} as const;

export async function GET(request: Request, ctx: RouteContext<"/api/cron/[task]">) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { task } = await ctx.params;
  const run = tasks[task as keyof typeof tasks];
  if (!run) return NextResponse.json({ error: "Unknown task" }, { status: 404 });
  const started = Date.now();
  const result = await run();
  console.info(`[cron] ${task} finished in ${Date.now() - started}ms`, JSON.stringify(result));
  return NextResponse.json({ ok: true, task, ms: Date.now() - started, ...result });
}
