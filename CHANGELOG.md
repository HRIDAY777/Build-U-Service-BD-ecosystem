# Changelog

## 11 October 2026 — enterprise audit and initial stabilization

- Audited existing modular backend, frontend workflows, schema/migrations, authentication, automation, APIs, infrastructure and prior documentation against the new request.
- Created the eight continuity records requested by the user. Preserved previous implementation and original requirements.
- Baseline full Django suite: 119 passed. Local browser servers required restarting before verification.
- Completed private project history preserves authorization, pagination and no-store caching and redacts raw audit metadata.
- Added email or username login with case-insensitive email matching, generic failures, inactive-user handling and ambiguous-identity rejection.
- Isolated automation rule writes with savepoints; real database failure and partial notification rollback/retry tests pass.
- Explicit CI app discovery and configurable Compose environment file, preserving `.env` as default.
- Updated full backend: 125 passed; Ruff, migration drift, lint/typecheck, production build and Compose configuration validation passed. Entire local browser suite: 17 passed. Final history cache/privacy regression passed separately.

## 11 October 2026 — account security history

Authenticated self-scoped event history, Preferences refresh/pagination, no-store/redacted output and audit lookup index added. Seven account tests, Ruff/migration drift, frontend lint/typecheck and build passed. Targeted browser results are recorded in `PROJECT_STATUS.md`.

## 11 October 2026 — private partner onboarding

- Added authenticated applicant/reviewer workflow, private PDF files and expiry validation, withdrawal and corrections, guarded approval and organization creation.
- Added bilingual application page and footer entry, read-only Django admin, migration `catalog.0011` and workflow documentation.
- Full backend 132 passed before final self-review protection; five updated onboarding tests passed afterward. Two targeted browser tests passed; Ruff/drift/lint/typecheck/build passed. Renewal, scanning and specialist legal review remain incomplete.

## 11 October 2026 — individual partner document review

- Required separate accepted/rejected decisions, reviewer notes and timestamps before application approval; audit records include actor, note and immutable file hash.
- Added bilingual document controls/results and guarded self-review, expired acceptance, inactive files and terminal application decisions. Migration `catalog.0012` preserves existing business approvals.
- Six onboarding tests, Ruff/drift, frontend lint/typecheck/build passed. Real applicant/PDF/download/cancellation browser test passed. Controlled reviewer UI/mobile test passed after correcting an ambiguous test selector; it is not a live reviewer or legal certification test. Prior full-suite counts are historical.
- Remaining: renewal/suspension monitoring, private production scanning/storage/retention and specialist eligibility.

## 11 October 2026 — partner document expiry notices

Added private expiry summaries and bilingual renewal notices for documents expiring within 30 days. Missing expiry and withdrawn files are handled explicitly; previous approvals remain unchanged. Seven targeted backend tests, lint/typecheck and the controlled reviewer/mobile browser test passed. No automatic renewal, notifications or suspension is claimed.

## 11 October 2026 — partner document renewal submissions

Added approved-applicant renewal requests, open-renewal reuse, protected source records and guarded approval to the existing business. Renewals use new individually reviewed documents and cannot change business identity or restore a suspended/transferred organization. Migration `catalog.0013` preserves existing records. Nine onboarding tests, full backend 137 tests, Ruff/drift/lint/typecheck/build and three targeted browser tests passed (two controlled fixtures and one real applicant workflow). Production monitoring/scanning and specialist approvals remain open.

## Earlier feature records

See `docs/FEATURE_STATUS.md`, `docs/MASTER_PROMPT_AUDIT.md` and workflow documents for previously delivered commerce, providers, restaurants, delivery, wishlist, events and private project accounting. Git commits remain the detailed change record. Their local completion does not certify live integrations.
