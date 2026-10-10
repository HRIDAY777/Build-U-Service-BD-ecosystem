# Feature audit — updated 10 October 2026

See `MASTER_PROMPT_AUDIT.md` for the 19 original build phases and detailed remaining work.

This is a count of **26 working local feature groups**, not 26 individual requirements and not a percentage of the original master prompt. A group can have a working basic workflow while advanced requirements remain open. The application has not completed a production launch. Local tests do not certify external services or production concurrency.

| # | Working local group | Evidence / entry point |
| --- | --- | --- |
| 1 | Corporate homepage, supplied company logo, responsive layout | `/`, shared shell |
| 2 | Divisions and CMS information pages | `/catalog`, `/pages/<slug>` |
| 3 | Catalog search, category, price, stock and sorting | `/catalog` |
| 4 | Business/provider directory and business catalog links | `/stores` |
| 5 | Registration, session login, CSRF and permission checks | `/login`, accounts API |
| 6 | Password change/recovery and email verification flows | `/account`, `/reset-password`, `/verify-email`; actual delivery requires SMTP |
| 7 | Customer profile, saved addresses, export and deletion requests | `/account` |
| 8 | Bangladesh geographic selection and manual unlisted locality entry | Shared location picker; village register remains incomplete |
| 9 | Cart, server quote and COD commerce orders | `/checkout` |
| 10 | Stock reservations and basic coupons | Operations services |
| 11 | Printable order invoices | Order invoice endpoint |
| 12 | Service booking, assignment and validated progress | `/book/<id>`, `/portal` |
| 13 | Private prescription upload and human review | Order prescription endpoints |
| 14 | Parcel booking and server delivery quote | `/delivery` |
| 15 | Rider assignment, tracking history and handover | `/delivery/<id>` |
| 16 | Parcel COD collection and manual deposit records | Delivery reconciliation endpoint; no automatic payout |
| 17 | Rider workspace, availability, recorded earnings and parcel feedback | `/rider` |
| 18 | Wedding/event requests, quotations and acceptance | `/events`, `/portal` |
| 19 | Partner catalog and inventory management | Operations catalog tab |
| 20 | Wishlist | `/wishlist` |
| 21 | Shop returns request/review/received/closed workflow | `/returns` |
| 22 | Loyalty ledger, balance, reward redemption and fulfillment tracking | `/loyalty`; expiry and actual reward delivery remain open |
| 23 | Completed-purchase reviews and review history | `/reviews` |
| 24 | Support conversations and in-app notifications | `/support`, account notifications |
| 25 | Central admin, audit, basic reports, outbox automation | `/admin`, `/portal`, dashboard/analytics APIs |
| 26 | Dedicated provider workspace and availability | `/provider`, bookings provider APIs; added in this audit |

## Remaining implementation

These items remain open even where a related basic feature works:

1. Catalog supports product/variant labels, attributes, SKU, regular/sale/cost pricing and stock; checkout applies the sale price and cost price is private. Required/optional food modifiers, owner editing, server pricing and order snapshots are implemented. Barcode and branch-specific menus remain open. Restaurant operating rules now support pause/resume, validated weekly/overnight/all-day hours, minimum subtotal and preparation snapshots; see `RESTAURANT_OPERATIONS.md`.
2. Service/provider weekly hours, leave, a private seven-day calendar and duration snapshots are implemented. Assignment checks these schedules, availability and overlaps. Skills/eligibility matching and customer slot suggestions/reservations remain open; see `SERVICE_SCHEDULING.md`.
3. Wallet, loyalty expiry, referral rewards, actual reward delivery and advanced promotion rules. Staff can mark redemptions fulfilled in admin; handing the reward to the customer remains a manual operation.
4. Partner onboarding documents, review/approval and expiry controls.
5. Refund execution, payment timeout reconciliation and merchant/rider/provider settlement accounting. Current refunds are records; recorded rider earnings are not payouts.
6. SMS, WhatsApp and Meta CAPI adapters, delivery receipts, retries, consent controls and event deduplication. Reserved variables are not implementations.
7. Broader AI workflows, vector retrieval, fallback models and complete cost budgets. Current assistant is credential-gated public knowledge assistance; no financial or prescription decisions.
8. Live rider GPS, recipient proof/OTP and route optimization. Address links are not live tracking.
9. Separate subdomain routing and secure shared login across those subdomains.
10. Staff MFA, upload malware scanning, object storage, retention enforcement, backups/restore drills and operational monitoring.
11. Full analytics/advertising attribution and production performance/accessibility review.
12. Remaining master-prompt documentation, PostgreSQL concurrency/load checks, staging end-to-end verification and deployment.

## External and business inputs required

- Merchant payment account and reachable HTTPS callbacks for sandbox/live certification and real refunds.
- SMTP, approved SMS/WhatsApp, advertising, AI, storage and maps accounts for the selected integrations.
- Domain/DNS and hosting access for deployment and subdomains.
- Approved coverage, prices/commissions, refund/settlement rules, provider eligibility and business policies.
- Authoritative updates if a complete official village register is required; current bundled community data must not be presented as that register.

## Provider workspace added in this audit

An approved `Provider` group member can open `/provider`, see only their assigned jobs, filter by status, paginate, inspect scheduled times and addresses, call the customer, and progress through the existing validated workflow. Switching off availability prevents new assignments while permitting existing work to finish. Operations selects available providers by name. The server retains overlap protection, audits availability and assignment, and notifies the provider/customer.

API:

- `GET/PATCH /api/v1/bookings/provider_profile/` — provider's own availability and job counts.
- `GET /api/v1/bookings/providers/` — paginated active/available provider names; booking-change permission required.
- `GET /api/v1/bookings/?assigned_to_me=1&status=assigned&page=1` — private assigned-job filter.
- Existing booking assignment/transition/history endpoints remain authoritative. Responses now include permission-aware `available_actions`.

Provider schedules do not establish skills certification, payroll, service payment or nationwide coverage. Existing jobs remain scheduled after leave changes.

## Event package selection and build verification

Event requests now preserve a bundle and per-service tier selection as validated structured data. Choosing a package checks its service, survives the sign-in step via a non-personal session draft, and appears in customer and staff request details. Prices remain demo planning indications; the staff quote remains authoritative. Backend rejects unsupported bundles/tiers and tier selections for services not requested. Password reset/email verification now have Suspense boundaries, and the full Next.js production build passed outside the Windows restricted filesystem sandbox.
