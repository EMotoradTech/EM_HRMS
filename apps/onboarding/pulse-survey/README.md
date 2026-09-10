# Engagement & Pulse Survey

A monthly detailed pulse survey and a lighter daily mood check, both **genuinely
anonymous by design** — this shaped the data model from the start, per the brief.

## Anonymity — how it actually works

- `SurveyResponse` (see `prisma/schema.prisma`) has **no name, email, or employee
  ID field** — only `surveyKey`, `period`, a one-way `dedupeTokenHash`, and the
  `answers` themselves.
- `dedupeTokenHash` is a one-way HMAC-SHA256 of `(secret + employee identifier +
  survey key + period)` (`src/dedupeToken.ts`). It's stored purely to reject a
  second submission from the same person in the same period — **it cannot be
  reversed back to the identifier**, and the identifier itself is never persisted.
- No IP address or high-precision timestamp is stored (a per-second timestamp
  combined with a small team could re-identify someone) — only the response's
  `submittedAt`, which is not exposed per-response anyway (see below).
- `tests/service.test.ts` includes a dedicated anonymity test (the brief calls
  this out as not optional): it asserts no field name on a stored response looks
  identity-shaped, and that neither the identifier string nor recognizable
  fragments of it appear anywhere in the serialized record.
- **Reporting is aggregate-only.** `PulseSurveyService.getAggregateReport()` is
  the only read path exposed, and it returns counts/averages/option-tallies —
  there is no method or endpoint anywhere in this app that returns raw
  per-response rows. Free-text answers aggregate to a response *count* only;
  the raw text is deliberately never surfaced in a report.

## What's real vs. stubbed

- **Real:** survey definitions (monthly pulse + daily mood, content-driven from
  JSON), submission with dedup, aggregate reporting, cadence logic
  (`src/scheduler.ts`, pure and unit-tested separately from `node-cron`),
  the Express API, full test suite.
- **Stubbed:** the sender (`ConsoleLogSender` logs instead of emailing) and the
  recipient list (a placeholder single address in `src/index.ts`) — swap both
  for a real Gmail/SMTP sender and a real employee list (e.g. from Keka) later;
  neither change touches submission or reporting logic.
- **Not built:** WhatsApp delivery (explicitly out of scope), Keka-embedded
  delivery (build the email path as baseline per the brief).

## Running locally

```bash
cp .env.example .env   # set a real DEDUPE_TOKEN_SECRET before any real deployment
npm install
npm run prisma:generate
npm run prisma:migrate   # creates tables in em_hrms_pulse_survey
npm run dev               # starts the API on :4003 and the daily scheduler check
```

## Testing

```bash
npm test
```

- `dedupeToken.test.ts` — determinism, and that the hash reveals nothing about
  the identifier.
- `scheduler.test.ts` — the monthly pulse fires once a month, the daily mood
  check fires once a day, including month/year-boundary cases.
- `service.test.ts` — **the anonymity test** (required), dedup behavior across
  periods, and that aggregate reporting never leaks per-response content.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/surveys` | Survey definitions (questions) |
| POST | `/surveys/:surveyKey/responses` | Submit `{ employeeIdentifier, answers }` — identifier is used only to derive the dedupe hash, never stored |
| GET | `/surveys/:surveyKey/report/:period` | Aggregate-only report for a period (e.g. `2026-09` or `2026-09-10`) |

## What's open / next steps

- Real sender (Gmail/SMTP) behind the existing `SurveySender` interface.
- Real recipient list, sourced from Keka rather than the placeholder in `index.ts`.
- Frontend survey-taking UI (this ships the backend API only).
