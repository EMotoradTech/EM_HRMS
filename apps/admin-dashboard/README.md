# admin-dashboard

A single internal HR-admin dashboard — one sidebar, one login-feel, EMotorad-branded — that
talks directly to all 11 other apps in this monorepo as separate modules: Documents & Approvals,
HR Vault, Compliance Reminders, Asset Management, Exit Formalities, Resume Screening, BGV
Tracking, Offer Letters, Induction Portal, Product Training, and Pulse Survey.

This app has **no backend and no database of its own** — it's a thin React client. All state
lives in the 11 backend services; this just calls their existing REST APIs.

## What's real vs. stubbed

- **Real**: every module calls the actual backend endpoints (create/list/approve/issue/etc.) —
  nothing here is mocked. Health-check dots in the sidebar genuinely ping each service's
  `/health` every 15s.
- **Per-viewer, not shared**: the API base URLs, the shared `x-internal-api-key`, and the HR
  Vault actor identity are stored in this browser's `localStorage` (see Settings) — not synced
  anywhere, not sent anywhere except the 11 services themselves.
- **No auth of its own**: this dashboard doesn't log you in — it just presents whatever identity
  you configure in Settings to HR Vault, and the shared API key to the 5 apps that check one.
  Fine for internal/local use; would need real auth before this is exposed beyond a laptop.
- **Induction Portal / Product Training don't have a roster** — those two backends were built
  without an endpoint that lists known joiners, so their pages ask you to type in a Joiner ID
  (an employee ID/email you already know) rather than picking from a list.

## Run everything locally

Each of the 11 backends is independently runnable on its own default port — but several apps
share the *same* default port (e.g. document-engine and resume-screening both default to 4001),
because each was built standalone without knowledge of the others. To run all 11 alongside this
dashboard, give each one a `.env` with a non-colliding port, matching `src/lib/services.ts`:

| App | Port | Needs `x-internal-api-key` |
|---|---|---|
| document-engine | 4001 | yes |
| hr-vault | 4002 | yes |
| compliance-reminders | 4003 | yes |
| asset-management | 4004 | yes |
| exit-formalities | 4005 | yes |
| resume-screening | 4006 | no |
| bgv-tracking | 4007 | no |
| offer-letters | 4008 | no |
| induction-portal | 4009 | no |
| product-training | 4010 | no |
| pulse-survey | 4011 | no |

```bash
# from the repo root
docker compose up -d                 # shared Postgres, all 11 databases
npm install                          # installs every workspace, including this dashboard

# for each app above: cp .env.example .env, set PORT to the table value,
# then npx prisma migrate dev --name init && npm run dev (from that app's folder)

# then, from apps/admin-dashboard:
npm run dev                          # http://localhost:5173
```

Open Settings in the dashboard and confirm the base URLs match where you actually started each
service — they default to the port table above. Nothing needs to be running for the dashboard
itself to load; each module's page just shows an error banner (and the sidebar dot goes red) for
whichever services aren't reachable yet.

## Test

```bash
npm test
```

There's no business logic here to unit test — this app is a thin client over 11 backends that
each carry their own test suites. `npm run build` (`tsc --noEmit && vite build`) is this app's
real correctness check.
