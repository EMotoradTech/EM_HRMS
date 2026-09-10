# asset-management

Tracks company assets (laptops, ID cards, SIMs, etc.) issued to employees, and reconciles returns — especially at exit.

## What it does

- CRUD for assets: type, unique identifier, status (`IN_STOCK` / `ISSUED` / `RETURNED` / `LOST`).
- Issue an asset to an employee (rejected if it's already issued or lost); return an asset, closing out the issuance record.
- `GET /employees/:email/assets` — everything currently issued to one employee (what `exit-formalities` checks against).
- `GET /assets/unreturned` — everything currently outstanding, company-wide.

## Run locally

```bash
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

## Test

```bash
npm test
```

Tests cover `src/lib/assetLogic.ts` directly (no DB): issuing an already-issued or lost asset is rejected, returning updates status and clears the holder, and an already-returned asset can't be marked lost.

## What's stubbed / mocked, and why

Nothing is stubbed here — this is a self-contained CRUD system with no external dependency, per the brief.

## What's open

- Bulk import of the real EMotorad asset register (currently seed/example data only).
- Wiring `assets issued on day one` into the onboarding flow (Person C's induction portal) once both are integration-tested together.
