# U Service BD

A working local implementation of a multi-division commerce and service platform for Bangladesh, using Django REST Framework and Next.js. Bangla is the default public language, with an English switch.

This is an initial implementation, **not a completed production launch**. The full requested scope is preserved in `REQUIREMENTS.original.txt`.

The language switch now covers shared navigation/footer, account controls, event form labels and service names, wishlist controls, support, reviews, returns, loyalty and checkout notices. UI translations are maintained in `frontend/src/lib/translations.ts`; API values and customer-entered content retain their original values. The selected language persists across reloads.

## Implemented

See [the master-prompt phase audit](docs/MASTER_PROMPT_AUDIT.md) and [the feature audit](docs/FEATURE_STATUS.md) for 26 working local feature groups and the remaining implementation and external dependencies. This count is not a completion percentage.

- Corporate homepage, division browsing, searchable catalog and editable content pages.
- Catalog price ranges, stock filtering and price/name/recent-update sorting, with filters preserved across division changes and pagination.
- Public category browsing and category filtering within active divisions, with category selection reset when changing divisions.
- Searchable, paginated stores/provider directory at `/stores`, with name/area/division filters and links to each approved business's catalog.
- Shared customer accounts, session authentication, CSRF protection and permission checks.
- Password change, password recovery and single-use email verification flows.
- Customer saved addresses with owner-only access and profile export.
- Shared Bangladesh location picker for checkout, booking, parcel pickup/drop-off, saved addresses and events; search in Bangla/English and select division → district → upazila/thana → union/area. Selected geography is retained in the address line (event notes for venue requests).
- Bundled community location data currently contains 8 divisions, 64 districts, 576 upazila/thana records and 4,540 union/area records. It is not a complete official register; villages/unlisted localities use manual entry. Source, pinned revision and MIT license are in `frontend/public/data/bangladesh/`. Geographic selection does not grant delivery coverage.
- Business directory locality suggestions and Django admin address selectors use the same bundled data.
- Checkout saved-address selection and optional address saving after purchase.
- Notification unread counts, single-item read state and mark-all-as-read support.
- Account-wide session invalidation from customer preferences.
- Account deletion request workflow with idempotent submission and admin review.
- Wishlist with duplicate protection, catalog save buttons, and a customer wishlist page.
- Wishlist sharing with revocable public links and opted-in price-drop/restock notifications. Sale prices and variant stock are checked; notifications appear in the account. [Wishlist setup](docs/WISHLIST.md) explains the five-minute background schedule and local checks.
- Product variants with catalog attributes, per-variant SKU/pricing/stock, option selection, and checkout stock reservation; sale prices are applied server-side and cost prices are never public.
- Shop return requests, owner-only access, staff review, received/closed workflow, audit records, and customer notifications at `/returns`.
- Customer loyalty balance and paginated points statement at `/loyalty`, with admin-configured rewards, redemption history and fulfillment status; clients cannot modify the ledger directly, and reward delivery remains manual.
- Customer ratings and review history at `/reviews`, with a paginated picker of their own completed purchases that have not yet been reviewed.
- Paginated return requests and eligible delivered shop orders, including older purchases and duplicate-request protection.
- Wedding and event planning requests with date, venue, guest count, budget, service selections, and status tracking.
- Authorized staff event review and status transitions with audit records.
- Staff event quotations with customer-visible quoted budget and planning notes.
- Customer quote acceptance and confirmation with protected event status flow.
- Service/provider weekly schedules, closed dates and leave, a private provider calendar, Bangladesh-time booking, duration snapshots and service-hour-based time suggestions. [Scheduling guide](docs/SERVICE_SCHEDULING.md).
- Extended local demo: 144 extra listings, 12 businesses and 152 active Dhaka city/district service areas, with owner catalog pagination. [Demo guide](docs/EXTENDED_DEMO_DATA.md).
- Food option groups with required/optional choices, owner editing, extra prices, distinct cart lines and immutable order snapshots.
- Restaurant owner controls for pause/resume, Bangladesh-time weekly/overnight/all-day hours, minimum food subtotal and preparation estimates. Public restaurant pages show these rules; quote and checkout enforce them again. [Restaurant guide](docs/RESTAURANT_OPERATIONS.md).
- Cart, server-calculated checkout quotes, COD orders, stock reservations, coupons and printable invoices.
- Service bookings, parcel delivery requests, staff assignment and validated status transitions.
- Dedicated provider workspace at `/provider`: private assigned jobs, status filters, pagination, customer contact, validated progress, availability controls and assignment by provider name. Unavailable providers cannot receive new work; appointment overlap checks remain enforced.
- Private prescription uploads and authorized human review.
- Customer account, staff operations and partner catalog/inventory screens.
- Support tickets, leads, notifications, consent records, audit history and basic reporting.
- Paginated support desk at `/support`, permission-checked staff replies, customer notifications and customer-only reopening of resolved tickets. Ticket status changes use the API workflow; admin ticket records are read-only.
- Support conversations preserve each team reply and customer follow-up, with private paginated message history. Existing latest replies are retained during migration; older overwritten replies cannot be recovered.
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

