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

## Known open items (as of this merge)

- **`apps/hiring/offer-letters` is not yet wired to the real `apps/foundations/document-engine`.** It was built against its own draft mock of the contract (before Person A's real one was published) — endpoint shapes, status names, and auth differ between the two. See `docs/contracts/document-engine-api.md` (the real, authoritative contract) vs. `apps/hiring/offer-letters/src/services/documentEngineClient.ts` (the in-memory mock it currently runs against). Swapping in a real `HttpDocumentEngineClient` against the live engine is the next integration task.
- **`apps/hiring/resume-screening`'s Naukri auto-pull is unvalidated** — company Naukri API/partner access was never confirmed. It currently runs on the bulk-upload fallback only (`src/services/naukriClient.ts` documents what to build once access is resolved).
- **`apps/onboarding/induction-portal` and `apps/onboarding/product-training` ship backend APIs only** — no React frontend yet, contrary to the brief's UI requirement. Both are structured so a frontend can be built directly against the existing API.
- Content for onboarding apps (policies, culture book, product specs) is placeholder — real content is HR's deliverable, loaded from `content/` files with no code change needed once supplied.

## QC status (this merge)

All 11 apps: clean `npm install`, all Jest suites passing — 100 tests total across the monorepo. Verified locally before push; see individual app READMEs for per-app test counts.
