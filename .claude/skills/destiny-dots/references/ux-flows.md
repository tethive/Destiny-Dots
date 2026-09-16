# UX flows — Destiny Dots

## Core principle
The platform has two completely separate experiences after login:
- **Student** → learning-focused dashboard
- **Admin** → content & operations panel

One login page. Role detected server-side. Redirect based on `users.role`.

---

## Visitor flow (not logged in)

```
Landing page
  ├── Browse career domains (read-only, first 1-2 dots visible)
  ├── See pricing page
  ├── Sign up → onboarding quiz → dashboard
  └── Log in → dashboard
```

Landing page must show:
- Value prop headline
- Domain browsing (Cloud, Cybersecurity, AI, Blockchain, Web Dev...)
- Sample path preview (show the dot metaphor visually)
- Pricing tiers
- Social proof / testimonials (post-launch)

---

## Student flow — full journey

### Step 1: Sign up
- Email + password OR Google OAuth (NextAuth)
- Email verification optional at launch

### Step 2: Onboarding quiz (3–4 screens)
- Current stage: Student / Fresh graduate / Working professional
- Field of interest: select domain(s) — AI, Cloud, Cyber, Blockchain, Web Dev
- Time available per week: <5h / 5–10h / 10h+
- Goal timeline: 3 months / 6 months / 1 year / Just exploring

### Step 3: Path recommendations
- 2–3 suggested career paths based on quiz answers
- Browse all paths button (full catalogue)
- Can skip quiz and go straight to browse

### Step 4: Path detail page
- Full dot roadmap visible (all dots shown)
- First 2–3 dots: unlocked, can enter immediately
- Remaining dots: locked with a padlock icon
- Paywall banner: "Subscribe to unlock all" + "Unlock just this dot"
- Enrol button (free action, starts tracking progress)

### Step 5: Inside a dot
- Dot title + description
- Resource list: videos, links, docs, projects, quizzes
- Free resources: open immediately
- Premium resources: gated if user has no entitlement
- Checkpoint / quiz at the end (optional per dot)
- Mark as complete → progress updates → "Next dot" CTA

### Step 6: Payment (when hitting a locked dot/resource)
- Show paywall modal
- Option A: Subscribe (monthly/yearly) — unlocks everything
- Option B: Unlock this dot/path — one-off purchase
- Razorpay checkout opens
- On webhook confirmation → entitlement written → content unlocks

### Step 7: Ongoing — Student dashboard
Sections:
- Active paths with progress ring (% complete)
- "Continue learning" card — next incomplete dot
- Bookmarks / saved resources
- Achievements / completed dots
- Subscription & billing status
- Profile & interests (edit re-runs recommendations)

---

## Admin flow

### Login
- Same login page as student
- Role = admin → redirect to `/admin/dashboard`

### Admin dashboard (overview)
- Total signups (this week / month)
- Active subscribers
- Revenue (MRR, total)
- Top 5 paths by enrolment
- Drop-off heatmap: which dot do students quit at per path

### Path builder
1. Create new path → choose domain, title, slug, description
2. Add dots → drag to reorder, set title, description, free vs gated
3. Inside each dot → add resources from library or create new
4. Set dot checkpoint (optional quiz)
5. Publish toggle → draft until ready

### Resource library
- Central pool of all resources (URL, title, type, tags)
- Tag by domain, topic, type
- Reuse across multiple dots
- Dead-link checker (scheduled Python worker)

### User management
- List all students with search/filter
- See subscription status, enrolled paths, last active
- Manual grant/revoke access
- Export CSV

### Payments panel
- All transactions with status
- Failed payment alerts
- Refund flow
- Coupon code generator (% off, fixed, per-path, global)

### Content management
- Tech updates: create / edit / publish blog posts, tag by domain
- Job listings: add listing, link to external URL, tag by domain + level
- Certifications: create cert guide, link to dots/paths

---

## Navigation structure

### Public (before login) nav — decided 2026-09-15
```
Home · About · Resources (mega menu of 11 domains) · Pricing · Contact Us
+ Search (Ctrl+K / "/") · Log in · Get started
Mobile: full-screen menu + bottom dock (Home, About, Resources, Pricing, Contact)
Resources: /resources → /resources/[domain] → /resources/[domain]/[path]
```

### Student nav
```
Home (dashboard)
├── My paths
├── Browse (all domains + search)
├── Certifications
├── Job listings
├── Tech updates
├── Resume builder
├── Project marketplace (Phase 2 — "coming soon")
└── Profile / billing
```

### Admin nav
```
Overview
├── Paths & dots
├── Resource library
├── Users
├── Payments
├── Content
│   ├── Tech updates
│   ├── Job listings
│   └── Certifications
└── Settings
```

---

## Key UX principles

1. **The dot map is always fully visible** — students see the whole path upfront, locked dots included. Transparency builds trust and motivates completion.

2. **Progress is always visible** — dashboard ring, dot checkmarks, streak indicators. Make progress feel real.

3. **Paywall appears at the moment of desire** — not on a generic pricing page. The student wants a specific dot → show the paywall in context → higher conversion.

4. **One-off before subscription** — the one-off unlock is the low-friction entry. Once a student buys 3 dots, the "subscribe and save" upsell is obvious.

5. **Continue button is always one click away** — the dashboard's primary CTA is always "continue where you left off." Never make the student hunt for what to do next.

6. **Admin can publish/draft** — content is never live until explicitly published. This prevents accidental incomplete paths from showing to students.
