# exit-formalities

The offboarding mirror of offer/appointment letters. Wires together `document-engine` (already built) and `asset-management` (already built) rather than building new infrastructure — per the brief, this one's mostly plumbing.

## What it does

- On initiating an exit, immediately kicks off a `relieving-letter` document via `document-engine` (reusing its approval → send → sign flow, not reimplementing it).
- Tracks exit status per employee: `INITIATED → DOCUMENTS_GENERATED → APPROVALS_CLEARED → SENT → SIGNED → ASSETS_CLEARED → COMPLETE`, syncing the middle four states from `document-engine`'s own status.
- Before allowing `COMPLETE`, checks `asset-management` for anything still issued to that employee. If anything is outstanding, the exit is blocked with the specific assets named — it does **not** silently finish.

## Run locally

```bash
cp .env.example .env
npx prisma migrate dev --name init
# document-engine and asset-management should be running too (see their READMEs)
npm run dev
```

## Test

```bash
npm test
```

Tests cover `src/lib/exitEngine.ts` directly (no DB, no HTTP): the status sequence can't be skipped, and — the case the brief specifically calls out — completing an exit with unreturned assets throws `ExitBlockedError` naming exactly what's outstanding, rather than completing.

## What's stubbed / mocked, and why

- `src/lib/clients.ts` are thin real HTTP clients (not mocks) to `document-engine` and `asset-management` — they need both services actually running locally to exercise end-to-end. Unit tests avoid this by testing the pure state machine instead, per the brief's core-logic-first testing guidance.

## What's open

- End-to-end test against real running `document-engine` + `asset-management` instances.
- A webhook/poll cadence for `syncWithDocumentEngine` rather than calling it on demand.
