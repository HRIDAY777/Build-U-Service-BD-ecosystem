# Project status — 11 October 2026

## 16 October 2026 — provider service-area matching

Staff can restrict each provider to selected service areas. Booking-specific provider choices and locked assignment require matching area name, active area and service-division coverage. Empty restricted coverage blocks new jobs; provider self-service cannot change coverage. Staff changes are audited under the provider account lock. Existing unrestricted/manual coverage remains until staff configures it; no real geographic eligibility is inferred. Existing jobs are retained and GPS/radius routing is outside this feature.

Verified: 21 PostgreSQL provider, scheduling and concurrent-booking tests passed, including stale coverage rejection, inactive/wrong-division coverage, self-edit prevention and admin audit. Ruff and migration drift passed; additive migration operations.0020 applied locally. No frontend change or new full-suite result is claimed.

## 16 October 2026 — service-specific provider approvals

Added an opt-in required-qualification flag per offering and staff-managed exact-service approvals per provider. Booking-specific choices and assignment both enforce it; missing/wrong/revoked approvals fail closed. Providers cannot self-approve. Admin changes are audited and share the assignment account lock. Existing services retain manual review until staff enables the flag; no qualifications were invented. Area matching, professional certification and capacity reservations remain open.

Verified: 18 PostgreSQL provider/schedule/booking-concurrency tests, then one admin approval/audit test passed; Ruff and migration drift passed. Both additive migrations applied locally. No frontend changes or new full-suite result is claimed.

Existing project: U SERVICE BD LIMITED, intended official domain https://www.uservicebd.com. Development continues in the existing Django/Next repository; no rebuild or database reset is authorized or required.

The initial phase 1 audit and selected phase 2/3 fixes are delivered. This does not complete all ten phases. Detailed status: `IMPLEMENTATION_AUDIT.md`, `FEATURE_MATRIX.md`, `DEVELOPMENT_ROADMAP.md`. New requirements are preserved as `REQUIREMENTS.ecosystem.txt`; older requirements remain unchanged.

## Baseline executed this milestone

- Initial full backend baseline: 119 tests passed; updated full suite after fixes: **125 passed** on local SQLite.
- Django system check, migration drift check and backend Ruff passed.
- Frontend lint/typecheck and production build passed with private application history and email login.
- Docker Compose configuration-only validation passed with example/test settings; containers were not executed.
- Browser tests initially failed because the local website server was stopped. After restart, the entire **17-test suite passed**, including real ordering/booking/delivery, partner catalog, email login, project history/downloads, scheduling, locations, photos, language and wishlist. Reviewer pagination is a controlled mock test, separately identified.
- Final history no-store header and privacy regression passed after the full suite; no application migration was introduced in this milestone.

## Current implementation

Private project history is implemented and verified, including privacy, pagination, no-store headers, Bangladesh timestamps and refreshed cancellation events. Email or username sign-in is implemented with ambiguous-identity protection. Automation savepoints isolate failing rules and roll back partial notification effects; CI discovery and Compose configuration were improved. Most core commerce/service workflows already exist; major gaps are centralized subdomain identity, verified phone login, business verification, commission/settlement infrastructure, expanded AI/agents and production operations. Existing manual finance records are not payment execution.

Next work: partner renewal monitoring and staff MFA/automation dead-letter monitoring; then continue remaining roadmap gates. No business rates or live credentials have been invented.

## Delivered milestone: account security history

Added a private paginated security history endpoint and Preferences UI, event whitelist/no-store headers and an audit lookup index (`operations.0015`, applied locally). See `docs/ACCOUNT_SECURITY.md`. Seven account tests, Ruff/migration drift, frontend lint/typecheck and production build passed. Both targeted browser tests passed: real email login/security history and existing project-history/download/cancellation regression. MFA, device inventory and failed-login monitoring are not implemented by this feature.

## Delivered milestone: private partner applications

