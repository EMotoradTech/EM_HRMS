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

All 11 apps: clean `npm install`, all Jest suites passing — 110 tests total across the monorepo, re-verified after every fix below.

**Live end-to-end run, done.** document-engine and offer-letters were actually started against a real local Postgres and driven through the full pipeline over HTTP: candidate created → real offer letter rendered (no placeholder gaps) → both approvers approved → offer-letters auto-sent on observing `APPROVED` → signed as the candidate → offer-letters observed `SIGNED` and moved to `ONBOARDING_READY`. That run caught and fixed a real bug (below) that no unit test could have.

### Fixed by the live run: Prisma client collision across workspace apps

npm workspaces hoist all 11 apps' `@prisma/client` to one shared root `node_modules`. Every app's `prisma generate` was overwriting that same shared client, so running `prisma migrate dev` for a second app silently broke whichever app generated first (`Property 'documentInstance' does not exist...` at runtime) — latent in every submission, since nobody had run two apps' migrations back to back before. Fixed by giving every app its own `output` path in `schema.prisma` so each gets an isolated generated client. No unit test caught this because none of the 110 tests touch a real Prisma client — worth keeping in mind before assuming green tests mean a clean local run.
