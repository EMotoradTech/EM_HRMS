# EMotorad HR Automation — Prioritized Build Plan

**Prepared for:** VP HR & team, EMotorad
**Purpose:** Scoped, sequenced plan to hand to Claude Code for implementation
**Current stack:** Keka (HRMS, admin access confirmed, API tier to be verified), Gmail, Naukri (paid access), personal calendars. No ATS, LMS, engagement platform, or vendor-management tool today. WhatsApp Business API exists but is explicitly out of scope for now.
**Scale context:** ~520 total headcount, ~20-25 hires/month average, ~30 open roles currently.

---

## 1. Guiding principles

- **Keka is the system of record.** Wherever Keka's API can hold or move the data (employee records, onboarding tasks, documents, BGV, eSign, compliance), build on top of it rather than duplicating a parallel database. Keka's public API (OAuth-based) covers employee management, onboarding, document management, background verification, digital signature/eSign, and compliance modules — so several of these use cases may be more "configure + orchestrate" than "build from scratch." **First engineering task: confirm the org's Keka plan actually includes API access** (admin access to the product doesn't guarantee API entitlement) via developers.keka.com and Keka's own account team.
- **Build shared infrastructure once.** Several use cases (offer letters, exit formalities, consultant docs) all need the same underlying capability: generate a document → route for approval → send to a person → collect a signature → file it with an audit trail. That capability should be built once, as reusable infrastructure, then applied to each use case rather than rebuilt per use case.
- **Naukri only, no LinkedIn, no WhatsApp automation** for this phase — confirmed scope cut. Naukri does not appear to expose an open self-serve API for arbitrary resume pulling to end customers; ATS platforms (Workable, Greenhouse, etc.) integrate with Naukri through formal partner/API integration channels. Treat "connect to Naukri" as requiring outreach to Naukri for API/partner credentials, not an assumed drop-in — this should be an early validation task, not a mid-build surprise.
- **Sequence by dependency and volume impact.** Hiring and onboarding touch ~20-25 people every month and are the most manual today — they get priority. Lower-frequency or smaller-population items (consultants/international, vendor coordination) come later.

---

## 2. Phase 0 — Foundations (build first, reused by everything else)

These aren't user-facing use cases on their own, but nearly every later phase depends on them.