Added bilingual `/partner-application`, private scoped PDF upload/download/withdrawal, applicant edits/cancellation, permission-gated review and guarded creation of a new approved organization. Reviewers cannot review their own application; existing businesses and applicant staff privileges are preserved. Migration `catalog.0011` is applied locally; Django admin records are read-only. Details and remaining policy/scanning/renewal gaps: `docs/PARTNER_APPLICATIONS.md`.

Executed: full backend suite **132 passed** before the final self-review guard; the updated **five onboarding tests passed** after that guard. Ruff, migration drift, frontend lint/typecheck and production build passed. **Two targeted browser tests passed**: actual partner application/PDF/private download/reload/cancellation and email login/security history. Full prior 17-browser results remain historical; no PostgreSQL concurrency or legal verification is claimed.

## Follow-up: individual partner document decisions

Added accepted/rejected/pending document status, required reviewer notes/timestamps, audited decisions, expiry/self-review/terminal-state guards and an approval gate requiring every active document to be accepted. Bilingual reviewer controls and applicant decision display are implemented. Migration `catalog.0012` is applied locally; earlier approvals are preserved. Six onboarding tests, Ruff/drift, frontend lint/typecheck/build passed. Browser results are recorded in the changelog. Renewal monitoring, scanning and specialist licensing remain open.

## Follow-up: document expiry display

Private document responses and the bilingual page now show expiry status and a 30-day renewal reminder, calculated from the Bangladesh local date. Seven onboarding tests passed, including missing dates, yesterday/today, 30/31-day boundaries and withdrawn documents. Frontend lint/typecheck and a controlled reviewer/mobile browser test passed. No migration needed. Automatic monitoring/notifications, approved-document renewal submission and business suspension remain unimplemented.

## Delivered milestone: partner renewal submissions

Approved applicants can open a separate renewal with new private documents. Repeated requests reuse the same open renewal; approval requires individual document acceptance and reuses the existing organization. Business identity/division/address and historical approved records remain protected. Migration `catalog.0013` is applied locally without resetting data.

Nine targeted onboarding tests and the full **137-test backend suite passed** on local SQLite. Ruff, migration drift, frontend lint/typecheck and production build passed. **Three targeted browser tests passed**: actual applicant/PDF/download/cancellation plus controlled document-review/mobile and renewal UI fixtures. The controlled fixtures do not certify a live staff session or PostgreSQL concurrency. Automatic notifications/monitoring, suspension policy, scanning and specialist licensing remain open.

## Follow-up: private application search and filters

Added permission-scoped business/area/phone/reference search, status and initial/renewal filters with validation and pagination. Bilingual Apply/Clear controls, matching counts and empty results are implemented. Ten onboarding tests, Ruff and frontend lint/typecheck passed; the real applicant/document browser test now also verifies no-match filtering and reset. No migration was needed. Full 137-test evidence from the previous milestone is historical; a new full suite was not required for this list-only change.

## Follow-up: private renewal reminders

Added account inbox renewal reminders, applicant-scoped manual checking, daily Celery task/management command and unique per-document/expiry deduplication. Latest approval, active/current owner, organization approval and division eligibility are checked; reminder/message writes roll back together on failure. Migration `catalog.0014` is applied locally. Thirteen onboarding tests, Ruff/drift and frontend lint/typecheck passed; the real applicant browser test verifies the manual-check endpoint. Redis/worker/Beat production execution is not verified. Existing full 137-test results are historical.

## External configuration and policies still required

No approved live project payment/payout/certified signature accounts exist. Domain/DNS/hosting, SMTP/SMS/WhatsApp/storage/maps/AI services and business approval/commission/settlement policies remain necessary. Continue independent work; do not invent credentials or rates.

## Continuation rule

Read the audit, roadmap and changelog before implementation. Keep existing contracts/data. Run meaningful checks, update status with executed evidence, then commit/push authorized changes. Do not treat pages, environment variables or old test counts as proof of full completion.

## Local PostgreSQL and partner history

