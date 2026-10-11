# Feature matrix

Canonical detailed matrix: [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md). Statuses and priorities are defined there. This summary groups requirements from the new enterprise request; it is not a completion percentage.

| Requirement group | Current classification | Remaining acceptance gate |
| --- | --- | --- |
| Corporate and design | Implemented; improvement needed | Approved careers/news/legal/help content, complete translation/accessibility |
| Shared accounts | Partial; email login verified | Verified phone login, subdomain identity, MFA |
| Customer workspace | Implemented; security event history added | Complete financial history, MFA and device/failed-attempt monitoring |
| Food | Locally verified core; improvement needed | Branch/staff onboarding, commissions/settlements |
| Pharmacy | Partial; external configuration | Eligibility, expiry controls, regulatory verification and staged workflow |
| Electrician/mechanic | Locally verified core; improvement needed | Skills/quotes/rescheduling/parts/payment |
| Shop | Locally verified core; improvement needed | Advanced catalog/promotions and settlement |
| Admin and partner | Partial; private onboarding, document decisions and renewal submissions implemented | Automatic monitoring/suspension, specialist eligibility, scanning/retention and complete modules |
| Payments/revenue | Partial/missing/external | Live verification, refunds, commissions, settlements |
| Delivery/location | Locally verified core; improvement needed | Recipient evidence, dispatch exceptions; GPS needs actual provider/data |
| Notifications/support | Partial; private partner renewal reminders added | Preferences, templates, external delivery channels, scheduler deployment and ticket routing |
| AI/agents | Partial/design only | Provider gateway/tools/conversations/workflow/cost/permission infrastructure |
| Automation | Implemented; failure isolation tested | Worker monitoring, dead-letter operations and external-email delivery guarantees |
| SEO/analytics | Partial | Actual metrics, schema/canonicals, consent/attribution |
| Security/performance | Partial | MFA/scanning/retention, load/accessibility, monitoring and independent review |
| Deployment/subdomains | Designed; external configuration | DNS/TLS/staging/SSO/restore/concurrency evidence |
| Project/event extension | Locally verified core; improvement needed | Live finance/signature integrations and acceptance |

Historical local feature groups: [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md). They are narrower than the enterprise requirements and must not be used as a percentage.

## Local PostgreSQL / partner history update

Local persistent Docker PostgreSQL: implemented, data transfer counts verified. Private partner history: implemented and browser verified. Production Docker stack and concurrent transaction/load acceptance remain open. See docs/LOCAL_POSTGRES.md and docs/PARTNER_APPLICATIONS.md.

## Partner concurrency evidence

Three PostgreSQL concurrency regressions passed: approval duplication, cross-source renewal duplication and reminder duplication. Broad load/commerce concurrency remains an acceptance gate.

## Booking concurrency evidence

Retry deduplication, changed-key payload rejection, overlapping provider conflict and adjacent provider appointments are verified by four real PostgreSQL transaction tests. Broad commerce/payment/load acceptance remains open.

## Checkout concurrency evidence

Four PostgreSQL tests passed for last product/variant units, retry deduplication and final coupon use across different products. Payment/refund/cancellation concurrency remains open.

## Order reversal update

Variant cancellation/rejection/return now restores the correct inventory source; reversal movement includes the variant. Added concurrency coverage for cancellation and refund reservation limits. Gateway refund execution and general partial-request idempotency remain separate work.

## Automation failure operations

Implemented exhausted-run monitoring and read-only admin with separately authorized one-attempt retry queueing and preserved counters. PostgreSQL concurrency test covers duplicate operator requests. Worker execution, external delivery, alerts and backoff remain unverified or unimplemented.
