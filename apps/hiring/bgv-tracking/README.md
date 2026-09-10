# Background Verification Tracking

**This is a workflow/status tracker, not a verification engine.** Actual BGV
checks (education, employment history, criminal record, address) require
external verification agencies with data access — nobody builds that
in-house. This app just sweetens the existing manual process: document
intake, per-check status, and stakeholder notification, on top of whatever
BGV vendor/process HR already uses.

## How it works

1. **Create a candidate** entering BGV, with the set of check types that
   apply to them (defaults to education/employment/address/identity if not
   specified). Each check starts `PENDING`.
2. **Upload documents** the candidate submits, tagged to a check type.
3. **Update a check's status** as HR (or a manual BGV vendor process) moves
   it along: `pending → in-progress → verified`, or `flagged`/`failed` if
   something's wrong.
4. **Overall status** is recomputed automatically on every check update (see
   `src/services/statusEngine.ts`):
   - `COMPLETE` — every check for the candidate is `VERIFIED`.
   - `BLOCKED` — at least one check is `FLAGGED` or `FAILED` (blocks
     completion even if everything else is verified).
   - `IN_PROGRESS` — otherwise.
   When a candidate first reaches `COMPLETE`, the stakeholder (if given an
   email at candidate creation) is notified via a stubbed notifier — see
   `src/services/notifier.ts`.
5. **Dashboard** — `GET /candidates` lists every candidate currently in BGV
   with their per-check status, for a simple list view.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/candidates` | Create a candidate with `{ name, email, stakeholderEmail?, checkTypes? }` |
| GET | `/candidates` | Dashboard: all candidates + status per check |
| GET | `/candidates/:id` | One candidate's checks and uploaded documents |
| POST | `/candidates/:id/documents` | Upload a document (`multipart/form-data`: `document` file, `checkType` field) |
| PATCH | `/candidates/:id/checks/:type` | Update one check's status: `{ status, notes? }` |

Check types: `EDUCATION`, `EMPLOYMENT`, `ADDRESS`, `IDENTITY`,
`CRIMINAL_RECORD`, `REFERENCE`. Statuses: `PENDING`, `IN_PROGRESS`,
`VERIFIED`, `FLAGGED`, `FAILED`.

## Run locally

```bash
cp .env.example .env
# from the repo root: docker compose up -d postgres
npm install
npm run prisma:migrate
npm run dev
```

Server listens on `PORT` (default `4002`).

## Test

```bash
npm test
```

Covers the core logic without needing a database: `computeOverallStatus`
against fixed check combinations, asserting that overall status only
reaches `COMPLETE` once every check is verified, and that a single flagged
or failed check blocks completion regardless of the rest.

## What's stubbed / mocked

- **Stakeholder notification**: `ConsoleNotifier` logs instead of sending.
  Swap via `setStakeholderNotifier()` in `src/services/notifier.ts`.
- **Document storage**: file metadata (name, check type, timestamp) is
  stored; the file bytes themselves aren't persisted anywhere yet — wire in
  real storage (S3, or the HR-only document repository from Phase 0.2 once
  it exists) before this goes to production.

## What's still open

- Real file storage for uploaded BGV documents.
- A real notifier (email/Slack) instead of the console stub.
- No BGV vendor is in place yet per the program plan — this tracker's check
  statuses are updated manually (or via whatever vendor integration gets
  chosen later); it doesn't call any verification service itself.
