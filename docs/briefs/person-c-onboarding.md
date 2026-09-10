# Brief: Onboarding & Engagement — EM_HRMS

**Repo:** https://github.com/EMotoradTech/EM_HRMS
**Your branch:** `feature/onboarding`
**Your folders:** `apps/onboarding/induction-portal`, `apps/onboarding/product-training`, `apps/onboarding/pulse-survey`

## Start here

1. Clone the repo, check out (or create) `feature/onboarding` off `main`.
2. Read `docs/PROGRAM-OVERVIEW.md` in the repo root — it defines the shared tech stack (Node.js/TypeScript, Express, PostgreSQL via Prisma, one DB per app, npm workspaces, Jest; React + Vite for anything with a UI, which applies to all three of your apps), repo structure, and git workflow.
3. Your work is the least dependent on the other two workstreams — you can build fully in parallel without waiting on anyone.

## Context

EMotorad (Indian EV bike/scooter manufacturer) wants new joiners to get everything they need — policies, culture, product knowledge — without HR having to spoon-feed it person by person, plus a lightweight, genuinely anonymous way to check in on how employees are doing. Current tooling: Keka (HRMS), Gmail. WhatsApp-based delivery is explicitly out of scope for this phase — engagement surveys go out over email (and/or embedded in Keka if its API allows, but don't assume that, build the email path as the baseline).

**Important, shared across all three of your apps:** the actual content (policy documents, culture book, company presentation, product specs, compliance calendar for HR events) has to come from HR — it's a content bottleneck, not an engineering one. Build each app so content is loaded from clearly-structured, easy-to-edit files (e.g. a `content/` folder of Markdown/JSON files, or simple admin CRUD screens) rather than hardcoded into the UI, so HR can fill in and update the real content later without needing a developer.

## What you're building

### 1. Induction Self-Serve Portal (`apps/onboarding/induction-portal`)

**Purpose:** a simplified, easy-to-read landing point for new joiners — the point they were told repeatedly needs to be simple, not a dense wall of text.

**Core capabilities:**
- A clean, navigable web UI (React) presenting: company policies, the culture book, the company presentation, and HR event/leave rules — each as its own clearly labeled section.
- Content for each section loaded from structured files/CRUD (see content note above) so it's editable without a redeploy once real content exists — start with clearly-marked placeholder content so the structure is demonstrably working.
- Support at least one rich content type beyond plain text (e.g. an embedded PDF viewer or slide viewer for the "company presentation," since that's realistically a PPT/PDF, not prose).
- A simple way to mark a new joiner's induction as "started"/"completed" per section, so HR can see who's actually gone through it — this is the seed of what could later become a real induction-completion tracker.

### 2. Product Training Module (`apps/onboarding/product-training`)

**Purpose:** basic knowledge of EMotorad's bikes/scooters for new joiners, so they understand what the company makes — delivered as part of induction, but build it as its own app/module (it may later be reused for other audiences, e.g. sales onboarding).

**Core capabilities:**
- Structured lessons/modules (again, content-driven from files, not hardcoded) — e.g. product lineup overview, key specs, basic positioning/FAQs.
- A simple way to present this content (could reuse the induction portal's viewer components) and track completion per new joiner.
- Optional but nice: a short quiz/check at the end of a module to confirm the content landed (a few multiple-choice questions per module is enough — don't over-engineer this).

### 3. Engagement & Pulse Survey (`apps/onboarding/pulse-survey`)

**Purpose:** a monthly detailed pulse survey and a lighter daily "mood check," both genuinely anonymous — this is a hard requirement, not a nice-to-have, and it shapes the data model from the start.

**Core capabilities:**
- Survey builder: define a set of questions (multiple choice, scale, free text) for the monthly pulse; a single quick question (e.g. an emoji/scale pick) for the daily mood check.
- Scheduling: the monthly pulse goes out automatically on a set cadence; the daily mood check goes out each morning. Delivery is via email (a link to the survey) — follow the pluggable-sender pattern (log/stub the actual send locally), don't build WhatsApp delivery.
- **Anonymity by design:** responses must not be traceable back to an individual. Concretely: don't store any identifying field (name, email, employee ID) alongside a response — store only what's needed to prevent duplicate submissions within a period (e.g. a one-way hashed token that can't be reversed to identify the person) and the response content itself. Design the schema this way from the start, not as an afterthought.
- Reporting: aggregate views only (e.g. "62% selected 'good' this week," average scores by question, trend over time) — never a per-response view that could be cross-referenced with who was sent the survey to re-identify someone.

## What to test

- Induction portal: sections render from the content files/CRUD correctly; marking a section "completed" persists and shows up in the per-joiner view.
- Product training: a module's completion state and (if built) quiz scoring work correctly.
- Pulse survey: **specifically test that no response record contains an identifying field** — this is the one piece of this brief where a test isn't optional, given how explicit the anonymity requirement was. Also test that the scheduler fires the monthly pulse and daily mood check on their respective cadences.

## What NOT to do

- Don't build actual final content (real policy text, real culture book, real product specs) — that's HR's deliverable; build the structure and use clear placeholder content.
- Don't build WhatsApp-based survey delivery — explicitly parked for a later phase.
- Don't store anything that could re-identify a pulse/mood-check respondent, even indirectly (e.g. don't log IP address alongside a response, don't timestamp so precisely combined with other fields that only one person could have submitted it at that moment if that's a risk in a small team/department).
