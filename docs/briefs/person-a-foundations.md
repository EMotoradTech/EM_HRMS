# Brief: Foundations & Quick Wins — EM_HRMS

**Repo:** https://github.com/EMotoradTech/EM_HRMS
**Your branch:** `feature/foundations`
**Your folders:** `apps/foundations/document-engine`, `apps/foundations/hr-vault`, `apps/foundations/compliance-reminders`, `apps/foundations/asset-management`, `apps/foundations/exit-formalities`

## Start here

1. Clone the repo, check out (or create) `feature/foundations` off `main`.
2. Read `docs/PROGRAM-OVERVIEW.md` in the repo root — it defines the shared tech stack (Node.js/TypeScript, Express, PostgreSQL via Prisma, one DB per app, npm workspaces, Jest), repo structure, and git workflow. Everything below assumes that stack; don't deviate from it, since three people's code needs to merge into one repo cleanly.
3. Your work underpins the other two workstreams (hiring, and onboarding/engagement), so the **document-engine contract is your first deliverable** — publish it before you finish the full implementation, so the other two aren't blocked.

## Context

EMotorad (Indian EV bike/scooter manufacturer) is automating HR workflows. You're building the shared infrastructure everything else plugs into, plus two standalone quick-win tools. Current tooling: Keka (HRMS — confirm actual API entitlement early, don't assume it), Gmail, Naukri. No existing document/eSign/vendor tooling today.

## What you're building

### 1. Document & Approval Workflow Engine (`apps/foundations/document-engine`)

**Purpose:** a reusable service that takes a document template + data, generates the document, routes it through a defined approval chain, sends it to a recipient, captures a signature, and stores the final signed copy with an audit trail. This will be called by the hiring team's offer-letter automation and, later, exit-formalities work — so its API needs to be genuinely reusable, not hardcoded to one document type.

**Core capabilities:**
- Template-based document generation (e.g. Handlebars or similar templating over HTML → PDF). Support at minimum: an offer letter template and an appointment letter template, parameterized by candidate/employee fields.
- Approval chain: a document instance moves through an ordered list of approvers; each approver can approve or reject with a comment; the document only proceeds to "send" once all required approvals are collected. Model this generically (a list of approver roles/emails per document type), not hardcoded to one org chart.
- Send: email the generated document to the recipient (via a pluggable email sender — for local dev, log/stub the send; leave a clean interface for plugging in Gmail/SMTP later since actual sending isn't the focus here).
- eSign: capture a signature and mark the document as executed. **First check whether Keka's API exposes an eSign module you can call** (see `docs/PROGRAM-OVERVIEW.md` for the "confirm Keka API entitlement" note) — if not accessible, build a minimal standalone e-signature capture (e.g. a signing link that records name/timestamp/IP or an uploaded signature image) behind the same interface, so it can be swapped for Keka's or a real eSign provider later without changing callers.
- Every state transition (generated → sent → approved/rejected at each step → signed → filed) gets logged with who/what/when for the audit trail — this feeds the HR Vault below.

**Publish the contract early:** write `docs/contracts/document-engine-api.md` describing your endpoints (e.g. `POST /documents` to create a document instance from a template + data, `POST /documents/:id/approve`, `GET /documents/:id/status`, etc.), request/response JSON shapes, and auth approach. Do this as soon as you've settled the shape — even before the implementation is finished — so Person B (hiring) can start building against a mock immediately.

### 2. HR-Only Restricted Document Repository (`apps/foundations/hr-vault`)

**Purpose:** access-controlled storage for HR documents, doubling as an audit trail (this was explicitly asked for both reasons — access control AND audit trail, not just one).

**Core capabilities:**
- Store documents (the outputs of the document-engine, plus anything else HR uploads) with metadata: owner, document type, associated employee/candidate, created date.
- Role-based access: by default only an "HR" role can read/list documents; support marking specific documents/folders as shareable to a specific external recipient (e.g. the candidate who needs to download their own signed letter).
- Full audit log: every read, write, share, and delete is recorded with actor, timestamp, and action — queryable so HR can answer "who accessed this, when" for a compliance review.
- Simple API other apps can call to store/retrieve documents rather than each app inventing its own storage.

### 3. Compliance Reminder System (`apps/foundations/compliance-reminders`)

**Purpose:** track statutory deadlines (PF, ESI payments, and similar recurring compliance dates) and notify the right owner ahead of the due date. Standalone — no dependency on the other three.

**Core capabilities:**
- CRUD for compliance items: name, recurrence (e.g. monthly, by a specific day), owner, notification lead time.
- A scheduler that checks daily and fires a notification (email stub is fine for now, following the same pluggable-sender pattern as the document engine) when a deadline is approaching.
- Seed it with a couple of example compliance items (PF, ESI) so it's demonstrably working, but keep the model generic — the real EMotorad compliance calendar will be supplied by HR later.

### 4. Asset Management System (`apps/foundations/asset-management`)

**Purpose:** track company assets (laptops, ID cards, SIMs, etc.) issued to employees, and reconcile returns — especially at exit.

**Core capabilities:**
- CRUD for assets (type, serial/identifier, status: in-stock/issued/returned/lost).
- Issue an asset to an employee (by employee ID/email) with a timestamp; return an asset, closing out the issuance record.
- A view of "all assets currently issued to employee X" and "all assets never returned" — the second one is what exit-formalities (below) checks against.

### 5. Exit Formalities & Documentation (`apps/foundations/exit-formalities`)

**Purpose:** the offboarding mirror of offer/appointment letters — when an employee is marked as exiting, generate their exit paperwork (relieving letter, full-and-final documentation), route it through approvals, send it, and collect any final signatures, the same no-manual-follow-up way as onboarding documents.

**Core capabilities:**
- Reuse your own document-engine directly (in-process or via its own API — your call, since you own both) to generate and route exit documents from a template, the same pattern as offer letters.
- On triggering an exit, check the asset-management system for any assets not yet returned by that employee, and surface that as a blocker/checklist item before the exit is marked complete — don't let exit formalities finish silently while a laptop is still unreturned.
- Track exit status per employee: initiated → documents generated → approvals cleared → sent → signed → assets cleared → complete.

This one should be quick relative to the others — you're wiring together two things you've already built, not building new infrastructure.

## What to test

- Document engine: a document instance correctly requires all approvals before it can be marked "sent"; rejecting at any approval step blocks progression; every transition is logged.
- HR vault: a non-HR-role request is denied; access/audit log entries are created on every read/write.
- Compliance reminders: a reminder fires when a seeded deadline is within its lead time, and doesn't fire otherwise.
- Asset management: issuing an already-issued asset is rejected; returning an asset updates its status correctly.
- Exit formalities: an exit with unreturned assets is correctly blocked/flagged rather than silently marked complete.

## What NOT to do

- Don't build the hiring or onboarding apps — that's Person B and C's scope.
- Don't hardcode EMotorad's real org chart, real employee data, or real compliance dates — use clearly-marked example/seed data.
- Don't skip publishing the document-engine contract early — Person B is depending on it to start their work in parallel with you.
