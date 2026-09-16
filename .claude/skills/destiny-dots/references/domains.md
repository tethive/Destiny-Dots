# Domains — Destiny Dots

## Architecture

Domains are a **tag on career paths** — not a separate data model.
`career_paths.domain_tag` is a string enum. No special code needed for
multi-domain support; the admin just assigns a domain when creating a path.

```
Platform (slug → paths)
 ├── cybersecurity      SOC Analyst · Security Engineer · GRC Analyst
 ├── ethical-hacking    Penetration Tester · Bug Bounty Hunter
 ├── ai-ml              ML Engineer · AI/LLM Engineer · (Computer Vision — planned)
 ├── cloud-computing    AWS Solutions Architect · Azure Administrator · Google Cloud Engineer · DevOps/Platform Engineer
 ├── data-engineering   Data Engineer · Analytics Engineer
 ├── data-analysis      Data Analyst · Business Analyst
 ├── blockchain         Solidity Developer · Web3 Frontend Developer · (Smart Contract Auditor — planned)
 ├── full-stack         Full Stack Developer (MERN) · Frontend Developer · (Backend Developer — planned)
 ├── iot                IoT Developer · (Industrial IoT Engineer — planned)
 ├── 5g-technology      5G Network Engineer · (Open RAN Engineer — planned)
 └── ar-vr              AR/VR Developer · (WebXR Developer — planned)
```

Source of truth in code: `src/lib/catalog.ts` (content) and `src/components/domain.tsx`
(colour + icon per domain).

---

## Launch domain strategy

**Decision (2026-09-15): launch all 11 domains**, each with at least one complete
path; extra paths marked "in the works" until published. This overrides the
earlier recommendation of launching with only Data & AI + Cybersecurity + Cloud.

Quality bar still applies: a published path needs a full dot sequence (8–10 dots)
with real resources. Domains with thinner job markets (Blockchain, 5G, AR/VR)
should prioritise one excellent path over several shallow ones.

---

## Domain detail

### Data & AI
Paths: Data Analyst, Business Analyst, ML Engineer, Data Engineer, AI/LLM Engineer
Key certifications: Google Data Analytics, Microsoft DP-900/DP-203, AWS Data, Databricks
Content caution: AI/ML moves fast — resource links go stale in months. Build a
link-checker and schedule quarterly content reviews.

### Cybersecurity
Paths: SOC Analyst (Level 1/2), Penetration Tester, Security Engineer, GRC Analyst
Key certifications: CompTIA Security+, CEH, OSCP, CISSP, ISO 27001
Cert connection: Most cyber paths end in a certification. The cert guides feature
is especially powerful here — a dot can literally be "Get CompTIA Security+".

### Cloud
Paths: AWS Solutions Architect, GCP Engineer, Azure Admin, DevOps/Platform Engineer
Key certifications: AWS SAA-C03, GCP ACE/PDE, AZ-900/AZ-104
Good for job listings: Cloud roles have the most remote-first openings.

### Blockchain
Paths: Solidity Developer, Web3 Frontend, Smart Contract Auditor
Note: Niche market, thinner job listings. Launch only if you have genuine
expertise to create good content. Don't fake it — students will notice.

### Web Development
Paths: Frontend (React), Backend (Node/Python), Full Stack, Mobile (React Native)
Broad audience but also the most competitive space (freeCodeCamp, The Odin
Project etc. are free). Differentiate by: curating better resources, not just
aggregating, and building clear job-oriented paths rather than generic tutorials.

---

## How domains affect the product

### Onboarding quiz
The "field of interest" question maps directly to domain tags. Student picks
domains → quiz result filters recommended paths to those domains.

### Browse / search
Domain filter is the primary browse dimension. Student sees:
- All domains grid (homepage browse)
- Domain page showing all paths in that domain
- Path page showing all dots in that path

### Job listings
Each listing is tagged with a domain. Student on a cybersecurity path sees
cybersecurity job listings. Cross-domain listings (DevSecOps = Cyber + Cloud)
can carry multiple tags.

### Tech updates
Blog posts are tagged by domain. Student's feed prioritises posts from their
enrolled domains.

### Certifications
Each cert guide is tagged by domain. The certifications browse page is
filterable by domain. Cert guides also link to relevant paths.

---

## Adding a new domain (admin process)

1. Admin adds new `domain_tag` value to the system config (or just uses it
   as a string — no migration needed if it's a free-text tag)
2. Admin creates paths under that domain tag
3. Domain automatically appears in browse pages and quiz options
4. No code changes required for adding new domains

This is intentional — the platform should grow its domain catalogue over time
without developer intervention.
