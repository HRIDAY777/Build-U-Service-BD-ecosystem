# Development roadmap

Follow the user's ten phases while preserving verified work. This is an ordered backlog, not a promise of complete production readiness from local tests.

1. **Existing audit:** source/workflow inventory, classifications, dependencies and baseline evidence. Initial audit is in `IMPLEMENTATION_AUDIT.md`; update after each milestone.
2. **Stabilize:** isolate automation failures; explicit CI test discovery; migration/index review; private upload lifecycle; dependency/config checks.
3. **Core ecosystem:** email login, verified phone authentication, staff MFA/security history, approved corporate content, domain/identity design.
4. **Verticals:** partner documents/approval/expiry, provider eligibility/skills, pharmacy expiry/reviewer eligibility, food branch controls and service rescheduling/quotations. Preserve checkout/booking APIs.
5. **Commerce/operations:** approved commissions and settlement ledger, refunds/timeout reconciliation, delivery evidence, consent-aware notifications and support routing.
6. **AI:** audit existing knowledge assistant; provider interface, scoped read tools, conversation retention, human escalation, bounded cost and monitored workflows. Financial/account/medicine actions stay guarded.
7. **Dashboards:** extend actual financial/operational reporting and role-based partner/admin views; no fake metrics.
8. **Quality:** whole-site Bangla, mobile/accessibility/performance benchmarks, query optimization, independent security review.
9. **Production preparation:** configured private storage/scanning, PostgreSQL concurrency, Docker/worker/Beat validation, encrypted backups and restore drill, monitoring, staging browser tests.
10. **Launch readiness:** business/legal approvals, payment certification, signed release checklist, explicit deployment authorization and verified DNS/HTTPS.

Independent coding continues without credentials. Provider calls/deployment are not claimed complete without verified external evidence. Required external actions are in `DEPLOYMENT.md` and `docs/PROJECT_LIVE_SETUP.bn.md`.

## Local PostgreSQL milestone

Local Docker database and preserved SQLite transfer are delivered; private partner history is delivered. Next acceptance work includes explicit concurrency tests, then remaining MFA, dead-letter monitoring, identity and production infrastructure gates.

## Partner concurrency follow-up

Completed targeted PostgreSQL concurrency tests for partner approval, renewal and expiry reminders. Continue with commerce/booking concurrency and MFA/dead-letter monitoring; deployment acceptance remains separate.

## Booking concurrency follow-up

Completed four PostgreSQL regressions covering retries and provider appointment conflicts. Next: stock/order concurrency and remaining security/operations gates.

## Checkout concurrency follow-up

Completed stock, variant, retry and coupon transaction regressions on PostgreSQL. Continue with cancellation/refund races and remaining security/operations gates.

## Order reversal follow-up

Corrected variant stock restoration and added cancellation/refund-reservation regressions. Continue remaining security and operations gates, including staff MFA and automation dead-letter monitoring. Refund gateway execution requires approved provider integration; historical inventory is not automatically rewritten.

## Automation operations milestone

Delivered exhausted-run visibility and audited one-attempt retry authorization. Next security/operations gates remain staff MFA, worker/Beat operations, retry backoff and alert delivery, followed by remaining identity/deployment requirements.
