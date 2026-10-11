# Existing implementation audit — 11 October 2026

Scope: the new enterprise ecosystem request, the existing repository, Django applications/API/model definitions, Next pages/components, migrations, authentication, automation, deployment configuration, tests and prior workflow documentation. This is a source and local workflow audit, not a production certification or an independent security penetration test. Existing work and data are preserved.

Baseline: 119 Django tests executed successfully on local SQLite. Django system check passed. Project history backend tests are included; its browser verification is pending at this baseline. No production database, DNS, provider credentials or external account approvals were inspected. Previous test results in older documents are historical, not current certification.

Classification: **V** fully implemented and locally verified for the stated narrow workflow; **I** implemented but needs improvement; **P** partially implemented; **D** designed/configured but not implemented end to end; **M** missing; **B** broken; **X** requires external configuration. No deprecated functionality was identified. A row can have multiple classifications; the whole platform is not V.

Priority: P0 blocks safe public launch; P1 core functionality; P2 advanced capability. File names are repository-relative.

| Feature | Status | Relevant files | Dependencies | Problems / required improvements | Priority | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Modular monolith | I | backend/apps/*, backend/config/* | Django/DRF | Compatible foundation; service boundaries and operational guarantees need documentation | P1 | Preserve architecture; add continuity records |
| Database and migrations | I/X | backend/apps/*/migrations, config/settings.py | PostgreSQL; SQLite locally | SQLite tests cannot verify production locking/load | P0 | Execute PostgreSQL integration/concurrency checks before launch |
| Corporate home and branding | I | frontend/src/components/home.tsx, shell.tsx, brand-logo.tsx | Published CMS/catalog | Existing corporate/service blend; editorial approval and complete requested sections needed | P1 | Preserve logo/UI; audit careers/news/help/legal content |
| CMS and bilingual content | I | apps/content/*, app/pages/[slug] | Content editors | Publishing boolean exists; no full editorial approval workflow | P2 | Verify requested pages and translation coverage |
| Service subdomains | D/X | infra/nginx.conf, next.config.ts | DNS/TLS/hosting | Current routing is shared path-based site; no host-specific applications or SSO | P1 | Design host routing and identity handoff before enabling domains |
| Registration/session login | V/I | apps/accounts/api.py, forms.tsx | Session DB; CSRF | Username login works; email sign-in absent in baseline | P1 | Add backward-compatible email login with collision protection |
| Phone authentication | M/X | accounts.User.phone | Approved SMS/OTP provider | A phone field is not verified phone authentication | P1 | Define verified uniqueness, OTP expiry/rate limits and provider adapter |
| Password recovery / verification | I/X | apps/accounts/api.py, reset-password, verify-email | SMTP | Code exists; actual message delivery requires configured SMTP | P0 | Verify sandbox email delivery and recovery policy |
| Profile/address/security controls | V/I | account.tsx, accounts/api.py | Existing identity | Password change/logout-all/export/deletion requests work; security-log UI and MFA absent | P1 | Add account security history and staff MFA |
| Customer dashboard | I | account.tsx, engagement/api.py | Orders/bookings/notifications | Basic combined workflow; payment/refund reporting incomplete | P1 | Extend verified financial history |
| RBAC and central administration | I | groups/permissions, app admins, portal | Named staff accounts | Permission guards exist; full role-specific dashboard/modules incomplete | P0 | Verify least-privilege matrix; avoid granting all modules |
| Restaurant discovery and ordering | V/I | catalog/api.py, restaurant_rules.py, operations/services.py | Approved catalog; coverage | Ordering/hours/minimum/modifiers verified locally; nearby/cuisine/branch and commission gaps | P1 | Preserve ordering; add role-scoped onboarding/accounting |
| Restaurant owner controls | V/I | partner_api.py, partner-restaurants.tsx | Organization ownership | Hours/pause/catalog work; staff account and payout support incomplete | P1 | Extend verified business onboarding |
| Pharmacy catalog and prescription review | P/X | operations/api.py prescription actions, models.Prescription | Licensed reviewers; business approval | Private human review exists; expiry inventory, pharmacist eligibility and launch verification incomplete | P0 | Keep review gate; verify regulatory requirements before enabling live sale |
| Electrician/mechanic booking | V/I | service_schedule.py, operations/api.py, provider-dashboard.tsx | Approved providers and service hours | Booking/assignment/progress verified; skills matching, rescheduling, quotes/parts gaps | P1 | Add provider eligibility/skills before capacity suggestions |
| Provider availability | V/I | ProviderProfile, provider-calendar.tsx | Schedules/leave | Overlap checks work locally; PostgreSQL concurrent assignment not certified | P0 | Add simultaneous booking/assignment tests |
| Shop catalog/variants/cart/COD | V/I | catalog/*, operations/services.py, checkout | Approved stock/prices/coverage | Core checkout verified; barcode/media collections/advanced promotions incomplete | P1 | Preserve price/stock validation |
| Wishlist/reviews/returns | V/I | wishlist.py, engagement/api.py, ReturnViewSet | Worker for alerts; real refund service | Local workflows verified; return records do not execute refunds | P1 | Separate review records from money execution |
| Partner onboarding | P/I | catalog/onboarding_api.py, PartnerApplication/PartnerDocument, partner-application page, Organization | Authorized manual reviewers and verification policy | Private application/PDF review, expiry-before-approval and guarded organization creation implemented locally; renewal/suspension, specialist licensing/scanning/retention remain open | P1 | Add renewal monitoring and per-document review; preserve existing businesses |
| SSLCOMMERZ order gateway | I/X | operations/payments.py, test_payments.py | Merchant account + HTTPS | Server validation exists; live/sandbox certification, timeout reconciliation/refund execution pending | P0 | Provider account and reconciliation workflow |
| Other payment providers | M/X | docs/INTEGRATIONS.md | Approved bKash/Nagad/Rocket/bank services | No adapters; reserved variables are not capabilities | P2 | Select services and implement official contracts |
| Commissions/subscriptions/settlements | M/P | Payment, Refund, analytics | Approved commercial rates | Manual records/basic totals; no configurable complete settlement ledger | P1 | Obtain rates; implement auditable rules, never invent commission |
| Parcel delivery/rider workflow | V/I | DeliveryViewSet, rider-dashboard.tsx | Coverage/rider approval | Quote/assignment/history/COD reconciliation work; GPS/recipient proof/route optimization absent | P1 | Add delivery evidence and exception policy |
| Bangladesh geography | I | location-picker.tsx, bundled data | Community geographic datasets | District/upazila/union data and manual locality; not a complete official village register | P2 | Preserve manual entry; document source limitations |
| In-app notifications | V/I | Notification, engagement/api.py | Existing user identities | Basic read/unread works; channel preferences/templates incomplete | P1 | Add consent-aware channel preferences |
| Email/SMS/push/WhatsApp | P/M/X | automation/tasks.py, account email flows | Approved providers | Email code only; SMS/push/WhatsApp adapters and receipts missing | P1 | Add channel-specific retries/consent after selection |
| Support conversations | V/I | TicketViewSet, SupportMessage, support UI | Support permissions | Private conversations/reopen exist; category/priority/assignment/escalation missing | P1 | Extend support routing while preserving conversation history |
| Event-driven automation | I | OutboxEvent, AutomationRule/Run, tasks.py | Worker/Beat/Redis | Event-rule dedupe and bounded retries; database-error isolation needs testing; email exactly-once not guaranteed | P0 | Add savepoints and retry/partial-effect regression tests |
| AI knowledge assistant | P/X | automation/api.py, KnowledgeDocument, AIUsage | HTTPS model provider | Read-only approved public knowledge; no tools, conversations, business assistants or cost budget | P1 | Add provider-independent boundary and scoped read tools later |
| AI agent architecture | D/M | automation models/docs | Approved APIs/permissions | No tool registry, conversation store, workflow agent engine or tool approvals | P1 | Introduce explicit tool permissions; no unrestricted DB/actions |
| Analytics/SEO/marketing | I/M/X | AnalyticsView, metadata/sitemap/robots | Consent and analytics accounts | Basic actual statistics and metadata; full commissions/attribution/structured data absent | P2 | Measure actual data; never fabricate achievements |
| Security/upload handling | I/X | config/settings.py, private download actions | HTTPS/private storage/scanner | CSRF/object permissions/throttling exist; MFA/scanning/retention/independent review missing | P0 | Keep files private; launch gates and retention policy |
| Real-time communication | D | config/asgi.py, CHANNEL_LAYERS | Channels/Redis | ASGI only dispatches Django HTTP; no WebSocket consumers/routes | P2 | Do not label polling/history real-time tracking |
| Object storage | D/X | .env.example S3 variables | Private S3-compatible account | Variables only; no storage adapter or signed/private access implementation | P0 | Add private storage integration and tests before launch |
| Docker/deployment/backups | D/X | compose.yaml, Dockerfiles, nginx.conf | Docker/TLS/hosting | Persistent DB/private-media volumes configured; no executed stack/restore drill/monitoring evidence | P0 | Validate stack, staging and encrypted restore procedure |
| CI and test coverage | I | .github/workflows/verify.yml, tests | GitHub runner/PostgreSQL | CI exists; remote execution not verified; make app discovery explicit | P0 | Explicit `test apps`, browser suite, production DB tests |
| Wedding/project additions | V/I/X | events, engagement/project_* | Reviewed contracts; providers | Working local packages/accounts/manual ledger; payments/payouts/certified signature not integrated | P1 | Finish private history; preserve proposed/manual distinctions |

## Evidence and boundaries

- Router contracts: `backend/config/urls.py`; no existing contract is replaced by this audit.
- Existing models cover users, addresses, organizations, offerings/variants/options, stock movements, orders/bookings/deliveries, payments/refunds, support, loyalty, content, project accounts and automation. Dedicated commission/settlement/AI conversation entities are absent.
- Existing Compose uses PostgreSQL, Redis, private file volumes, worker and Beat. Configuration is not evidence that those services are deployed.
- Tests use explicit `manage.py test apps --noinput`; browser tests include controlled mocks only where documented (reviewer pagination), and real local API workflows separately.
- External accounts are still unavailable as previously confirmed by the user. No DNS, deployment, real payment, payout or certified signature success is asserted.

## First implementation sequence

1. Complete in-progress private application history and browser checks.
2. Add email sign-in without breaking username sign-in or exposing ambiguous identities.
3. Isolate automation rule failures with transactional savepoints; verify retries and partial-side-effect rollback.
4. Make CI test discovery explicit and establish the eight continuity documents.
5. Continue the P0/P1 backlog in `DEVELOPMENT_ROADMAP.md`.

## Resolutions after the baseline

- Email login now preserves username login and rejects ambiguous identities; four backend tests cover sessions, inactive/unknown users, invalid input and legacy collisions. A real browser registration/logout/email-login test passed.
- Each automation rule uses a transactional savepoint. Actual constraint errors and partial notification rollback/retry are covered by two new tests; successful rules are not repeated. External email still has an at-least-once delivery boundary.
- CI explicitly discovers `apps`; Compose accepts a chosen `APP_ENV_FILE`, defaulting to `.env`. Configuration-only validation passed with example/test settings. Container execution is still unverified.
- Full updated backend suite: **125 passed** on SQLite. Ruff, migration drift, frontend lint/typecheck and production build passed. Complete local browser suite: **17 passed**. Final history privacy/no-store regression also passed after the full backend run. Evidence is recorded in `PROJECT_STATUS.md`.

Account security follow-up: a self-scoped security event API/Preferences view is implemented with no-store headers and safe field/event whitelists. Audit entity/date lookup is indexed by migration `operations.0015`. Seven account tests, frontend checks/build and targeted browser verification are recorded separately; MFA and failed-attempt/device monitoring remain open.

Partner follow-up: each active document now requires its own accepted decision before a new application approval. Required reviewer notes, timestamps, file-hash audit links and self-review/expiry/terminal guards are implemented (`catalog.0012`). Earlier approvals remain unchanged. Renewal/suspension and production file scanning remain separate gates.

Renewal follow-up: approved applicants can request a separate renewal linked to the existing organization (`catalog.0013`). Open requests are reused and new files need individual acceptance. Full local backend suite: 137 passed; three targeted browser tests passed (one real applicant workflow, two controlled UI fixtures). Automatic monitoring/notifications/suspension, scanning and specialist legal eligibility remain open.

## Local PostgreSQL / partner history evidence

Persistent local Docker database executed; 1,633 SQLite records across 35 models imported and counted. Real PostgreSQL browser tests passed for email login and partner PDF/history/cancellation. Build/lint/typecheck/Ruff/system check passed. Schedule nullable-join locking corrected. Full production stack and deliberate PostgreSQL concurrency testing remain separate acceptance gates.

Final verification: all **142 backend tests passed on PostgreSQL** using the separate disposable test database. Two real browser tests, frontend lint/typecheck/production build, Ruff and Django system check passed. This does not establish production deployment or concurrency/load acceptance.

## Concurrent partner transaction evidence

Three targeted tests passed on PostgreSQL using separate connections: duplicate approval, renewal from different approved sources for one organization, and simultaneous renewal reminder checks. Asserted one resulting organization/application/notification and corresponding single audit/reminder records. This narrows the partner concurrency gap; it does not verify every interleaving, commerce/payment races, sustained load or production infrastructure.

## Booking concurrency evidence

Four PostgreSQL tests passed for identical booking retries, changed retries using the same key, overlapping assignments and adjacent assignments. One booking/audit survives retries and one provider cannot receive overlapping appointments. Customer booking requests remain pending and are not global service reservations. These targeted tests do not establish load or all assignment/reassignment/schedule-change interleavings.

## Checkout concurrency evidence

Four real PostgreSQL tests passed for last-unit purchases, identical retries, variant stock and coupon exhaustion. Coupon requests use different product rows so the shared coupon lock is exercised independently. Asserted one order, reservation movement, audit event and outbox event; failed competing requests leave no partial effects. This is selected concurrency regression coverage, not certification of payment/refund races or load.

## Order reversal correction

A PostgreSQL concurrency regression reproduced a variant cancellation bug: variant stock stayed depleted while base stock increased. Corrected inventory target and movement attribution with deterministic product/variant locking. Refund checks cover reservation totals only; separate partial requests within the remaining balance are still allowed and no payout is performed. Details: docs/ORDER_REVERSALS.md.

Verification: full PostgreSQL suite **157 passed** after the stock correction; afterward the final reversal module **5 passed**, including newly added rejection/return checks. Ruff passed and the restarted PostgreSQL backend returned HTTP 200. No frontend changes were made; no new frontend build or browser result is claimed for this milestone.
