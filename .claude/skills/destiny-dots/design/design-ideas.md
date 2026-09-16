# Design ideas — Destiny Dots

## Visual identity

### Professional 3D direction (revised 2026-09-15 — replaces the cinematic/hybrid look)
Separate, complete light and dark palettes with a theme switcher (header icon
toggle, footer + mobile menu Light/Dark/System segmented control, command palette).
Hero: WebGL dot-globe that rotates to face each domain in turn, with glass
product cards floating over it. Elsewhere: CSS-3D orbiting domain icons,
isometric layer stack (About), domain emblem with orbit rings (domain pages),
product window that tilts flat on scroll, fanned 3D certificate cards, subtle
tilt/spotlight cards, border-beam highlight on Pro pricing.
Type: Geist Sans (semibold, tight tracking) + Geist Mono labels.
Rules: honour prefers-reduced-motion, pause WebGL off-screen, CSS fallback without
WebGL, never show fake stats or testimonials.

### Name metaphor
"Dots" = milestones on a career journey. Connecting the dots from where the
student is to where they want to be. The dot/circle motif should run through
the whole UI — progress rings, dot maps, milestone markers.

### Colour direction
- Primary: Deep purple or midnight blue (trust, tech, knowledge)
- Accent: Vibrant teal or electric indigo (energy, progress)
- Success: Soft green (completed dots)
- Locked: Muted gray with a lock icon
- Background: Near-white or very light gray (clean, readable)

### Typography
- Headings: Bold, modern sans-serif (Inter or Geist)
- Body: Regular weight, 16px minimum, generous line height (1.7)
- Code/tech labels: Monospace for dot identifiers or resource types

---

## Screen-by-screen layout ideas

### Landing page
```
[Nav: Logo | Browse | Pricing | Sign up | Log in]

[Hero]
  Headline: "Find your path. Connect the dots."
  Sub: "Structured career roadmaps with hand-picked resources for
        Cloud, AI, Cybersecurity, Blockchain & more."
  CTA: [Get started free]  [Browse paths →]

[Domain grid — 5–6 cards with icon + label]
  Cloud  |  AI & Data  |  Cybersecurity  |  Blockchain  |  Web Dev  |  +more

[How it works — 3 steps]
  1. Pick your domain
  2. Follow the dots
  3. Land your role

[Sample path preview — interactive dot map]
  Show a real path (Data Analyst) with 5–6 dots, first 2 open, rest locked

[Pricing section]
  Free | Pay-per-dot | Subscribe

[Footer]
```

### Student dashboard
```
[Top nav: Logo | Browse | Certifications | Jobs | Updates | Resume | Avatar]

[Left sidebar or top tabs]
  My paths | Bookmarks | Achievements | Billing

[Main area]
  ┌─────────────────────────────────────┐
  │  Continue learning                  │
  │  [Path name] → [Dot name]  [→ Go]  │
  └─────────────────────────────────────┘

  My active paths
  ┌──────────────┐ ┌──────────────┐
  │ [Ring 65%]  │ │ [Ring 30%]  │
  │ Data Analyst│ │ AWS Arch.   │
  │ Dot 6 of 10 │ │ Dot 3 of 9  │
  └──────────────┘ └──────────────┘

  Recommended paths (based on your interests)
  [Card]  [Card]  [Card]
```

### Path detail page
```
[Breadcrumb: Browse > Data & AI > Data Analyst]

[Path header]
  Title: Data Analyst
  Domain badge: Data & AI
  Estimated time: 4–6 months
  Enrolled: [Enrol free]

[Dot map — vertical timeline]
  ● Dot 1: Excel fundamentals         [OPEN]    [✓ Complete]
  ● Dot 2: SQL basics                 [OPEN]    [→ Continue]
  🔒 Dot 3: Python for data           [LOCKED]
  🔒 Dot 4: Power BI / dashboards     [LOCKED]
  🔒 Dot 5: Statistics essentials     [LOCKED]
  ...

[Paywall banner — sticky at bottom or inline]
  "Unlock all dots — ₹299/month or ₹1,999/year"
  [Subscribe →]   [Unlock this dot — ₹149]
```

