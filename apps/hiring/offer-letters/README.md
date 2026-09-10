# Offer & Appointment Letter Automation

Once a candidate is marked "selected", this generates their offer letter via
the document-engine, routes it through approval, and tracks their status
through to onboarding-ready — no manual HR follow-up.

**Built on top of Person A's document-engine.** This was originally built
against this workstream's own draft mock (before Person A's real contract
existed); it's since been wired up to the real
[`apps/foundations/document-engine`](../../foundations/document-engine),
per the authoritative
[`docs/contracts/document-engine-api.md`](../../../docs/contracts/document-engine-api.md).
`DOCUMENT_ENGINE_MODE` picks which client backs it — see below.

## Pipeline

```
SELECTED → OFFER_GENERATED → PENDING_APPROVAL → APPROVED → SENT → SIGNED → ONBOARDING_READY
                                              ↘ REJECTED
```

`POST /candidates` creates the candidate and calls the document-engine's
`POST /documents` with the offer-letter template and candidate data — the
engine returns the document already in `PENDING_APPROVAL` (it has no
separate "submit" step). From there, every status the document-engine
reports is mapped onto the candidate's own status
(`src/services/statusMapping.ts`) and persisted. The engine never
auto-advances past `APPROVED` on its own, so this app explicitly calls the
engine's `POST /documents/:id/send` the moment it observes `APPROVED` — see
`src/services/offerService.ts` — matching the brief's "no manual HR
follow-up." Signing is a genuine candidate action against the engine, which
this app only observes, not triggers.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/candidates` | Start the offer flow: `{ name, email, role, ctc?, joiningDate?, reportingManager?, location?, approvalChain: [{ approverEmail, order }] }` |
| GET | `/candidates` | Status view: every candidate and where they are in the pipeline |
| GET | `/candidates/:id` | One candidate's current status and full status history |

## Mock vs. real document-engine

Set in `.env`:
```
DOCUMENT_ENGINE_MODE=mock   # default — in-process, no document-engine needed
DOCUMENT_ENGINE_MODE=http   # calls the real apps/foundations/document-engine
DOCUMENT_ENGINE_BASE_URL=http://localhost:4001
DOCUMENT_ENGINE_TOKEN=<must match document-engine's INTERNAL_API_KEY>
```
`src/index.ts` picks `HttpDocumentEngineClient` over `MockDocumentEngineClient`
based on this flag — nothing else in the app changes. Both implement the same
`DocumentEngineClient` interface (`src/types.ts`).

The real engine has no webhook, so `HttpDocumentEngineClient.onStatusChange`
polls `GET /documents/:id/status` (every `DOCUMENT_ENGINE_POLL_INTERVAL_MS`,
default 3000ms) instead, stopping once the document reaches a terminal
status (`FILED` or `REJECTED`).

## Run locally

```bash
cp .env.example .env
# from the repo root: docker compose up -d postgres
npm install
npm run prisma:migrate
npm run dev
```

Server listens on `PORT` (default `4003`). Defaults to the mock document
engine — to run against the real one, also start
`apps/foundations/document-engine` locally first (see its own README) and
set `DOCUMENT_ENGINE_MODE=http`.

## Test

```bash
npm test
```

Covers the core logic without needing a database: the mock document-engine
client's lifecycle (creates already `PENDING_APPROVAL`, only reaches `SENT`
once explicitly asked, per the real engine's actual behavior), the real
`HttpDocumentEngineClient` against a mocked `fetch` (endpoint paths, the
`x-internal-api-key` header, request/response shapes, and the polling
behavior), and the pure status-mapping function.

## What's stubbed / mocked

- **`DOCUMENT_ENGINE_MODE=mock` (the default) doesn't talk to a real
  document-engine at all** — `MockDocumentEngineClient` simulates document
  creation, an approver clearing the chain, and a candidate signing, all
  in-memory, purely so local dev/test doesn't need a live approver/signer or
  a running document-engine.
- **Approval chain enforcement in the mock**: it auto-clears a single-step
  chain rather than waiting for a real approver to call
  `POST /documents/:id/approve` — that enforcement is real in
  `apps/foundations/document-engine` itself, just not exercised by the mock.

## What's still open

- Approval-chain data (who approves offers, in what order) is currently
  passed in on every request — likely wants to come from a config/lookup
  instead once the real org chart / approval policy is settled.
- No retry/backoff on a failed poll or a failed `send` call beyond a single
  logged error — acceptable for this round, worth hardening before this
  carries real offer letters.
