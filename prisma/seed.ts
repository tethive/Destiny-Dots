/**
 * Development seed: catalogue, plans & prices, sample content and demo accounts.
 * Refuses to run against a non-local database unless SEED_ALLOW_REMOTE=1.
 *
 *   npm run db:seed              local development (sample content + demo logins)
 *   npm run db:seed:production   production: plans, prices and the path/dot outline
 *                                as unpublished drafts — no sample links, no demo accounts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, type ResourceType } from "../src/generated/prisma/client";
import { paths } from "../src/lib/catalog";
import { pricing } from "../src/lib/pricing";
import { certifications, jobs, quizzes, updates } from "./seed-content";

const url = process.env.DATABASE_URL ?? "";
const productionMode = process.env.SEED_MODE === "production";
if (!productionMode && !/localhost|127\.0\.0\.1/.test(url) && process.env.SEED_ALLOW_REMOTE !== "1") {
  console.error("Refusing to seed a non-local database. Set SEED_ALLOW_REMOTE=1 to override.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const days = (n: number) => new Date(Date.now() - n * 86_400_000);
const searchUrl = (type: string, q: string) =>
  type === "video"
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
    : `https://www.google.com/search?q=${encodeURIComponent(q)}`;

const levelMap = { Beginner: "BEGINNER", Intermediate: "INTERMEDIATE", Advanced: "ADVANCED" } as const;

async function seedCatalogue() {
  let dotCount = 0;
  for (const p of paths) {
    const path = await db.careerPath.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        domainTag: p.domainTag,
        title: p.title,
        summary: p.summary,
        level: levelMap[p.level],
        duration: p.duration,
        roles: p.roles,
        outcomes: p.outcomes,
        // In production, paths start as drafts until real resources are added and an admin publishes them.
        isPublished: productionMode ? false : p.isPublished,
      },
    });

    for (const d of p.dots) {
      const existing = await db.dot.findUnique({ where: { pathId_order: { pathId: path.id, order: d.order } } });
      if (existing) continue;
      const dot = await db.dot.create({
        data: {
          pathId: path.id,
          order: d.order,
          title: d.title,
          description: d.description,
          hours: d.hours,
          isFree: d.isFree,
          certification: d.certification,
        },
      });
      dotCount++;
      if (productionMode) continue;

      const defined = d.resources ?? [];
      const types: ResourceType[] = ["VIDEO", "DOC", "PROJECT", "LINK", "VIDEO", "DOC"];
      const list =
        defined.length > 0
          ? defined.map((r) => ({ title: r.title, type: r.type.toUpperCase() as ResourceType, duration: r.duration, isPremium: r.isPremium }))
          : Array.from({ length: d.resourceCount }, (_, i) => {
              const type = types[i % types.length];
              const label = { VIDEO: "video lesson", DOC: "reference guide", PROJECT: "hands-on project", LINK: "practice", QUIZ: "quiz" }[type];
              return { title: `${d.title} — ${label}`, type, duration: type === "VIDEO" ? "1h" : type === "PROJECT" ? "3h" : "Read", isPremium: false };
            });

      for (const [i, r] of list.entries()) {
        const resource = await db.resource.create({
          data: {
            title: r.title,
            type: r.type,
            duration: r.duration,
            isPremium: r.isPremium,
            url: searchUrl(r.type.toLowerCase(), `${r.title} ${p.title}`),
            domainTags: [p.domainTag],
            topics: [d.title],
            isSample: true,
          },
        });
        await db.dotResource.create({ data: { dotId: dot.id, resourceId: resource.id, order: i + 1 } });
      }
    }

    for (const quiz of quizzes[p.slug] ?? []) {
      const dot = await db.dot.findUnique({ where: { pathId_order: { pathId: path.id, order: quiz.order } } });
      if (!dot || (await db.quizQuestion.count({ where: { dotId: dot.id } }))) continue;
      await db.quizQuestion.createMany({ data: quiz.questions.map((q, i) => ({ ...q, dotId: dot.id, order: i + 1 })) });
    }
  }
  console.log(`✓ Catalogue: ${paths.length} paths, ${dotCount} new dots`);
}

async function seedCommerce() {
  await db.plan.upsert({ where: { interval: "MONTHLY" }, update: {}, create: { name: "Pro Monthly", interval: "MONTHLY", priceInr: pricing.monthly } });
  await db.plan.upsert({ where: { interval: "YEARLY" }, update: {}, create: { name: "Pro Yearly", interval: "YEARLY", priceInr: pricing.yearly } });
  for (const [scope, amount] of [["DOT", pricing.dotUnlock], ["PATH", pricing.pathUnlock]] as const) {
    const found = await db.price.findFirst({ where: { scope, scopeId: null } });
    if (!found) await db.price.create({ data: { scope, scopeId: null, amountInr: amount } });
  }
  if (productionMode) return console.log("✓ Plans and default prices");
  const coupon = await db.coupon.findUnique({ where: { code: "WELCOME10" } });
  if (!coupon) await db.coupon.create({ data: { code: "WELCOME10", discountPct: 10, maxUses: 100 } });
  console.log("✓ Plans, default prices and a WELCOME10 test coupon");
}

/** Guide outlines for production, hidden until an admin reviews exam details and publishes them. */
async function seedCertificationGuidesAsDrafts() {
  for (const c of certifications) {
    await db.certificationGuide.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, isPublished: false, isSample: false } });
  }
  console.log(`✓ ${certifications.length} certification guides as drafts — review and publish them in admin`);
}

