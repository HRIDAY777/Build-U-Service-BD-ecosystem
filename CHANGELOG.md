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

## Earlier implementation records

See `docs/FEATURE_STATUS.md`, `docs/MASTER_PROMPT_AUDIT.md` and workflow documents for previously delivered commerce, providers, restaurants, delivery, wishlist, events and private project accounting. Git commits remain the detailed change record. Their local completion does not certify live integrations.
