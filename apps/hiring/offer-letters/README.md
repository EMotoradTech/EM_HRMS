# Offer & Appointment Letter Automation

Once a candidate is marked "selected", this generates their offer letter via
the document-engine, routes it through approval, and tracks their status
through to onboarding-ready — no manual HR follow-up.

**Built on top of Person A's document-engine, not from scratch.** That
service (`apps/foundations/document-engine`) didn't exist yet while this was
built, so it's built against a mock — see
[`docs/contracts/document-engine-api.md`](../../../docs/contracts/document-engine-api.md)
(written by this workstream as a placeholder, clearly marked DRAFT/MOCK) and
[`src/services/documentEngineClient.ts`](src/services/documentEngineClient.ts).

## Pipeline

```
SELECTED → OFFER_GENERATED → PENDING_APPROVAL → APPROVED → SENT → SIGNED → ONBOARDING_READY
                                              ↘ REJECTED
```

`POST /candidates` creates the candidate, calls the document-engine's
`createDocument` with the offer-letter template and candidate data, then
`submitForApproval`. From there, every status the document-engine reports
(approval cleared, sent, signed) is mapped onto the candidate's own status
(`src/services/statusMapping.ts`) and persisted — this app doesn't build or
run the approval UI itself, it just kicks the process off and reflects
whatever the engine reports back.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/candidates` | Start the offer flow: `{ name, email, role, ctc?, joiningDate?, approvalChain: [{ approverEmail, order }] }` |
| GET | `/candidates` | Status view: every candidate and where they are in the pipeline |
| GET | `/candidates/:id` | One candidate's current status and full status history |

## Switching from the mock to the real document-engine

Set in `.env`:
```
DOCUMENT_ENGINE_MODE=http
DOCUMENT_ENGINE_BASE_URL=http://localhost:<document-engine-port>
DOCUMENT_ENGINE_TOKEN=<service token>
```
`src/index.ts` picks `HttpDocumentEngineClient` over the mock based on this
flag — nothing else in the app needs to change. `HttpDocumentEngineClient`
implements the same `DocumentEngineClient` interface as the mock
(`src/types.ts`), built against the assumed shapes in
`docs/contracts/document-engine-api.md`; once Person A publishes the real
contract, diff it against that file and adjust the HTTP client if the real
shapes differ. It also still needs a webhook route wired up to receive the
engine's real async status callbacks — see the comment at the top of
`src/services/httpDocumentEngineClient.ts`.

## Run locally

```bash
cp .env.example .env
# from the repo root: docker compose up -d postgres
npm install
npm run prisma:migrate
npm run dev
```

Server listens on `PORT` (default `4003`). Defaults to the mock document
engine.

## Test

```bash
npm test
```

Covers the core logic without needing a database or a real document-engine:
the mock document-engine client's lifecycle (creates in `DRAFT`, then walks
through `PENDING_APPROVAL → APPROVED → SENT → SIGNED` in order once
submitted for approval), and the pure status-mapping function that turns
each of those into the right candidate pipeline status.

## What's stubbed / mocked

- **The entire document-engine**: `MockDocumentEngineClient` simulates
  document creation, approval-chain clearing, sending, and signature capture
  in-memory. No real approval UI, no real email/eSign happens.
- **Approval chain enforcement**: the mock auto-clears the chain rather than
  waiting for real approver actions — there's no `POST
  /documents/:id/approvals/:approverEmail` equivalent wired up yet on this
  side, since the real contract doesn't exist to build against.

## What's still open

- Swap in the real document-engine once Person A publishes it (see above).
- A webhook receiver route for real async status callbacks from the engine.
- Approval-chain data (who approves offers, in what order) is currently
  passed in on every request — likely wants to come from a config/lookup
  instead once the real org chart / approval policy is settled.
