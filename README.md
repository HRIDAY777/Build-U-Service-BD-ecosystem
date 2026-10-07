# U Service BD

A working local implementation of a multi-division commerce and service platform for Bangladesh, using Django REST Framework and Next.js. Bangla is the default public language, with an English switch.

This is an initial implementation, **not a completed production launch**. The full requested scope is preserved in `REQUIREMENTS.original.txt`.

## Implemented

- Corporate homepage, division browsing, searchable catalog and editable content pages.
- Shared customer accounts, session authentication, CSRF protection and permission checks.
- Cart, server-calculated checkout quotes, COD orders, stock reservations, coupons and printable invoices.
- Service bookings, parcel delivery requests, staff assignment and validated status transitions.
- Private prescription uploads and authorized human review.
- Customer account, staff operations and partner catalog/inventory screens.
- Support tickets, leads, notifications, consent records, audit history and basic reporting.
- Transactional outbox and configurable notification, CRM and email automation rules.
- Credential-gated knowledge assistant and SSLCOMMERZ integration code.
- Database migrations, demo catalog, Docker configuration and automated tests.

## Run locally on Windows

Use Python 3.13 and Node.js 22. From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Start the backend in one terminal:

```powershell
cd backend
$env:DJANGO_DEBUG = 'true'
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py seed_demo
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001
```

Start the frontend in another:

```powershell
cd frontend
npm.cmd ci
$env:API_INTERNAL_URL = 'http://127.0.0.1:8001'
npm.cmd run dev
```

Open <http://127.0.0.1:3000>. Register your own customer account through the website. Demo seeding creates no usable login passwords and no fabricated transaction history.

Create an administrator from the backend directory with `..\.venv\Scripts\python.exe manage.py createsuperuser`, with `DJANGO_DEBUG=true` still set. Administration is at `/admin/`; the operations screen is at `/portal`. Assign Django groups and permissions deliberately. Operational changes use the validated API workflows rather than direct record editing in the admin.

SQLite is the local development default. PostgreSQL is the intended deployment database; SQLite tests do not establish production concurrency behavior.

## Verification

From `backend`, with `DJANGO_DEBUG=true`:

```powershell
..\.venv\Scripts\python.exe manage.py test
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

From `frontend`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd exec playwright install chromium
npm.cmd run test:e2e
```

Browser tests require both development servers and the demo catalog. They create clearly labeled local test accounts and records; do not run against production. `CHROMIUM_PATH` optionally selects an existing browser executable.

At the initial handoff, 32 backend tests and 3 browser tests passed, and the frontend production build succeeded. The browser tests cover registration, checkout, cancellation, booking, parcel requests, support, partner applications and desktop/mobile layout. Gateway tests use controlled responses; they do not prove a live merchant integration.

## Configuration and deployment status

`.env.example` lists configuration names. Local commands read shell environment variables; they do not automatically load `.env`. Docker Compose reads `.env`. Never commit real secrets, private uploads or database files.

The Compose configuration includes PostgreSQL, Redis, Django, Celery workers/Beat, Next.js and an internal Nginx proxy. It requires explicit database credentials, a strong Django secret, migrations and static asset collection. Nginx is configured for a trusted HTTPS terminator and binds to loopback; it is not a public TLS setup by itself. Docker deployment has not been verified end to end.

Before launch, complete and validate:

- Domain/subdomain routing and secure cross-subdomain SSO. Current local flows share one origin; separate subdomain SSO is not implemented.
- Live payment sandbox certification, timeout reconciliation, refund execution and settlement accounting. Current refund records are requests, not executed payouts.
- Business-approved fees, taxes, contracts, service coverage, pharmacy procedures and privacy/retention policies.
- Staff MFA, email verification/password recovery, upload malware scanning, backups, restore drills and monitoring.
- PostgreSQL concurrency/load tests and a production security review.
- Full variants/options, wallet/redemption, returns, advanced promotions, partner onboarding documents and provider eligibility rules.
- WhatsApp, SMS, Meta CAPI, advertising attribution, mapping and storage integrations. Reserved environment variables do not mean those integrations are implemented.
- Vector retrieval, broader AI workflows, model fallback and full AI cost budgeting. The current assistant uses approved public text retrieval and cannot take business actions.

SSLCOMMERZ initiation and independent server verification follow the [provider documentation](https://developer.sslcommerz.com/doc/v4/). Payment redirects alone never mark an order paid. Credentials and a reachable HTTPS callback are required; online payment is unavailable without them.

The assistant requires `AI_CHAT_ENDPOINT`, `AI_API_KEY` and `AI_MODEL` for an HTTPS chat-completions-compatible provider. It is unavailable without configuration. AI cannot approve prescriptions or execute financial actions.
