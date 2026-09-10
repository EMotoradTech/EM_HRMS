# Induction Self-Serve Portal

A simplified, easy-to-read landing point for new joiners: company policies, culture
book, company presentation, and HR event/leave rules — each a clearly labeled
section, with per-joiner "started/completed" tracking so HR can see who's actually
gone through induction.

## What's real vs. stubbed

- **Real:** content loading from Markdown files with front-matter, section
  progress tracking (start/complete) persisted per joiner, the Express API,
  all core logic (`src/service.ts`) and its tests.
- **Stubbed / placeholder:** the actual policy text, culture book, and company
  deck — every section under `content/sections/` is clearly marked
  `PLACEHOLDER CONTENT`. Swap in real content by editing/adding `.md` files;
  no code change or redeploy needed.
- **Not built yet:** a React frontend. This app currently ships the backend
  API only (`GET /sections`, `GET /joiners/:id/progress`, `POST .../start`,
  `POST .../complete`). The brief's UI requirement (React + Vite, PDF/slide
  viewer for the company presentation) is the natural next slice — the API
  is shaped so that frontend can be built directly against it.

## Content model

Sections live in `content/sections/*.md`. Each file has YAML front-matter:

```md
---
key: policies          # stable identifier, referenced by the progress API
title: Company Policies
order: 1
type: markdown         # or "embed" for a PDF/slide viewer
---

Body content in Markdown.
```

For an `embed` section (e.g. the company presentation), add `embedUrl` and
`embedKind: pdf` — see `content/sections/03-company-presentation.md`.

## Running locally

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate   # creates tables in em_hrms_induction_portal (see docker-compose.yml at repo root)
npm run dev               # starts the API on :4001
```

## Testing

```bash
npm test
```

Tests cover the content loader (parsing, ordering, the "embed" type) and the
core progress-tracking logic (`src/service.ts`), using an in-memory repository
(`InMemoryProgressRepository`) so they don't require a live Postgres instance.
The Prisma-backed repository (`PrismaProgressRepository`) implements the same
interface and is what `src/index.ts` wires up at runtime.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/sections` | All sections (no per-joiner state) |
| GET | `/joiners/:joinerId/progress` | All sections merged with this joiner's progress |
| POST | `/joiners/:joinerId/sections/:sectionKey/start` | Mark a section started (won't downgrade a completed one) |
| POST | `/joiners/:joinerId/sections/:sectionKey/complete` | Mark a section completed |

## What's open / next steps

- Build the React + Vite frontend against this API.
- Add the PDF/slide viewer component (`embedKind: pdf`) — e.g. `react-pdf` or
  an `<iframe>` to a stored PDF for a first pass.
- Once HR-Vault (Person A) exists, store the actual presentation PDF there
  instead of a static asset path.
