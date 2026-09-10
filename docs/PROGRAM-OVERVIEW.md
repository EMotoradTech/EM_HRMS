# EM_HRMS — Program Overview

This document is the shared reference for everyone building in this repo. Read this first, then read your own brief (`docs/briefs/person-a-foundations.md`, `person-b-hiring.md`, or `person-c-onboarding.md`).

## What this is

EMotorad is building a set of internal HR automation tools — covering hiring, onboarding, document/approval workflows, employee engagement, compliance, and asset tracking. The full use-case list and phased rationale lives in `docs/HR-AUTOMATION-PLAN.md` (add that file to the repo alongside this one). Three people are building three workstreams in parallel, all landing in this one repo, to be reviewed and merged by whoever is coordinating this build (Kush, unless delegated).

**Scope of this round:** these three workstreams cover the foundational infrastructure, hiring, onboarding, exit, and engagement pieces of the program. The HR analytics dashboard, vendor coordination, and the consultants/international-team platform are deliberately **not** part of this round — they were sequenced last in the underlying plan because they depend on data these systems will generate once live, and they'll be assigned in a later round.

Company context: EMotorad is an Indian electric bike/scooter manufacturer. Current tooling: **Keka** (HRMS, admin access confirmed, API entitlement to be verified), **Gmail**, and **Naukri** (paid job-portal access). No existing ATS, LMS, or engagement platform. WhatsApp-based automation and LinkedIn sourcing are explicitly **out of scope** for this phase.

## Repo

`https://github.com/EMotoradTech/EM_HRMS`

This is a **monorepo**. Structure:

```
EM_HRMS/
  docs/
    PROGRAM-OVERVIEW.md          (this file)
    HR-AUTOMATION-PLAN.md        (full use-case plan and phasing)
    briefs/
      person-a-foundations.md
      person-b-hiring.md
      person-c-onboarding.md
    contracts/
      document-engine-api.md     (Person A publishes this — the interface B and C build against)
  apps/
    foundations/
      document-engine/
      hr-vault/
      compliance-reminders/
      asset-management/
      exit-formalities/
    hiring/
      resume-screening/
      bgv-tracking/
      offer-letters/
    onboarding/
      induction-portal/
      product-training/
      pulse-survey/
  package.json                    (npm workspaces root)
  docker-compose.yml               (single local Postgres service, hosting one database per leaf app)
```

Each leaf folder under `apps/` is its own small app with its own `package.json`, `.env.example`, `prisma/schema.prisma`, `src/`, and `tests/`. Keep them independently runnable — don't reach into another app's folder or database from your code. Cross-app calls happen only over HTTP, against the documented contract (see below).

## Tech stack (everyone uses this — no exceptions, so the code merges cleanly)

- **Language:** TypeScript throughout (backend and frontend).
- **Backend:** Node.js 20+ with Express.
- **Frontend (only where a use case needs a UI):** React + Vite, TypeScript.
- **Database:** PostgreSQL. **Every leaf app under `apps/` gets its own database**, not just one database per person — e.g. `em_hrms_document_engine`, `em_hrms_hr_vault`, `em_hrms_resume_screening`, `em_hrms_pulse_survey`, and so on, one per folder. All of these run inside a single shared local Postgres service (defined in the root `docker-compose.yml`) — one server, many databases — so nobody needs to install or run their own database software. This keeps each app's Prisma schema fully isolated during parallel build, matching the "each leaf app is independently runnable" rule above — no migration conflicts, ever, between any two apps, including two apps built by the same person. Unifying/relating data across apps is a deliberate later step, not something to solve now.
- **ORM:** Prisma, one schema per app.
- **Package manager:** npm, using npm workspaces from the repo root.
- **Testing:** Jest. Every app needs tests for its core logic before it's pushed for review — not full coverage, but the critical paths (e.g. "ranking produces the expected order for a known input," "approval routes to the right approver").
- **Env vars:** every app has a `.env.example` checked in (no real secrets ever committed) and reads config via `.env` locally.

## Cross-app contract

Person A's Document & Approval Workflow Engine (in `apps/foundations/document-engine`) is a dependency for Person B's offer-letter automation and, later, exit formalities. Person A publishes the contract early in `docs/contracts/document-engine-api.md` — endpoints, request/response shapes, auth. Person B builds against a **mock** of that contract until the real engine is ready, then swaps the mock for the real HTTP calls. This lets both work in parallel without blocking each other. Nobody should be blocked waiting on someone else's app to be "done" — build against the documented contract, integrate at the end.

## Git workflow

- Default branch: `main` (confirm this matches the repo — if it's `master`, use that instead).
- One branch per person, named after their workstream: `feature/foundations`, `feature/hiring`, `feature/onboarding`.
- Commit and push to your branch as you go — don't wait until everything is done to push once.
- Open a PR to `main` once a sub-app (e.g. `apps/hiring/resume-screening`) is functionally complete and tested locally. Smaller, more frequent PRs (one per sub-app) are easier to review than one giant PR at the end — prefer that.
- PR description should state: what the sub-app does, how to run it locally, what's mocked vs. real, and what's still open.
- Whoever is coordinating the build reviews and merges — don't merge your own PRs.

## Definition of done (per sub-app, before opening a PR)

1. Runs locally end-to-end following its own README.
2. Has a `.env.example` with every required variable documented.
3. Has tests covering the core logic, and they pass (`npm test`).
4. Has a short `README.md` in its own folder: what it does, how to run it, how to test it, what's stubbed/mocked and why.
5. Doesn't hardcode secrets, doesn't reach into another app's database.
