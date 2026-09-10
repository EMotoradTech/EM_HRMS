# Product Training Module

Basic knowledge of EMotorad's bikes/scooters for new joiners, structured as
content-driven modules with an optional end-of-module quiz. Built as its own
app so it can be reused later for other audiences (e.g. sales onboarding).

## What's real vs. stubbed

- **Real:** module loading from JSON content files, per-joiner completion
  tracking, quiz scoring (`src/service.ts`) with a fixed 70% pass threshold,
  the Express API, and full test coverage for both.
- **Stubbed / placeholder:** the actual lesson content and quiz questions —
  `content/modules/*.json` are clearly marked `PLACEHOLDER CONTENT`. The
  product team supplies real specs/positioning/FAQs; swap the JSON files,
  no code change needed.
- **Not built yet:** a frontend. This ships the backend API only — the brief
  notes the induction portal's viewer components could be reused here.

## Content model

Each module is one JSON file under `content/modules/`:

```json
{
  "key": "product-lineup",
  "title": "Product Lineup Overview",
  "order": 1,
  "lessonBody": "Markdown or plain text lesson content",
  "quiz": [
    { "question": "...", "options": ["...", "...", "..."], "correctIndex": 0 }
  ]
}
```

`quiz` can be an empty array for modules with no check-your-understanding step.

## Running locally

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate   # creates tables in em_hrms_product_training
npm run dev               # starts the API on :4002
```

## Testing

```bash
npm test
```

- `contentLoader.test.ts` — module parsing, ordering, quiz question shape.
- `service.test.ts` — completion tracking, and quiz scoring against a fixed
  known input (per the brief's "a module's completion state and quiz scoring
  work correctly" requirement). Uses `InMemoryProgressRepository`; the
  Prisma-backed repository is swapped in at runtime in `src/index.ts`.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/modules` | All modules (quiz answer keys stripped) |
| GET | `/joiners/:joinerId/progress` | Per-joiner completion + quiz results |
| POST | `/joiners/:joinerId/modules/:moduleKey/complete` | Mark a no-quiz module completed |
| POST | `/joiners/:joinerId/modules/:moduleKey/quiz` | Submit `{ answers: number[] }`, get scored + persisted |

## What's open / next steps

- Frontend (React + Vite), reusing induction-portal's content viewer where possible.
- Real content from the product team.
