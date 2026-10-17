/**
 * Imports the launch curriculum (34 paths built from 21 shared modules).
 *
 *   npx tsx scripts/import-curriculum.ts            apply to DATABASE_URL
 *   npx tsx scripts/import-curriculum.ts --sql      print SQL instead (for a migration)
 *
 * Idempotent: paths are matched by slug and dots by (path, topicKey), so a
 * re-run reorders and retitles in place and keeps any resources already curated
 * against a dot. Only the five launch domains are touched.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildCurriculum, type BuiltPath } from "../src/content/curriculum-build";
import { PrismaClient } from "../src/generated/prisma/client";

const LAUNCH_DOMAINS = ["cybersecurity", "ethical-hacking", "ai-ml", "data-engineering", "data-analysis"];

const levelEnum = { Beginner: "BEGINNER", Intermediate: "INTERMEDIATE", Advanced: "ADVANCED" } as const;

const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const arr = (xs: string[]) => "ARRAY[" + xs.map(q).join(", ") + "]::text[]";

/**
 * SQL mirroring the Prisma path below. Dots are parked at a negative order
 * first because (pathId, order) is unique and the document reshuffles them.
 */
function sqlFor(paths: BuiltPath[]) {
  const out: string[] = [];
  for (const p of paths) {
    out.push(
      `-- ${p.code} ${p.title} (${p.dots.length} dots)`,
      `INSERT INTO "CareerPath" ("id", "slug", "domainTag", "title", "summary", "level", "duration", "roles", "outcomes", "isPublished", "createdAt", "updatedAt")`,
      `VALUES (gen_random_uuid()::text, ${q(p.slug)}, ${q(p.domainTag)}, ${q(p.title)}, ${q(p.summary)}, '${levelEnum[p.level]}', ${q(p.duration)}, ${arr(p.roles)}, ${arr(p.outcomes)}, true, now(), now())`,
      `ON CONFLICT ("slug") DO UPDATE SET "domainTag" = EXCLUDED."domainTag", "title" = EXCLUDED."title", "summary" = EXCLUDED."summary",`,
      `  "level" = EXCLUDED."level", "duration" = EXCLUDED."duration", "roles" = EXCLUDED."roles", "outcomes" = EXCLUDED."outcomes",`,
      `  "isPublished" = true, "updatedAt" = now();`,
      `UPDATE "Dot" SET "order" = -"order" WHERE "order" > 0 AND "pathId" = (SELECT "id" FROM "CareerPath" WHERE "slug" = ${q(p.slug)});`,
    );
    for (const d of p.dots) {
      out.push(
        `INSERT INTO "Dot" ("id", "pathId", "order", "title", "description", "hours", "isFree", "certification", "topicKey", "moduleCode", "createdAt", "updatedAt")`,
        `SELECT gen_random_uuid()::text, cp."id", ${d.order}, ${q(d.title)}, ${q(d.description)}, ${d.hours}, ${d.isFree}, ${d.certification ? q(d.certification) : "NULL"}, ${q(d.topicKey)}, ${d.moduleCode ? q(d.moduleCode) : "NULL"}, now(), now()`,
        `FROM "CareerPath" cp WHERE cp."slug" = ${q(p.slug)}`,
        `ON CONFLICT ("pathId", "topicKey") DO UPDATE SET "order" = EXCLUDED."order", "title" = EXCLUDED."title", "description" = EXCLUDED."description",`,
        `  "hours" = EXCLUDED."hours", "isFree" = EXCLUDED."isFree", "certification" = EXCLUDED."certification", "moduleCode" = EXCLUDED."moduleCode", "updatedAt" = now();`,
      );
    }
    out.push(
      `DELETE FROM "Dot" WHERE "order" < 0 AND "pathId" = (SELECT "id" FROM "CareerPath" WHERE "slug" = ${q(p.slug)});`,
      "",
    );
  }
  out.push(
    "-- Placeholder paths the document replaces.",
    `DELETE FROM "CareerPath" WHERE "domainTag" IN (${LAUNCH_DOMAINS.map(q).join(", ")})`,
    `  AND "slug" NOT IN (${paths.map((p) => q(p.slug)).join(", ")});`,
    "",
  );
  return out.join("\n");
}

async function apply(paths: BuiltPath[]) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  let dots = 0;
  for (const p of paths) {
    const data = {
      domainTag: p.domainTag,
      title: p.title,
      summary: p.summary,
      level: levelEnum[p.level],
      duration: p.duration,
      roles: p.roles,
      outcomes: p.outcomes,
      // These are the launch roadmaps, so a path that already existed as a
      // draft goes live with the rest.
      isPublished: true,
    };
    const path = await db.careerPath.upsert({
      where: { slug: p.slug },
      update: data,
      create: { ...data, slug: p.slug },
    });

    await db.$executeRaw`UPDATE "Dot" SET "order" = -"order" WHERE "pathId" = ${path.id} AND "order" > 0`;
    for (const d of p.dots) {
      const fields = {
        order: d.order,
        title: d.title,
        description: d.description,
        hours: d.hours,
        isFree: d.isFree,
        certification: d.certification ?? null,
        moduleCode: d.moduleCode ?? null,
      };
      await db.dot.upsert({
        where: { pathId_topicKey: { pathId: path.id, topicKey: d.topicKey } },
        update: fields,
        create: { ...fields, pathId: path.id, topicKey: d.topicKey },
      });
      dots++;
    }
    await db.dot.deleteMany({ where: { pathId: path.id, order: { lt: 0 } } });
    console.log(`  ${p.code.padEnd(4)} ${p.slug.padEnd(38)} ${String(p.dots.length).padStart(3)} dots`);
  }

  const retired = await db.careerPath.deleteMany({
    where: { domainTag: { in: LAUNCH_DOMAINS }, slug: { notIn: paths.map((p) => p.slug) } },
  });
  console.log(`\n${paths.length} paths, ${dots} dots. Retired ${retired.count} placeholder paths.`);
  await db.$disconnect();
}

async function main() {
  const built = buildCurriculum();
  if (process.argv.includes("--sql")) process.stdout.write(sqlFor(built));
  else await apply(built);
}

main();