async function seedContent() {
  for (const c of certifications) {
    await db.certificationGuide.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, isSample: true } });
  }
  if ((await db.jobListing.count()) === 0) {
    await db.jobListing.createMany({
      data: jobs.map(({ daysAgo, ...j }) => ({
        ...j,
        url: "https://example.com/jobs/sample",
        postedAt: days(daysAgo),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        isSample: true,
      })),
    });
  }
  for (const { daysAgo, ...u } of updates) {
    await db.techUpdate.upsert({
      where: { slug: u.slug },
      update: {},
      create: { ...u, isPublished: true, publishedAt: days(daysAgo), isSample: true },
    });
  }
  console.log(`✓ Content: ${certifications.length} certification guides, ${jobs.length} jobs, ${updates.length} updates (all marked sample)`);
}

async function createUser(email: string, name: string, password: string, role: "admin" | "student") {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return existing;
  const id = crypto.randomUUID();
  const user = await db.user.create({ data: { id, email, name, role, emailVerified: true } });
  await db.account.create({
    data: { id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) },
  });
  await db.profile.create({ data: { userId: id } });
  return user;
}

async function seedDemoAccounts() {
  const adminEmail = (process.env.ADMIN_EMAILS ?? "info.destinydots@gmail.com").split(",")[0].trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "DevAdmin#2026";
  const studentPassword = process.env.SEED_STUDENT_PASSWORD ?? "DevStudent#2026";

  await createUser(adminEmail, "Destiny Dots Admin", adminPassword, "admin");
  const student = await createUser("student@destinydots.test", "Aarav Sharma", studentPassword, "student");

  await db.profile.update({
    where: { userId: student.id },
    data: {
      stage: "STUDENT",
      domainInterests: ["data-analysis", "cybersecurity"],
      weeklyTime: "FIVE_TO_TEN",
      goalTimeline: "SIX_MONTHS",
      city: "Chennai",
      onboardedAt: days(14),
    },
  });

  const analyst = await db.careerPath.findUniqueOrThrow({ where: { slug: "data-analyst" }, include: { dots: { orderBy: { order: "asc" } } } });
  const soc = await db.careerPath.findUniqueOrThrow({ where: { slug: "soc-analyst" }, include: { dots: { orderBy: { order: "asc" } } } });

  for (const [path, done, enrolledDaysAgo] of [[analyst, 2, 14], [soc, 1, 6]] as const) {
    await db.enrollment.upsert({
      where: { userId_pathId: { userId: student.id, pathId: path.id } },
      update: {},
      create: { userId: student.id, pathId: path.id, enrolledAt: days(enrolledDaysAgo), lastActivityAt: days(1) },
    });
    for (const [i, dot] of path.dots.slice(0, done).entries()) {
      await db.progress.upsert({
        where: { userId_dotId: { userId: student.id, dotId: dot.id } },
        update: {},
        create: { userId: student.id, dotId: dot.id, completedAt: days(done - i) },
      });
    }
  }

  const firstResources = await db.dotResource.findMany({ where: { dotId: analyst.dots[1].id }, take: 2 });
  for (const r of firstResources) {
    await db.bookmark.upsert({
      where: { userId_resourceId: { userId: student.id, resourceId: r.resourceId } },
      update: {},
      create: { userId: student.id, resourceId: r.resourceId },
    });
  }

  console.log("✓ Demo accounts (local development only):");
  console.log(`    Admin    ${adminEmail}  /  ${adminPassword}`);
  console.log(`    Student  student@destinydots.test  /  ${studentPassword}`);
}

/** Levels for sample resources (by position in the path) and study resources for each certification guide. */
async function seedLevelsAndCertResources() {
  const dots = await db.dot.findMany({ select: { order: true, pathId: true, resources: { select: { resourceId: true } } } });
  const totals = new Map<string, number>();
  for (const d of dots) totals.set(d.pathId, Math.max(totals.get(d.pathId) ?? 0, d.order));
  for (const d of dots) {
    const share = d.order / (totals.get(d.pathId) ?? 1);
    const level = share <= 0.34 ? "BEGINNER" : share <= 0.67 ? "INTERMEDIATE" : "ADVANCED";
    await db.resource.updateMany({ where: { id: { in: d.resources.map((r) => r.resourceId) }, isSample: true }, data: { level } });
  }

  const guides = await db.certificationGuide.findMany({ include: { _count: { select: { resources: true } } } });
  let linked = 0;
  for (const g of guides) {
    if (g._count.resources > 0) continue;
    const pool = await db.resource.findMany({
      where: { dots: { some: { dot: { path: { slug: { in: g.pathSlugs } } } } } },
      orderBy: [{ level: "asc" }, { title: "asc" }],
      take: 60,
      select: { id: true, level: true },
    });
    const pick = (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).flatMap((lvl) => pool.filter((r) => r.level === lvl).slice(0, 3));
    if (!pick.length) continue;
    await db.certificationResource.createMany({ data: pick.map((r, i) => ({ certificationId: g.id, resourceId: r.id, order: i + 1 })), skipDuplicates: true });
    linked += pick.length;
  }
  console.log(`✓ Resource levels set; ${linked} certification resources linked`);
}

async function main() {
  await seedCatalogue();
  await seedCommerce();
  if (productionMode) {
    await seedCertificationGuidesAsDrafts();
    return;
  }
  await seedContent();
  await seedDemoAccounts();
  await seedLevelsAndCertResources();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
