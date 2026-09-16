---
name: destiny-dots
description: >
  Full product context for Destiny Dots — a student career-resource web app
  covering multiple tech domains (AI, Cloud, Cybersecurity, Blockchain, Web Dev,
  and more). Use this skill whenever the user mentions Destiny Dots, asks about
  the app's design, UX flow, features, screens, data model, payments, domains,
  or tech stack. Also trigger when the user asks to plan, build, or extend any
  part of the platform: student dashboard, admin panel, career roadmaps, project
  marketplace, resume builder, job listings, certifications, tech updates feed,
  or multi-domain browsing. Trigger even for partial mentions like "the roadmap
  feature", "the marketplace", "the resume builder", "our app", or any domain
  name (e.g. "the cybersecurity path", "the AI section").
---

# Destiny Dots — product skill

Destiny Dots helps students find and follow the right resources for their chosen
career path across multiple tech domains. Core metaphor: a **Career Path** is a
sequence of **Dots** (milestones), and each Dot holds **Resources**.

## Reference files — read these before answering

| File | Read when... |
|---|---|
| `references/product-spec.md` | Questions about features, screens, data model, pricing, payments, build order |
| `references/ux-flows.md` | Questions about user journeys, navigation, onboarding, what happens after login |
| `references/domains.md` | Questions about which tech domains are covered, launch strategy, domain structure |

## Quick orientation

| Area | What it is |
|---|---|
| Career roadmaps | Core product — dot-by-dot paths per domain |
| Project marketplace | Students buy/sell projects (live — see decisions) |
| Global certifications | Cert guides tied to path milestones |
| Tech updates | Curated news/blog feed |
| Job listings | Admin-curated openings per domain |
| Resume builder | Template-based, export to PDF |
| Student dashboard | Progress, recommendations, bookmarks |
| Admin panel | Content CMS, users, payments, analytics |

## Decisions already locked — do not re-open

- **Stack** (upgraded 2026-09-15): Next.js 16 App Router (Turbopack) + React 19 +
  TypeScript + Tailwind CSS 4 + shadcn/ui (radix-nova) + motion + React Three
  Fiber 9 / drei 10 + next-themes + **PostgreSQL via Prisma 7** (local `prisma dev`
  now, Neon/Supabase later) + **Better Auth** (email/password + Google; admin
  plugin for roles/bans — chosen over Auth.js) + Razorpay + Resend → Vercel.
  Next 16: `params` are async, `middleware.ts` is now `proxy.ts`, `next lint`
  removed (use `eslint`), read `node_modules/next/dist/docs/` before API changes.
- **Admins**: emails listed in `ADMIN_EMAILS` (info.destinydots@gmail.com) are
  promoted on sign-up; admins can promote others from /admin/users/[id].
- **Contact**: info.destinydots@gmail.com · +91 72009 66468 (also WhatsApp) ·
  Chennai, Tamil Nadu, India. Social links hidden until provided.
- **Dev content**: seeded sample jobs/updates/cert guides/resources are flagged
  `isSample` and must be replaced before launch (admin → Settings can purge).
- **Payments in dev**: without Razorpay keys a dev-only simulator calls the same
  server fulfilment functions the webhook uses; it is disabled in production.
- **Auth**: Single `users` table, `role` column (student / admin).
  One login page, role-based redirect. No separate login URLs.
- **Content**: Admin/team only. No community submissions in Phase 1.
- **Payments**: Razorpay (UPI support for India-first audience)
- **Pricing**: Hybrid — monthly/yearly subscription + one-off per-dot/path unlock
- **Domains** (decided 2026-09-15, overrides the earlier 3-domain launch plan):
  11 domains live at launch — Cybersecurity, Ethical Hacking, AI & ML, Cloud
  Computing, Data Engineering, Data Analysis, Blockchain, Full Stack Development,
  IoT, 5G Technology, AR/VR. Still a tag on `career_paths` (`domain_tag`).
- **Public pages / nav**: Home, About, Resources, Pricing, Contact Us (+ Log in /
  Get started). "Resources" = domain → path → dot explorer at `/resources`
  (`/browse` redirects there). Ctrl+K command palette; mobile bottom dock.
- **Visual direction** (revised 2026-09-15): Professional SaaS look with a
  user-selectable **Light / Dark / System theme** (next-themes, class strategy) —
  no hybrid dark bands. Brand violet accent on neutral surfaces, Geist type.
  3D: theme-aware WebGL dot-globe hero (domains as nodes, arcs, atmosphere),
  CSS-3D orbiting domain icons, isometric stacks, scroll-tilted product window,
  subtle tilt + spotlight cards, animated border beam on featured cards.
  Always respect prefers-reduced-motion and provide a non-WebGL fallback.
- **Project marketplace** (enabled 2026-09-15, user decision): students sell project ZIPs; admin review before listing;
  **manual payouts** (admin pays UPI/bank, marks paid with UTR); **10% commission**; 7-day buyer protection/disputes;
  buyers browse files in-app **and may download** the ZIP. Learning resources stay view-only (in-app viewer, no downloads).
- **Invoices**: not GST-registered yet → bills of supply; add GSTIN in Admin → Settings to switch to tax invoices.
- **Imports**: jobs (Adzuna, Jooble, Remotive) + news (DEV, Hacker News, RSS) via Vercel Cron into an admin review queue;
  only titles/excerpts/links stored (no full articles).
- **Hosting plan**: Vercel + Neon + Resend + Cloudflare Turnstile + Cloudflare R2. Setup guide: docs/PRODUCTION_SETUP.md.

## Critical payment rule

**Never unlock content from the frontend callback.**
Always wait for the Razorpay server-side webhook before writing to `entitlements`.

## Build order (do not skip ahead)

1. Auth + role dashboards (empty shells)
2. Admin: path / dot / resource CRUD
3. Student: browse, enrol, view, mark complete (all free)
4. Entitlement gating + Razorpay
5. Onboarding quiz + recommendations
6. Analytics, coupons, drop-off tracking

Status (2026-09-15): steps 1–6 built, plus marketplace, invoices, emails, imports, security hardening — see README.
