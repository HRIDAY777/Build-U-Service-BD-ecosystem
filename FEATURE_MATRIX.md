# Feature matrix

Updated 17 October 2026. The user-facing completion sequence is [docs/COMPLETION_PLAN.bn.md](docs/COMPLETION_PLAN.bn.md). This matrix describes local implementation and remaining gates; it is not a production completion percentage.

Canonical detailed matrix: [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md). Statuses and priorities are defined there. This summary groups requirements from the new enterprise request; it is not a completion percentage.

| Requirement group | Current classification | Remaining acceptance gate |
| --- | --- | --- |
| Corporate and design | Implemented; improvement needed | Approved careers/news/legal/help content, complete translation/accessibility |
| Shared accounts | Partial; email login verified | Verified phone login, subdomain identity, MFA |
| Customer workspace | Implemented; security event history added | Complete financial history, MFA and device/failed-attempt monitoring |
| Food | Locally verified core; improvement needed | Branch/staff onboarding, commissions/settlements |
| Pharmacy | Partial; external configuration | Eligibility, expiry controls, regulatory verification and staged workflow |
| Electrician/mechanic | Local booking, staff-approved service/area eligibility, rescheduling, availability preview, mechanic quotes/consent/history/photos/reports | Capacity reservation, real eligibility configuration, towing/parts procurement/payment |
| Shop | 31/33 original local capabilities implemented, including advanced catalog/media/discovery and partner editing | Live online payment/refund; enterprise promotions and settlement |
| Admin and partner | Partial; private onboarding, document decisions and renewal submissions implemented | Automatic monitoring/suspension, specialist eligibility, scanning/retention and complete modules |
| Payments/revenue | Partial/missing/external | Live verification, refunds, commissions, settlements |
| Delivery/location | Locally verified core; improvement needed | Recipient evidence, dispatch exceptions; GPS needs actual provider/data |
| Notifications/support | In-app messages/reminders; private support conversations/reopen, classification, staff routing and priority/assignment queues | Preferences, templates, external channels, live scheduler, SLA/escalation |
| AI/agents | Partial/design only | Provider gateway/tools/conversations/workflow/cost/permission infrastructure |
| Automation | Rule isolation, exhausted-run monitoring, guarded manual retries and persisted backoff/due-only dispatch implemented | Live worker/Beat execution, alerts, external delivery guarantees |
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

Implemented exhausted-run monitoring and read-only admin with separately authorized one-attempt retry queueing and preserved counters. PostgreSQL concurrency test covers duplicate operator requests. Persisted retry backoff and exhausted-event parking are also implemented and tested. Worker execution, external delivery and alerts remain open.
