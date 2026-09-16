# Product spec — Destiny Dots

## What it is

A web app that helps students find the right resources for a chosen career path
across multiple tech domains. Admin creates career paths; each path has ordered
dots; each dot has resources (videos, links, docs, projects, quizzes).

```
Career Path (e.g. Data Analyst — Data & AI domain)
 └── Dot 1: Excel & spreadsheet fundamentals
      ├── Resource: YouTube playlist (free)
      ├── Resource: Practice workbook (gated)
      └── Checkpoint: mini quiz
 └── Dot 2: SQL basics
 └── Dot 3: Power BI / visualisation
 └── Dot N: ...
```

---

## Roles

| Role | Capabilities |
|---|---|
| Visitor | Browse paths, see first 1–2 dots free, view pricing, sign up |
| Student | Enrol, track progress, bookmark, access paid content, manage subscription |
| Admin | Build paths/dots/resources, manage users, view payments + analytics |

Single `users` table with `role` column. One login page routes by role.

---

## Feature list

### Career roadmaps (Phase 1 — core)
- Admin creates paths under a domain tag
- Each path has ordered dots; each dot has resources + optional checkpoint
- Free dots: visible to all logged-in users
- Gated dots: locked icon + paywall for non-entitled users
- Student sees full dot map; can mark dots complete; progress ring updates
- "Continue" button always points to next incomplete dot

### Project marketplace (Phase 2 only)
- Students list projects for sale; other students buy them
- Needs: seller onboarding (UPI/bank payout), commission cut, review/dispute
- Phase 1: nav item exists but shows "coming soon" state

### Global certifications (Phase 1)
- Curated guides for AWS, Google Cloud, Microsoft, CompTIA, CEH, OSCP, etc.
- Each cert: overview, exam format, resources, difficulty, estimated prep time
- A dot in a roadmap can point to a cert as its final milestone
- Strong natural link with Cybersecurity and Cloud domains

### Tech updates (Phase 1)
- Admin-posted blog/feed
- Students see feed filtered by their enrolled domain(s) or interest tags
- Only useful if team commits to a posting cadence (weekly target)

### Job listings (Phase 1)
- Admin-curated openings relevant to specific paths/domains
- Each listing links externally — no in-app application
- Filter by domain, experience level, remote/location
- Requires weekly update cadence to stay relevant

### Resume builder (Phase 1)
- Template-based: experience, education, skills, projects sections
- Live preview → export to PDF
- Subtle Destiny Dots branding on output
- High stickiness — students return to update
- One template at launch; more in Phase 2

---

## Data model

| Table | Key fields |
|---|---|
| users | id, email, password_hash, role, created_at |
| profiles | user_id, name, stage, domain_interests[], time_per_week |
| career_paths | id, domain_tag, title, slug, description, is_published |
| dots | id, path_id, order, title, description, is_free |
| resources | id, title, url, type (video/doc/project/quiz), is_premium |
| dot_resources | dot_id, resource_id, order |
| enrollments | user_id, path_id, enrolled_at |
| progress | user_id, dot_id, completed_at |
| bookmarks | user_id, resource_id |
| plans | id, name, interval (monthly/yearly), price_inr |
| prices | id, scope (plan/path/dot), scope_id, amount_inr |
| orders | id, user_id, price_id, razorpay_order_id, status |
| subscriptions | id, user_id, plan_id, razorpay_sub_id, status, valid_until |
| entitlements | id, user_id, scope, scope_id, source, valid_from, valid_until |
| coupons | id, code, discount_pct, max_uses, expires_at |
| audit_log | id, admin_id, action, target_type, target_id, created_at |

### Entitlements logic (access check order)
1. Is the dot free? → show it
2. Does the user have an active subscription in `entitlements`? → show it
3. Does the user have a one-off unlock for this dot or path? → show it
4. Otherwise → show paywall (subscribe or one-off unlock)

One-off purchases survive subscription cancellation. `source` column distinguishes them.

---

## Payments — Razorpay

### Order flow
1. Student clicks Unlock / Subscribe
2. Frontend → `/api/payments/create-order` with `price_id`
3. Backend creates Razorpay order, stores `orders` row as `pending`
4. Frontend opens Razorpay checkout (supports UPI, cards, netbanking)
5. Razorpay fires webhook → `/api/webhooks/razorpay`
6. Backend verifies signature → marks order `paid` → writes `entitlements` row
7. Student's next request passes the access check

**Never** unlock from the frontend success callback. Webhook only.

### Entitlement types
| Purchase | Entitlement written |
|---|---|
| Monthly/yearly subscription | scope=`plan`, source=`subscription` |
| One-off path unlock | scope=`path`, source=`one_time` |
| One-off dot unlock | scope=`dot`, source=`one_time` |

---

## Pricing strategy

| Tier | What you get | Suggested (INR) |
|---|---|---|
| Free | First 2–3 dots of every path | ₹0 |
| Dot unlock | One dot, forever | ₹99–199 |
| Path unlock | One full path, forever | ₹499–799 |
| Monthly sub | All paths, all dots | ₹299/mo |
| Yearly sub | All paths, all dots | ₹1,999/yr (~44% off) |

Make one-off prices unattractive vs subscription to push subs. Use one-off as
a low-friction entry point, then upsell: "you've bought 3 dots — a monthly sub
costs less."

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router + React 19 + TypeScript | SSR for SEO, server actions = no separate API |
| Database | PostgreSQL via Prisma | Type-safe, easy migrations |
| Auth | NextAuth.js | Email + Google OAuth out of the box |
| Payments | Razorpay | UPI support for India-first; Stripe lacks domestic UPI |
| Styling | Tailwind CSS 4 + shadcn/ui + next-themes (light/dark) | Fast, consistent, accessible |
| Deployment | Vercel + Neon or Supabase | Zero-config, serverless Postgres |
| PDF export | react-pdf or Puppeteer | For resume builder |
| Python | Background workers only | Link checker, recommendation job — not the API |

---

## Admin panel sections

- Overview dashboard: signups, active users, revenue, top paths, dot drop-off heatmap
- Path builder: create/reorder dots, set free vs gated, publish/draft toggle
- Resource library: central pool, tagged, reusable, dead-link checker
- User management: list, search, subscription status, grant/revoke access
- Payments: transactions, failed, refunds, coupon codes
- Content: tech updates (blog), job listings, cert guides

---

## Student dashboard sections

- Active paths with % complete ring
- "Continue learning" card (next incomplete dot)
- Bookmarks / saved resources
- Achievements / milestones cleared
- Subscription & billing (plan, renew, cancel)
- Profile & interests (editable — re-runs recommendations)

---

## Build phases

### Phase 1 (launch)
Auth → Admin CRUD → Student browse/learn → Gating + Razorpay →
Onboarding quiz → Resume builder → Job listings → Tech updates → Certifications

### Phase 2
Project marketplace · More resume templates · Mentor/cohort features ·
Student analytics (pace vs average) · Mobile app
