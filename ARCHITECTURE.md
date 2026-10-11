# U Service BD architecture

Preserve the existing modular monolith. Django/DRF is the authoritative backend; Next.js/React/TypeScript provides the customer/partner/provider/rider interfaces. Existing CSS and Tailwind tooling remain in place. There is no justification for a rewrite or premature microservices.

## Current boundaries

- `accounts`: user identity, sessions, profile, addresses, consent and deletion requests.
- `catalog`: divisions, organizations, categories, offerings, variants, food options, schedules, coverage and wishlist.
- `operations`: transactional checkout/stock, orders, service/provider/rider workflows, events, prescriptions, gateway records, returns/refunds and audit.
- `engagement`: leads, support, notifications, reviews, loyalty, reports and project accounts.
- `content`: published bilingual pages and FAQ.
- `automation`: durable outbox/rule runs, approved knowledge and credential-gated read-only assistant.

Database migrations own schema changes. PostgreSQL is the production target; local SQLite is development evidence only. Financial writes use transactions and guarded permissions. Redis backs configured cache/Channels and Celery; workers/Beat are separate services. Private files are accessed through authenticated endpoints, never public media routes.

## Current request path

Browser -> Next site / loopback proxy -> versioned Django APIs -> database. Production Compose defines Nginx routing for API/admin/health/static and Next for other pages behind an external trusted HTTPS terminator. Session cookies and CSRF are same-origin today. No raw card data or client-only paid assertions are accepted.

## Intended domains, not provisioned domains

`www` corporate; `food`, `pharmacy`, `electrician`, `mechanic`, `shop` verticals; `account`, `admin`, `partner`, `api` shared infrastructure under uservicebd.com. Existing paths remain valid until a tested host-routing migration is prepared. Do not broaden the session cookie to all subdomains as a substitute for a reviewed identity protocol. DNS, callback origins, TLS, canonical URLs and authentication handoff need an explicit staging design.

## Gaps

Email sign-in accepts the existing login `username` field as username or case-insensitive email. It rejects ambiguous legacy email/username collisions and leaves admin authentication/session protocols unchanged. Phone verification and subdomain identity remain separate work.

Channels configuration has no active WebSocket routing. S3 variables have no storage adapter. AI is not a tool-using agent platform. Commission/settlement rules need approved business inputs. Live gateway/refund/payout/signature integration, scanners, observability, backups and production concurrency remain acceptance gates.

## Local database execution

The current local backend uses isolated Docker PostgreSQL 15 at localhost:15432 via scripts/run-local-postgres.ps1; bare Django still defaults to SQLite when DATABASE_URL is absent. Original SQLite is a preserved snapshot. Private media stays in the existing backend media directory. Partner history reuses scoped AuditLog events with no public raw metadata.

## Automation retry budget

AutomationRun now stores attempt_limit, default five. The existing worker checks this budget; authorized staff can add one attempt to an exhausted failed run while retaining total attempts. Queueing and audit commit together per run, locking event before run to match processing. Django admin remains read-only apart from the explicit retry action.
