# Document & Approval Workflow Engine — API Contract

Owned by: Person A (`apps/foundations/document-engine`)
Consumed by: Person B's offer-letter automation (`apps/hiring/offer-letters`), and Person A's own exit-formalities app.

Base URL (local dev): `http://localhost:4001`

## Auth

Every request except `GET /health` requires:

```
x-internal-api-key: <INTERNAL_API_KEY>
```

This is a shared secret for internal service-to-service calls within the monorepo's local/dev environment (see `.env.example`). Not intended as a public-facing auth scheme.

## Status lifecycle

```
GENERATED -> PENDING_APPROVAL -> APPROVED -> SENT -> SIGNED -> FILED
                    |
                    v
                REJECTED (terminal)
```

A document cannot move to `SENT` until every approval step is `APPROVED`, in order. A `REJECTED` document is terminal.

## Endpoints

### `POST /documents`

Create a document instance from a template + data, with an ordered approval chain.

Request:
```json
{
  "templateType": "offer-letter",
  "data": {
    "candidateName": "Asha Rao",
    "designation": "Software Engineer",
    "reportingManager": "Kush",
    "startDate": "2026-10-01",
    "ctc": "12,00,000",
    "location": "Pune"
  },
  "recipientEmail": "asha@example.com",
  "approverEmails": ["manager@emotorad.com", "hr-head@emotorad.com"]
}
```

Known `templateType` values today: `offer-letter`, `appointment-letter`, `relieving-letter`.

Response `201`:
```json
{
  "id": "uuid",
  "templateType": "offer-letter",
  "status": "PENDING_APPROVAL",
  "renderedBody": "Dear Asha Rao, ...",
  "approvals": [
    { "order": 0, "approverEmail": "manager@emotorad.com", "status": "PENDING" },
    { "order": 1, "approverEmail": "hr-head@emotorad.com", "status": "PENDING" }
  ],
  "auditLog": [ { "action": "generated", "actor": "system", "timestamp": "..." } ]
}
```

### `POST /documents/:id/approve`

Request: `{ "approverEmail": "manager@emotorad.com", "comment": "looks good" }`

Approves the current pending step, if `approverEmail` matches whose turn it is. Returns the updated document (shape as above). `409` if it isn't that approver's turn, or the document is already rejected.

### `POST /documents/:id/reject`

Same request shape as approve. Moves the document to `REJECTED`, terminal — no further approvals possible.

### `POST /documents/:id/send`

No body required. `409` if any approval step is not yet `APPROVED`. On success, stubs an email via the pluggable sender and moves status to `SENT`.

### `POST /documents/:id/sign`

Request: `{ "signerName": "Asha Rao", "ipAddress": "203.0.113.4" }`

Captures a signature via the configured eSign provider (`standalone` today; `keka` once Keka's eSign API entitlement is confirmed — see `docs/PROGRAM-OVERVIEW.md`). `409` if the document hasn't been sent yet.

### `POST /documents/:id/file`

No body required. Marks a signed document as `FILED` (ready for HR Vault storage). `409` if not yet signed.

### `GET /documents/:id/status`

Returns the full current document state, including `approvals` and `auditLog`, so a caller (e.g. Person B's pipeline-status view) can show "which candidates are where."

## Building against this before the real engine is ready

Person B: until this service is deployed/reachable in your dev environment, mock these five endpoints with an in-memory fake that mirrors the status lifecycle above (approve requires exact turn order; send requires full approval; sign requires sent). Swap the base URL for the real one once `document-engine` is running — no other client-side changes should be needed if you stick to these shapes.