The full backend run on 10 October 2026 passed 103 tests, including delivery pricing, idempotency, dispatch, privacy, handover, failure/returns and cancellation. Frontend lint and TypeScript checks passed. The Next.js production build also passed on 10 October 2026 after correcting Suspense boundaries for password recovery and email verification. Windows SWC requires running outside the restricted filesystem sandbox. The latest full browser run passed five tests covering registration, checkout, cancellation, booking, parcel requests, support, partner applications, desktop/mobile layout, cascading Bangladesh location selection, and subject photos on home, weddings, products and stores. Gateway tests use controlled responses; they do not prove a live merchant integration.

## Demo photography

Local Pexels photographs illustrate products, providers and weddings; they are labeled as stock/demo previews and do not identify actual providers or customer events. Demo organizations use clearly labeled fictional Dhanmondi addresses. Real offering image URLs take priority over demo stock. District photographs include source, author and license metadata in `frontend/public/images/districts/manifest.json`; users can inspect attribution on `/photo-credits`. `frontend/prepare_district_photos.py` can resume downloading licensed district photographs from Wikipedia/Wikimedia Commons. District selection displays the matching photograph in address forms.

## Configuration and deployment status

`.env.example` lists configuration names. Local commands read shell environment variables; they do not automatically load `.env`. Docker Compose reads `.env`. Never commit real secrets, private uploads or database files.

The Compose configuration includes PostgreSQL, Redis, Django, Celery workers/Beat, Next.js and an internal Nginx proxy. It requires explicit database credentials, a strong Django secret, migrations and static asset collection. Nginx is configured for a trusted HTTPS terminator and binds to loopback; it is not a public TLS setup by itself. Docker deployment has not been verified end to end.

Before launch, complete and validate:

- Domain/subdomain routing and secure cross-subdomain SSO. Current local flows share one origin; separate subdomain SSO is not implemented.
- Live payment sandbox certification, timeout reconciliation, refund execution and settlement accounting. Current refund records are requests, not executed payouts.
- Business-approved fees, taxes, contracts, service coverage, pharmacy procedures and privacy/retention policies.
- Staff MFA, upload malware scanning, backups, restore drills and monitoring.
- PostgreSQL concurrency/load tests and a production security review.
- Full variants/options, wallet/redemption, returns, advanced promotions, partner onboarding documents and provider eligibility rules.
- WhatsApp, SMS, Meta CAPI, advertising attribution, mapping and storage integrations. Reserved environment variables do not mean those integrations are implemented.
- Vector retrieval, broader AI workflows, model fallback and full AI cost budgeting. The current assistant uses approved public text retrieval and cannot take business actions.

SSLCOMMERZ initiation and independent server verification follow the [provider documentation](https://developer.sslcommerz.com/doc/v4/). Payment redirects alone never mark an order paid. Credentials and a reachable HTTPS callback are required; online payment is unavailable without them.

The assistant requires `AI_CHAT_ENDPOINT`, `AI_API_KEY` and `AI_MODEL` for an HTTPS chat-completions-compatible provider. It is unavailable without configuration. AI cannot approve prescriptions or execute financial actions.

See [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) for the verified launch checklist and [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for provider integration status.

Delivery booking and dispatch instructions, API contracts and operational limits are documented in [docs/DELIVERY_WORKFLOW.md](docs/DELIVERY_WORKFLOW.md).
