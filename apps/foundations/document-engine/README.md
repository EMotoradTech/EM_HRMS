# document-engine

Reusable document-generation + approval-chain + send + eSign + audit-trail service. Called by Person B's offer-letter automation and Person A's own exit-formalities app — see `docs/contracts/document-engine-api.md` for the API contract.

## What it does

- Renders a document from a template (`offer-letter`, `appointment-letter`, `relieving-letter`) + supplied data.
- Routes it through a generic, per-document ordered approval chain (not hardcoded to one org chart).
- Sends it once fully approved (stubbed locally — logs instead of sending real email).
- Captures a signature (standalone stub today; swappable for Keka's eSign module behind the same interface once its API access is confirmed).
- Logs every state transition with actor + timestamp for the audit trail HR Vault will read.

## Run locally

```bash
cp .env.example .env
# start the shared local Postgres (see root docker-compose.yml) first
npx prisma migrate dev --name init
npm run dev
```

Server listens on `PORT` from `.env` (default 4001). All routes except `/health` require an `x-internal-api-key` header matching `INTERNAL_API_KEY`.

## Test

```bash
npm test
```

Tests cover the approval state machine directly (`src/lib/approvalEngine.ts`) — no DB required: full-approval-required-before-send, out-of-order approval rejected, rejection halts progression, every transition logged, and the signed→filed ordering. Also covers template rendering.

## What's stubbed / mocked, and why

- **Email sending** — `LogEmailSender` just logs; swap in a Gmail/SMTP-backed `EmailSender` later without touching callers.
- **eSign** — `StandaloneESignProvider` records name/timestamp/IP as signature evidence. `KekaESignProvider` is a stub that throws until Keka's eSign API entitlement is confirmed (see root `docs/PROGRAM-OVERVIEW.md`); switch via the `ESIGN_PROVIDER` env var.
- **Auth** — a shared-secret header, sufficient for internal service-to-service calls in local/dev across this monorepo. Not a real user-facing auth scheme.

## What's open

- Real email delivery (Gmail/SMTP) once actual sending is prioritized.
- Keka eSign integration, pending the Phase 0.3 entitlement check in `docs/HR-AUTOMATION-PLAN.md`.
- Integration/e2e tests against a real Postgres instance (unit tests currently cover the state machine in isolation).
