# Resume Screening & Ranking

Replaces manual one-by-one resume review: takes a job description, takes a
batch of candidate resumes, scores/ranks them against the JD's stated
requirements with a transparent (non-black-box) score breakdown, and produces
a ranked shortlist that can be sent to stakeholders.

## Naukri integration status

**Unvalidated — this app currently only supports the bulk-upload fallback.**
Per the hiring brief, the first task was to confirm whether the company's
Naukri recruiter account exposes a self-serve API/export path. That requires
logging into the actual account, which wasn't available while building this.
See [`src/services/naukriClient.ts`](src/services/naukriClient.ts) — it's a
stub that throws `NaukriApiNotAvailableError` and documents exactly what to
implement once access is confirmed one way or the other.

Until then: HR exports resumes from Naukri manually and bulk-uploads them via
`POST /job-descriptions/:id/candidates/upload`. This still removes the
one-by-one manual review, just without the auto-pull step.

## How it works

1. **Create a JD** — either give structured fields (`requiredSkills`,
   `preferredSkills`, `minExperienceYears`, `maxExperienceYears`,
   `requiredQualifications`) or a free-text `rawText` description, which gets
   parsed heuristically (see `src/services/jdParser.ts`) by looking for
   "Required Skills:", "Preferred Skills:", "Qualifications:" sections and an
   experience range like "3-6 years".
2. **Upload resumes** (PDF/DOCX) for that JD. Each resume is parsed to text
   (`pdf-parse` / `mammoth`) and comparable fields are extracted: name,
   email, phone, skills (matched against a known vocabulary), years of
   experience, and qualifications.
3. **Score & rank** — each candidate is scored against the JD on three
   explainable axes (skills, experience, qualifications), each with its own
   sub-score, weight, and matched/missing detail so HR can see exactly why a
   candidate ranked where they did. See `src/services/scoringEngine.ts` for
   the weights and `src/services/rankingService.ts` for the sort/tie-break.
4. **Send the shortlist** — `POST /job-descriptions/:id/shortlist/send`
   emails the ranked list to given stakeholder addresses. The actual sender
   is a stub (`ConsoleEmailSender`, logs to console) behind a
   `ShortlistSender` interface — swap in a real SMTP/Gmail-API sender later
   without touching the route.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/job-descriptions` | Create a JD (structured fields or `rawText`) |
| GET | `/job-descriptions/:id` | Fetch a JD |
| POST | `/job-descriptions/:id/candidates/upload` | Bulk-upload resumes (`multipart/form-data`, field `resumes`, PDF/DOCX, up to 50 files) — parses, scores, ranks, and stores each one |
| POST | `/job-descriptions/:id/candidates/pull-from-naukri` | Disabled — returns 501 until Naukri API access is confirmed |
| GET | `/job-descriptions/:id/shortlist` | Ranked candidate list with score breakdowns |
| POST | `/job-descriptions/:id/shortlist/send` | Emails the shortlist to `{ to: string[] }` (stubbed sender) |

## Run locally

```bash
cp .env.example .env
# from the repo root: docker compose up -d postgres
npm install
npm run prisma:migrate
npm run dev
```

Server listens on `PORT` (default `4001`).

## Test

```bash
npm test
```

Covers the core logic without needing a database: the scoring/ranking engine
(fixed candidates against a fixed JD, asserting the expected order and score
explanations), the JD free-text parser, and resume field extraction.

## What's stubbed / mocked

- **Naukri auto-pull**: not implemented — see above. Bulk upload is the real,
  working path.
- **Shortlist email delivery**: `ConsoleEmailSender` logs instead of sending.
  Swap via `setShortlistSender()` in `src/services/senderService.ts`.

## What's still open

- Confirm Naukri API/partner access and implement `fetchCandidatesForJD` in
  `src/services/naukriClient.ts` if it's available.
- Wire a real email sender (SMTP or Gmail API) into `senderService.ts`.
- Skill vocabulary in `src/services/resumeParser.ts` is a flat list — extend
  it as new roles/skills come up.
