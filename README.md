# EM_HRMS

EMotorad internal HR automation monorepo. See [`docs/PROGRAM-OVERVIEW.md`](docs/PROGRAM-OVERVIEW.md) for the shared reference (tech stack, repo structure, git workflow) and [`docs/HR-AUTOMATION-PLAN.md`](docs/HR-AUTOMATION-PLAN.md) for the full phased plan.

This round covers three parallel workstreams, now merged into `main`:

- `apps/foundations/*` — document & approval workflow engine, HR vault, compliance reminders, asset management, exit formalities.
- `apps/hiring/*` — resume screening & ranking, background verification tracking, offer/appointment letter automation.
- `apps/onboarding/*` — induction portal, product training, pulse survey.

Each app has its own `README.md`: what it does, how to run it, what's stubbed/mocked and why.

## Run everything locally

```bash
npm install              # from repo root, installs all workspaces
docker compose up -d     # starts shared Postgres with all 11 app databases
```

Then, per app you want to run:

```bash
cd apps/<workstream>/<app>
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

## Test everything

```bash
npm test    # from repo root, runs every workspace's Jest suite
```

## Known open items

- **`apps/hiring/resume-screening`'s Naukri auto-pull is unvalidated** — company Naukri API/partner access was never confirmed. It currently runs on the bulk-upload fallback only (`src/services/naukriClient.ts` documents what to build once access is resolved).
- **`apps/onboarding/induction-portal` and `apps/onboarding/product-training` ship backend APIs only** — no React frontend yet, contrary to the brief's UI requirement. Both are structured so a frontend can be built directly against the existing API.
- Content for onboarding apps (policies, culture book, product specs) is placeholder — real content is HR's deliverable, loaded from `content/` files with no code change needed once supplied.
- `apps/hiring/offer-letters`'s approval chain (who approves offers, in what order) is passed in on every request rather than coming from a config/org-chart lookup.

## Resolved since the initial merge

- **`apps/hiring/offer-letters` is now wired to the real `apps/foundations/document-engine`.** It originally ran against its own draft mock (endpoint shapes, status names, and auth all differed from Person A's real contract). `HttpDocumentEngineClient` now calls the real endpoints per `docs/contracts/document-engine-api.md`, correctly: creates a document already in `PENDING_APPROVAL` (the engine has no separate "submit" step), explicitly calls `POST /documents/:id/send` once approved (the engine never auto-sends), and polls `GET /documents/:id/status` in place of a webhook (the engine doesn't have one). Set `DOCUMENT_ENGINE_MODE=http` to use it — see that app's own README.

## QC status

All 11 apps: clean `npm install`, all Jest suites passing — 110 tests total across the monorepo (verified locally, including a full re-run after the document-engine integration fix above). See individual app READMEs for per-app test counts. No live end-to-end run against a real Postgres/document-engine pair has been done yet in this environment (no Docker/Postgres available here) — the HTTP client is verified against document-engine's actual route/service code via a mocked `fetch`, and both apps' TypeScript compiles clean, but an actual two-service run is still worth doing before this carries real offer letters.
