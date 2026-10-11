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

## Earlier existing work

See `docs/FEATURE_STATUS.md`, `docs/MASTER_PROMPT_AUDIT.md` and workflow documents for previously delivered commerce, providers, restaurants, delivery, wishlist, events and private project accounting. Git commits remain the detailed change record. Their local completion does not certify live integrations.
