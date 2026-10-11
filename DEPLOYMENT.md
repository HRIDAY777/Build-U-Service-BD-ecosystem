# Deployment and operational readiness

Do not deploy to production without required user authorization. No deployment is performed by this document. Existing setup: `README.md`, `compose.yaml`, `infra/nginx.conf`, `.env.example`, `docs/PRODUCTION_CHECKLIST.md` and `docs/INTEGRATIONS.md`.

## Local development

Use the existing Python virtual environment, `DJANGO_DEBUG=true`, Django migrations, and Next dev with `API_INTERNAL_URL` pointing to the local backend. Do not seed demo data outside DEBUG or replace production data. Current local ports are frontend 3000 and backend 8002.

## Staging prerequisites

Compose defaults to the private `.env` file. `APP_ENV_FILE` can select another explicitly chosen private environment file. The example file may be used for configuration-only validation with test placeholders; it cannot launch a production service. Syntax validation is separate from executing containers.

1. Choose hosting, PostgreSQL/Redis and trusted TLS termination. Provision DNS explicitly; intended subdomains are not currently configured applications.
2. Set secret key, database password/URL, allowed hosts, CSRF origins and Redis settings in private server configuration; never in Git or chat.
3. Build images; run migrations and collectstatic as documented; retain DB/private-media volumes. Validate non-root permissions and authenticated private downloads.
4. Start one Beat scheduler and appropriate workers; monitor outbox/run retries. Production email requires SMTP delivery verification.
5. Configure private storage/scanning, log retention, alerts and access-limited backups. Back up PostgreSQL and private files consistently, encrypt and document retention. Test restoration in an isolated environment, never over live data.
6. Run PostgreSQL locking/concurrency tests and the real browser suite against staging. Verify privacy, prescriptions, order/booking/delivery flows and permitted financial operations.
7. Configure payment merchant sandbox and server callbacks; separately build/verify project payments, payouts and certified signature integrations when approved accounts are available.

## Acceptance evidence still required

Docker stack execution, staging identity/domain routing, SMTP/provider delivery, gateway certification, private storage/scanning, backup restoration, load/performance, MFA/security review and explicit release approval. Do not equate a build, health response or mock callback with these results.

## Executed local Docker database

An isolated PostgreSQL 15 container is running on localhost:15432 and powers the backend at 8002. SQLite backup/import verified 1,633 records across 35 models. Credentials and backups remain ignored. Restart instructions: docs/LOCAL_POSTGRES.md. The full production stack, external providers and staging concurrency/load validation remain unverified.

## Automation retry operations

Apply automation.0002 before running the updated worker/admin. Grant view_automationrun and retry_automationrun only to designated active staff. The retry admin action queues work; existing outbox dispatch/worker must run to execute it. Local PostgreSQL migration and admin login were verified, but Redis/Celery/Beat services were not started. External email retries need delivery-record inspection because DB rollback cannot undo external sends. See docs/AUTOMATION_RETRIES.md.
