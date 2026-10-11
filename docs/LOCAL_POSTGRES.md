# Local Docker PostgreSQL

The local website uses isolated container `uservicebd-local-db-1`, PostgreSQL 15 at **127.0.0.1:15432**. PostgreSQL 17 downloads failed; the existing PostgreSQL 15 image was available. Windows PostgreSQL at port 5432 is unchanged. This is local development, not the full production stack.

Credentials are in ignored `.env.docker.local`; never commit or print it. Keep that file with the persistent volume `uservicebd-local_local_postgres_data`. Do not remove the volume or run `down -v` to restart development.

From the repository root in PowerShell:

```powershell
docker compose --env-file .env.docker.local -f compose.local.yaml up -d --pull never db
./scripts/run-local-postgres.ps1 -Mode check
./scripts/run-local-postgres.ps1 -Mode run
```

Backend port: 8002. Frontend: `API_INTERNAL_URL=http://127.0.0.1:8002`, then the existing `npm run dev` (3000). Bare `manage.py` without `DATABASE_URL` defaults to SQLite; use the helper for PostgreSQL. `-Mode migrate` applies migrations; `-Mode test` creates separate disposable `test_uservice`.

SQLite backup and UTF-8 fixture: ignored `backend/artifacts/postgres-transfer-20261011-145916`. Imported and verified **1,633 records across 35 models**, retaining primary keys, password hashes and private media references. Permissions/content types were recreated by migrations, with natural foreign keys resolving permission relationships. Original SQLite and private media remain intact. New writes go to PostgreSQL; SQLite is an old snapshot, not synchronized.

`scripts/transfer-local-postgres.py export` backs up and exports SQLite with the site stopped. `import --snapshot <folder>` refuses populated target models, imports transactionally and verifies counts. It is for fresh isolated local targets, not production migration or merging databases. Backups contain private data and must remain access limited and outside Git.

PostgreSQL testing exposed a schedule row lock on a nullable join; it now locks only the offering row. Streaming-response cleanup tests suppress their synthetic request-finished signal to preserve TestCase's enclosing transaction. Production response cleanup is unchanged.

Final verification: all **142 backend tests passed on PostgreSQL** using the separate disposable test database. Two real browser tests, frontend lint/typecheck/production build, Ruff and Django system check passed. This does not establish production deployment or concurrency/load acceptance.

## Targeted concurrency tests

Run `./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.catalog.test_partner_concurrency`. Three tests passed on PostgreSQL using distinct thread connections, start barriers and lock/statement timeouts. They cover one-business approval, one-open-renewal across different approved sources and one expiry notification. These tests are skipped on SQLite. The disposable test database is removed afterward; live data is untouched.

## Booking transaction checks

Run `./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.operations.test_booking_concurrency`. Four PostgreSQL tests passed for retry identity, changed retry details, overlapping assignments and adjacent appointments. SQLite skips the tests. Live data is unchanged; the separate test database is removed afterward. These are selected regression scenarios, not full load validation.

## Checkout transaction checks

Run `./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.operations.test_checkout_concurrency`. Four tests passed for last-unit stock, checkout retries, variant stock and coupon exhaustion across different products; inventory/audit/outbox effects are verified once. SQLite skips these row-lock tests. The isolated disposable test database is removed; live data is unchanged.

## Order reversal checks

Run `./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.operations.test_order_reversal_concurrency`. Covers simultaneous cancellations and full/partial refund reservation limits, plus variant rejection/return restoration. Details and payment limitations: docs/ORDER_REVERSALS.md.
