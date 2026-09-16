# Destiny Dots — web app

Career roadmaps for students: a **Career Path** is a sequence of **Dots**, and each Dot holds **Resources**.
Product context lives in the project skill at `.claude/skills/destiny-dots/`.

## Stack

| Layer | Version |
|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack) · React 19.2 · TypeScript 5 |
| Styling | Tailwind CSS 4 · shadcn/ui (radix-nova) · `cn` |
| Theming | next-themes — Light / Dark / System |
| Motion & 3D | motion 13 · three.js · React Three Fiber 9 · drei 10 |
| Data | PostgreSQL · Prisma 7 (`@prisma/adapter-pg`, client generated to `src/generated/prisma`) |
| Auth | Better Auth — email/password, Google (when keys are set), admin plugin (roles, bans) |
| Payments | Razorpay orders + subscriptions, verified webhook · dev-only payment simulator |
| Email | Resend — verification, welcome, reset, contact (team + sender), receipts, subscription & marketplace emails |
| Files | Cloudflare R2 / S3 (private, presigned uploads) · in-app PDF (react-pdf), video and ZIP viewers |
| Security | Nonce CSP + security headers · Postgres-backed rate limits · Turnstile · breached-password check · AES-GCM encryption |
| Automation | Vercel Cron: job imports (Adzuna, Jooble, Remotive), news (DEV, Hacker News, RSS), nightly maintenance |
| Other | recharts · dnd-kit · @react-pdf/renderer (resume + invoices) · zod 4 |

## Local setup

```bash
npm install                 # also runs prisma generate
cp .env.example .env        # then fill BETTER_AUTH_SECRET (see comment in the file)
npm run db:dev              # starts local Prisma Postgres; put the printed TCP URL in DATABASE_URL
npm run db:deploy           # apply migrations
npm run db:seed             # sample catalogue, content and demo accounts (local DB only)
npm run dev                 # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`, `npm run db:studio`, `npm run db:reset`.

**Demo accounts (local seed only):**

| Role | Email | Password |
|---|---|---|
| Admin | info.destinydots@gmail.com | `DevAdmin#2026` (override with `SEED_ADMIN_PASSWORD`) |
| Student | student@destinydots.test | `DevStudent#2026` (override with `SEED_STUDENT_PASSWORD`) |

> Next.js 16 differs from older versions (async `params`, `proxy.ts` instead of middleware, no `next lint`).
> The bundled docs in `node_modules/next/dist/docs/` match the installed version.
>
> `prisma dev` is a lightweight local server; if it stops responding (e.g. "Server has closed the connection"),
> run `npx prisma dev stop destiny-dots` and `npm run db:dev` again.

## Routes

### Public (read live data from the database)

| Route | Page |
|---|---|
| `/` | Home — WebGL dot-globe hero, domains, stats, product preview, pricing, FAQ |
| `/about`, `/pricing`, `/contact` | About · Pricing (live prices) · Contact (email, phone/WhatsApp, Chennai) |
| `/resources` → `/resources/[domain]` → `/resources/[domain]/[path]` | Domain → path explorer with dot map and paywall |
| `/terms`, `/privacy`, `/refund-policy` | Draft legal pages |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth |

### Student (signed in)

| Route | Feature |
|---|---|
| `/onboarding`, `/onboarding/recommendations` | 60-second quiz → recommended paths |
| `/dashboard` | Continue learning, streak & activity heatmap, recommendations, updates |
| `/explore`, `/my-paths` | Browse & enrol · enrolled paths with progress |
| `/learn/[slug]`, `/learn/[slug]/[order]` | Path view · dot view (resources, bookmarks, checkpoint quiz, mark complete, unlock) |
| `/bookmarks`, `/achievements` | Saved resources · badges |
| `/certifications`, `/jobs`, `/updates` | Certification guides · job listings (save) · tech updates |
| `/resume` | Resume builder with live preview and PDF export |
| `/marketplace`, `/marketplace/[slug]` | Browse projects, in-app gallery and code browser, buy, review, report a problem |
| `/marketplace/sell`, `/marketplace/sell/[id]`, `/marketplace/purchases` | Seller onboarding (encrypted payout details), listings with uploads, earnings, payouts · purchases |
| `/billing`, `/invoices`, `/invoices/[number]` | Plan, unlocks, cancel · invoice list, printable invoice, PDF download |
| `/settings` | Profile, password, sessions, theme |

### Admin (`role = admin`)

| Route | Feature |
|---|---|
| `/admin` | Users, signups, MRR, revenue trend, top paths, drop-off heatmap |
| `/admin/paths`, `/admin/paths/[id]` | Path builder — drag-to-reorder dots, resources, checkpoint questions, publish |
| `/admin/resources` | Resource library, sample filter, dead-link checker |
| `/admin/users`, `/admin/users/[id]` | Filters, CSV export, grant/revoke access, role, suspend |
| `/admin/payments` | Transactions, refunds, coupons |
| `/admin/marketplace` | Review queue, listings, disputes, payouts, marketplace rules |
| `/admin/messages` | Contact-form inbox |
| `/admin/content/updates` · `/jobs` · `/certifications` · `/imports` | Content CMS (certification study resources by level) · auto-import sources and review queue |
| `/admin/settings` · `/admin/security` | Pricing, business details for invoices, integrations, samples, audit log · protections, admin sessions, sensitive actions |

## Payments

- Content is unlocked **only** by the verified Razorpay webhook (`/api/webhooks/razorpay`), never by the checkout callback.
- Access order: free dot → Pro plan → path unlock → dot unlock (`src/server/access.ts`).
- Without Razorpay keys, development builds show a **payment simulator** that runs the same fulfilment code as the webhook. It is disabled in production.

## Where things live

```
prisma/                   schema, migrations, seed (+ seed-content for sample content)
src/
  proxy.ts                redirects signed-out visitors away from app/admin routes
  app/(marketing)/        public pages
  app/(auth)/             auth pages
  app/(app)/              student app (sidebar shell)
  app/(onboarding)/       onboarding quiz
  app/admin/              admin panel
  app/api/                auth handler, Razorpay webhook, admin CSV export
  server/                 server-only data access, payments, stats, server actions
  lib/                    auth, db, session, email, nav, labels, pricing, site config, static domain metadata
  components/app|admin|marketing|resume|ui|…
```

## Before launch

Follow **[docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md)** — step-by-step instructions for Neon, Razorpay (test → live), Resend,
Cloudflare Turnstile and R2, Google sign-in, job APIs, Vercel deployment and a go-live checklist.

Production database setup: `npx prisma migrate deploy` then `npm run db:seed:production` (plans, prices and draft paths — no sample data).

Local notes:
- `prisma dev` accepts one connection at a time. If you see "Server has closed the connection", stop the dev server, run
  `npx prisma dev stop destiny-dots`, then `npm run db:dev` (retry once if it reports a lock) and restart.
- Because the local URL points at `template1`, `prisma migrate dev` can't create its shadow database. Create migrations with
  `npm run db:diff > prisma/migrations/<timestamp>_<name>/migration.sql` and apply with `npm run db:deploy`.
- Without keys, emails print to the dev server console, uploads go to `./.storage`, and payments use the simulator.