The local backend now uses isolated Docker PostgreSQL 15 on localhost:15432. Backed up SQLite and imported/verified 1,633 records across 35 models; original SQLite, Windows PostgreSQL and private media preserved. See docs/LOCAL_POSTGRES.md for restart and backup details. Private partner history adds scoped paginated events with generic actors and no raw metadata. Frontend lint/typecheck/build, Ruff and system check passed; two real browser tests passed on PostgreSQL (email login and partner upload/history/cancellation). PostgreSQL tests exposed a nullable schedule join lock and synthetic streaming-test cleanup issues; both were corrected.

Final verification: all **142 backend tests passed on PostgreSQL** using the separate disposable test database. Two real browser tests, frontend lint/typecheck/production build, Ruff and Django system check passed. This does not establish production deployment or concurrency/load acceptance.

## PostgreSQL concurrent partner workflows

Three real PostgreSQL TransactionTestCase tests passed using separate thread connections and bounded lock/statement timeouts: duplicate approval produces one organization and one approval audit event; renewal from different approved applications for the same business produces one pending renewal and one renewal audit event; simultaneous reminder checks produce one notification/reminder. The local runner supports selected TestLabels. Previous 142-test and two-browser results are historical to the preceding milestone. No product code change was needed. Broader order/payment concurrency, load and production acceptance remain open.

## PostgreSQL booking concurrency

Four targeted PostgreSQL transaction tests passed: identical simultaneous retries return one booking and one creation audit; changed payloads with the same key produce one booking plus a validation rejection; overlapping appointments assigned simultaneously cannot share one provider; adjacent appointments can share that provider. Ruff passed. No product code change was needed. Pending customer requests can coexist; provider assignment is the conflict gate, not a global one-request-per-service capacity rule. Broader commerce/payment, schedule-change races and load acceptance remain open.

## PostgreSQL checkout concurrency

Four targeted PostgreSQL transaction tests and Ruff passed: two buyers cannot purchase one last unit; simultaneous retry reserves once and returns the same order; variant stock cannot be oversold and leaves base stock intact; separate products competing for the last coupon use create one order and consume the coupon once. Assertions also verify one inventory movement, audit and outbox event. Existing product code passed without changes; live data remained untouched. Payment/refund/cancellation races and broader load testing remain open.

## Variant stock restoration fix

Cancelled/rejected/returned variant orders now restore the selected variant and record its identity in the positive inventory movement. Base stock remains unchanged for variant lines. Reversals acquire inventory locks in the same ordered product-then-variant sequence as checkout. Added concurrent cancellation and full/partial refund reservation regressions plus rejection/return variant checks. See docs/ORDER_REVERSALS.md for boundaries, including historical stock reconciliation and refund-request limitations.

Verification: full PostgreSQL suite **157 passed** after the stock correction; afterward the final reversal module **5 passed**, including newly added rejection/return checks. Ruff passed and the restarted PostgreSQL backend returned HTTP 200. No frontend changes were made; no new frontend build or browser result is claimed for this milestone.

## Automation failure monitoring and controlled retries

Added read-only Django admin monitoring with exhausted-run/status/action filters and rule/topic search. Active staff with view_automationrun plus retry_automationrun can queue exactly one extra attempt for an exhausted failed run (maximum 50 selections). Counters and previous error types are retained, each authorization is audited, successful rule runs are skipped, and event-first locking prevents duplicate concurrent grants. Migration automation.0002 is applied to local PostgreSQL; admin login returns HTTP 200. See docs/AUTOMATION_RETRIES.md. Local Celery/Redis/Beat workers were not started, so queued work requires the configured worker. Full PostgreSQL suite 164 passed before final filter/inactive-user assertions; final targeted results follow.

Final verification: all eight targeted automation tests passed on PostgreSQL after the final exhausted-filter, changed-trigger and inactive-user assertions. Full 164-test suite passed earlier in this milestone. Ruff and migration drift passed. Worker/external delivery was not executed.