**0.1 Document & Approval Workflow Engine**
Generate a document from a template + candidate/employee data → route through a defined approval chain → send to the recipient → capture signature (via Keka's eSign module if API access allows, else a standalone eSign provider) → store the final signed copy with a timestamped audit log.
*Feeds into:* offer/appointment letters (#3 below), exit formalities (#5), consultant documentation (#10).

**0.2 HR-Only Restricted Document Repository**
A storage layer with role-based access (HR-only by default, specific documents shareable outward) and a full audit trail (who accessed/sent/approved/signed what, and when) — satisfying both the access-control and audit-readiness needs raised earlier.
*Feeds into:* everything that generates or stores a document.

**0.3 Integration validation spike**
Before committing engineering time: confirm (a) Keka's actual API entitlement and which modules are enabled, (b) Naukri's integration path (API partner program vs. manual export), (c) choice of eSign provider if Keka's isn't usable. This is a short discovery task, not a full build phase — but nothing in Phase 1-2 should start until it's answered.

---

## 3. Phase 1 — Quick wins (low complexity, standalone, immediate value)

**3.1 Compliance Reminder System**
Track statutory deadlines (PF, ESI, and others as applicable) and notify the right owner ahead of due dates. Standalone calendar/reminder logic — no dependency on Phase 0. Low effort, removes real compliance risk.

**3.2 Asset Management System**
A register of company assets (laptops, ID cards, SIMs, etc.) mapped to employees, tracking issuance and return. Standalone CRUD system. Natural hooks into onboarding (issue on day one) and exit (reconcile on last day) once those phases exist, but the core system doesn't need to wait for them.

---

## 4. Phase 2 — Hiring & Onboarding core (highest volume impact)

This is where the ~20-25 hires/month currently cost the most manual effort.

**4.1 Resume Screening & Ranking (Naukri only)**
Pull candidate profiles against a posted JD from Naukri, match/rank against the JD's stated parameters, and route the ranked shortlist to stakeholders. *Depends on:* Phase 0.3 confirming Naukri's integration path. If Naukri doesn't offer the needed API access, the fallback is a lighter-weight version: HR exports/uploads resumes in bulk and the system does the matching, ranking, and routing — still removing the one-by-one manual review, just without the auto-pull step.

**4.2 Background Verification Tracking**
Not a verification engine (that needs external verification agencies) — a workflow/status tracker: candidate document submission, check status per BGV item, stakeholder notification on completion. Sweetens the existing manual process rather than replacing it, per the scope agreed earlier.

**4.3 Offer & Appointment Letter Automation**
Built directly on the Phase 0.1 engine: generate the offer/appointment letter, route through internal approvals, send to the candidate, collect signature and any required documents — no manual HR follow-up.

**4.4 Induction Self-Serve Portal**
A simplified, easy-to-read landing point for new joiners: policies, culture book, company presentation, HR event/leave rules. *Dependency note:* this is content-bound, not engineering-bound — HR needs to supply/finalize the actual content (culture book, presentation, policy docs in a simplified format) in parallel with the build, or the portal ships empty.

**4.5 Product Training Module**
Basic EMotorad product knowledge (bikes/scooters) for new joiners, delivered as part of induction. Same content dependency as 4.4 — needs source material (specs, positioning, FAQs) from the product team.

---

## 5. Phase 3 — Lifecycle & exit

**5.1 Exit Formalities & Documentation**
Mirrors 4.3, reusing the Phase 0.1 engine: clearances, full-and-final paperwork, exit documentation, automated the same way appointment letters are. Also the point where Phase 3.2 (Asset Management) return-reconciliation gets wired in.

**5.2 Engagement & Pulse Survey**
Anonymous monthly detailed pulse survey + a lighter daily morning mood check, delivered by email and/or embedded in Keka (WhatsApp explicitly excluded per current scope). Anonymity needs to be a genuine design constraint — responses aggregated, no way to trace an answer back to an individual, which affects both the data model and the reporting layer from day one.

---

## 6. Phase 4 — Analytics & expansion

**6.1 HR Analytics Dashboard**
Attrition rate, retention rate, cost per hire, hiring TAT, etc., pulled live from Keka and the systems built in Phases 2-3 rather than compiled manually. Sequenced last because it's most useful once there's real data flowing from the hiring/exit/asset systems it reports on.

**6.2 Vendor Coordination**
Two distinct threads worth scoping separately when this phase starts: (a) blue-collar/third-party workforce vendor coordination, and (b) HRMS/platform vendor coordination. Lower urgency, smaller manual burden today than hiring/onboarding.

**6.3 Consultants & International Team Platform**
A separate documentation/management track outside the core FTE HRMS flow, for a smaller population than the main employee base. Can reuse the Phase 0.1 document engine, but needs its own data model given different document types (consulting agreements, tax/visa documentation for international hires).

---

## 7. Parked (explicitly out of scope for now)

- WhatsApp-based engagement automation (polls/activities) — revisit once email/Keka-based engagement is live.
- LinkedIn-based sourcing — Naukri only for this phase.

---

## 8. Open items to close before/while Claude Code starts building

1. Confirm Keka's API access tier and which modules (onboarding, documents, eSign, BGV, compliance) are actually enabled on the current plan.
2. Confirm Naukri's integration path — API/partner program access vs. manual export fallback.
3. Pick an eSign approach: Keka's native module (if available) vs. a standalone provider.
4. HR to start assembling induction content (culture book, company presentation, simplified policy docs, product training material) in parallel with Phase 2 engineering — this content is the actual bottleneck for 4.4/4.5, not the build.
5. Define the statutory compliance calendar (PF/ESI and anything else) to seed Phase 1.1.

---

## Appendix — Full use case reference

| # | Use case | Phase |
|---|---|---|
| 1 | Resume screening & ranking (Naukri) | 2 |
| 2 | Background verification tracking | 2 |
| 3 | Offer & appointment letter automation | 2 |
| 4 | Induction self-serve portal | 2 |
| 5 | Product training module | 2 |
| 6 | Engagement & pulse survey | 3 |
| 7 | HR analytics dashboard | 4 |
| 8 | Compliance reminders | 1 |
| 9 | Vendor coordination | 4 |
| 10 | Consultants & international team platform | 4 |
| 11 | Exit formalities & documentation | 3 |
| 12 | Asset management | 1 |
| 13 | HR-only restricted document repository (+ audit trail) | 0 |
| — | Document & Approval Workflow Engine (infrastructure) | 0 |
| — | WhatsApp-based engagement | Parked |
| — | LinkedIn sourcing | Parked |
