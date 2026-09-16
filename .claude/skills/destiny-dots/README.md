# Destiny Dots — Claude skill package

This package contains everything Claude Code needs to assist with building
Destiny Dots, plus design reference material for the team.

---

## Contents

```
destiny-dots/
├── README.md                        ← you are here
├── skill/
│   ├── SKILL.md                     ← Claude Code skill entry point
│   └── references/
│       ├── product-spec.md          ← full feature list, data model, payments
│       ├── ux-flows.md              ← user journeys, navigation, screen logic
│       └── domains.md               ← domain structure, launch strategy
└── design/
    └── design-ideas.md              ← screen layouts, components, visual direction
```

---

## How to install the skill in Claude Code

1. Open Claude Code in your terminal
2. Run: `/skills add destiny-dots.skill`
3. Claude Code will now have full product context in every session

Once installed, Claude Code will automatically read the right reference file
whenever you ask about Destiny Dots — features, screens, code, flows, or design.

---

## How to use it

Just talk to Claude Code naturally. Examples:

- "Build the Prisma schema for Destiny Dots"
- "Create the student dashboard page"
- "How should we handle the paywall for a locked dot?"
- "Write the Razorpay webhook handler"
- "What domains should we launch with?"
- "Design the onboarding quiz flow"
- "Build the admin path builder UI"

Claude Code will read the skill and answer with full context — no need to
re-explain the project each time.

---

## How to keep it updated

As you make new decisions (pick a resume template library, settle on job listing
logic, add a new domain), tell Claude Code:

> "Update the Destiny Dots skill — we decided to use react-pdf for the resume builder"

Claude Code will update the relevant reference file. The skill grows with the project.

---

## Design reference (for Figma / UI work)

See `design/design-ideas.md` for:
- Landing page layout
- Student dashboard layout
- Path detail page (dot map)
- Inside a dot (resource list)
- Resume builder (two-panel)
- Admin path builder
- Component ideas (dot states, progress ring, paywall modal)
- Mobile considerations
- Figma component suggestions

---

## Key decisions (already locked)

| Decision | Choice |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Database | PostgreSQL via Prisma |
| Auth | NextAuth.js (email + Google) |
| Payments | Razorpay |
| Styling | Tailwind + shadcn/ui |
| Hosting | Vercel + Neon/Supabase |
| Content creation | Admin/team only |
| Launch domains | Data & AI, Cybersecurity, Cloud |
| Phase 2 | Project marketplace |

---

Built from the Destiny Dots planning conversation — September 2026.