### Inside a dot
```
[Breadcrumb: Data Analyst > Dot 2: SQL basics]

[Dot title + description]

[Resource list]
  ▶ [Free]    SQL for beginners — YouTube (2h 30m)
  📄 [Free]    SQL cheat sheet — PDF download
  ▶ [Premium] Advanced SQL queries — Udemy (4h)
  🧩 [Premium] Practice set — 50 exercises

[Checkpoint]
  "Ready to test yourself?"
  [Take the quiz →]

[Bottom CTA]
  [← Prev dot]    [Mark as complete ✓]    [Next dot →]
```

### Resume builder
```
[Two-panel layout]

[Left: Form]
  Personal info
  Work experience  [+ Add]
  Education        [+ Add]
  Skills           [tag input]
  Projects         [+ Add]
  Certifications   [+ Add]

[Right: Live preview]
  [Rendered resume template]
  [Export to PDF button]
```

### Admin path builder
```
[Left: Path list / create new]

[Right: Dot editor]
  Path title: [________________]
  Domain: [Dropdown]
  Status: Draft / Published [toggle]

  Dots (drag to reorder):
  ┌────────────────────────────────────┐
  │ ≡  Dot 1: Excel fundamentals  FREE│ [Edit] [Delete]
  ├────────────────────────────────────┤
  │ ≡  Dot 2: SQL basics         FREE│ [Edit] [Delete]
  ├────────────────────────────────────┤
  │ ≡  Dot 3: Python for data  LOCKED│ [Edit] [Delete]
  └────────────────────────────────────┘
  [+ Add dot]
```

---

## Component ideas

### Dot map component
The core visual — a vertical (or horizontal on wide screens) timeline of dots.
Each dot is a circle + label. Colour encodes state:
- ✅ Green filled circle = completed
- 🔵 Blue filled circle = in progress / current
- ⚪ Gray circle = locked
- 🔒 Lock overlay on gray = gated (not just incomplete — requires payment)

The dot map should feel like a literal roadmap. Consider thin connecting lines
between dots, like a subway line.

### Progress ring
Used on dashboard cards for each enrolled path. A circular SVG ring showing
% complete. Center text shows "6/10 dots" or "65%". Colour matches domain
accent colour.

### Domain badge
Pill-shaped tag with domain colour: e.g. purple for Cyber, teal for Cloud.
Used on path cards, dot pages, job listings, cert guides.

### Resource card
Each resource in a dot is a card:
- Left: type icon (video / doc / project / quiz)
- Center: title + estimated time
- Right: FREE badge (green) or LOCKED badge (gray with lock)
- Full card is clickable — opens resource or shows paywall

### Paywall modal
Triggered when clicking a locked resource or dot:
```
┌──────────────────────────────────────┐
│  Unlock this dot                     │
│                                      │
│  "Python for data" — Dot 3           │
│                                      │
│  [Subscribe — ₹299/mo]  ←recommended│
│  [Unlock just this dot — ₹149]       │
│                                      │
│  Or unlock the full path — ₹599      │
└──────────────────────────────────────┘
```
The subscription option should be visually dominant (larger, highlighted).

---

## Mobile considerations

Web app first, but design mobile-friendly from day one:
- Bottom tab nav on mobile (Home, Browse, Resume, Profile)
- Dot map becomes a vertical scroll on mobile (already natural)
- Resource cards stack to full width
- Paywall modal becomes a bottom sheet

---

## Figma suggestions

When designing in Figma, create components for:
1. Dot (3 states: complete, current, locked)
2. Path card (for browse/dashboard)
3. Resource card (free vs gated)
4. Domain badge (per domain colour)
5. Progress ring
6. Paywall modal / bottom sheet

Use an 8px grid. Max content width: 1200px desktop, full-width mobile.
