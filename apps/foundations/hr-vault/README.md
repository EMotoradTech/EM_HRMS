# hr-vault

Access-controlled document storage + full audit trail. Stores the outputs of `document-engine` plus anything else HR uploads directly.

## What it does

- Default-deny access: only the `HR` role can read/write/share/delete by default.
- A document can be marked shareable to a specific external recipient (e.g. a candidate downloading their own signed offer letter) — that recipient can then `READ` it, nothing else.
- Every read, write, share, and delete attempt — allowed or denied — is written to an audit log, queryable per document, so HR can answer "who accessed this, when" for a compliance review.
- A simple HTTP API other apps can call instead of inventing their own storage.

## Run locally

```bash
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Requests identify the actor via `x-actor-email` / `x-actor-role` headers (a placeholder for whatever real auth/session layer sits in front of this internally — see "What's open" below), plus the shared `x-internal-api-key` header used across the monorepo's internal services.

## Test

```bash
npm test
```

Tests cover `src/lib/accessControl.ts` (the actual access-control decision, pure and DB-free) and `VaultService` end to end against an in-memory fake repository: a non-HR request is denied, a shared recipient can read, and an audit entry is written on every write and every read attempt — allowed or denied.

## What's stubbed / mocked, and why

- **Actor identity** — read from plain headers rather than a real auth/session system. Fine for internal-service calls within this monorepo's local dev; swap for whatever the org's real auth layer ends up being before this is internet-facing.
- **Storage** — `storageRef` is just a pointer string; actual file bytes are assumed to live wherever `document-engine` or HR's upload flow puts them (e.g. S3/local disk) — this service tracks metadata + access, not raw file storage.

## What's open

- Wiring `document-engine`'s `filed` documents to call `POST /vault/documents` automatically once both services are integration-tested together.
- A real auth/session layer in front of the actor-identity headers.
