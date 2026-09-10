# Brief: Hiring Pipeline — EM_HRMS

**Repo:** https://github.com/EMotoradTech/EM_HRMS
**Your branch:** `feature/hiring`
**Your folders:** `apps/hiring/resume-screening`, `apps/hiring/bgv-tracking`, `apps/hiring/offer-letters`

## Start here

1. Clone the repo, check out (or create) `feature/hiring` off `main`.
2. Read `docs/PROGRAM-OVERVIEW.md` in the repo root — it defines the shared tech stack (Node.js/TypeScript, Express, PostgreSQL via Prisma, one DB per app, npm workspaces, Jest), repo structure, and git workflow. Everything below assumes that stack.
3. Check `docs/contracts/document-engine-api.md` — this is the interface Person A (foundations) is building, which your offer-letter automation depends on. **It may not exist yet or may be a draft when you start** — in that case, build against your own mock matching the description in this brief, and swap it for the real thing once the contract/implementation lands. Don't block waiting on it.

## Context

EMotorad (Indian EV bike/scooter manufacturer) hires roughly 20-25 people a month with ~30 roles open at any time — this is the highest-volume, most manual part of the whole HR automation program, so it's the priority workstream. Current sourcing tool: **Naukri (paid access confirmed)**. LinkedIn and WhatsApp are explicitly out of scope. No BGV vendor is in place — HR wants an in-house workflow tool, not a verification engine (see below, this distinction matters).

## What you're building

### 1. Resume Screening & Ranking (`apps/hiring/resume-screening`)

**Purpose:** replace manual one-by-one resume review. Take a job description, take a set of candidate profiles/resumes, match and rank them against the JD's stated parameters, and produce a ranked shortlist for stakeholders.

**Important — validate before deep-building:** Naukri does not appear to expose a simple, open self-serve API for pulling resumes to an arbitrary third-party integration (other ATS platforms integrate with Naukri through a formal partner/API program, not an open endpoint). **Your first task is to check what's actually available**: log into the company's Naukri recruiter account and look for an API/integration option (Naukri RMS, "Talent Cloud," or similar), or check if Naukri needs to be contacted directly for API/partner access. Don't assume it exists — this determines which of the two paths below you build.

- **If Naukri API/export access is available:** pull candidate profiles for a given JD automatically.
- **If not (fallback, build this regardless as the baseline):** let HR bulk-upload resumes (PDF/DOCX) exported manually from Naukri, and run the matching/ranking on those. This still removes the one-by-one manual review even without the auto-pull.

**Core capabilities (needed either way):**
- Store a JD with its stated requirements broken into structured parameters (skills, years of experience, qualifications, etc. — parse these out of free-text JD input, or accept them as structured input if that's simpler to start).
- Parse resume text (PDF/DOCX → text) and extract comparable fields.
- Score/rank each candidate against the JD's parameters with a transparent, explainable score (not a black box — HR needs to see *why* someone ranked where they did).
- Output a ranked shortlist, and a way to "send" it to stakeholders (email stub is fine, following the pluggable-sender pattern — actual delivery isn't the focus).

### 2. Background Verification Tracking (`apps/hiring/bgv-tracking`)

**Purpose:** NOT a verification engine — actual BGV checks (education, employment history, criminal record, address) require external verification agencies with data access nobody builds in-house. What's being asked for is a **workflow/status tracker** that sweetens the existing manual process:

- Candidate submits required documents for verification (upload).
- Track each check type (education, employment, address, etc.) with a status: pending / in-progress / verified / flagged / failed.
- Notify the relevant stakeholder when all checks for a candidate are complete.
- A simple dashboard/list view: all candidates currently in BGV, and their status per check.

Keep this honest in scope — don't try to actually perform verification.

### 3. Offer & Appointment Letter Automation (`apps/hiring/offer-letters`)

**Purpose:** once a candidate is selected, generate their offer/appointment letter, route it through internal approvals, send it to the candidate, and collect their signature and any required documents — with no manual HR follow-up.

**This is built on top of Person A's document-engine, not from scratch:**
- Call the document-engine's API (per `docs/contracts/document-engine-api.md`, or your mock of it) to create a document instance from the offer-letter/appointment-letter template with this candidate's data.
- Trigger the approval chain and wait for it to clear.
- Once approved, the document-engine handles sending + signature capture — your app's job is to kick this off at the right point in the hiring flow (i.e., when a candidate is marked "selected") and track the candidate's overall status (offer generated → pending approval → sent → signed → onboarding-ready).
- Surface a clear status view: which candidates are where in this pipeline.

## What to test

- Resume screening: ranking a known small set of resumes against a known JD produces a sensible, reproducible order (write a test with fixed inputs and assert on the expected ranking).
- BGV tracking: a candidate's overall status only flips to "complete" once every individual check is verified; a "flagged" check blocks completion.
- Offer letters: the flow correctly calls the document-engine mock/API with the right template and data; a candidate's status updates correctly as the document engine reports each state change.

## What NOT to do

- Don't build the document-engine itself — call it (or your mock of it), don't reimplement it.
- Don't try to build real BGV verification — this is a tracker, not a verification service.
- Don't build LinkedIn integration or WhatsApp features — explicitly out of scope for this phase.
- Don't skip the Naukri access-validation step — building the auto-pull path against an API that doesn't actually exist wastes the most time of anything in this brief.
