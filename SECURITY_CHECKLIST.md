# Security checklist

This is an engineering checklist, not an independent security certification. Detailed feature boundaries are in `IMPLEMENTATION_AUDIT.md`.

## Existing controls

- Session authentication; HTTP-only cookies; CSRF; guarded object ownership/groups/permissions.
- Production secure cookies, HSTS, content-type protection and frame restrictions.
- Input validation, request IDs, scoped/global throttling and audit records.
- Server-side gateway validation, transactional stock/financial writes, reference/idempotency guards.
- Authenticated prescription/agreement downloads; no public private-media routes.
- Private partner document downloads, permission-scoped application review, applicant self-review denial and frozen terminal applications.
- Read-only credential-gated AI using approved public knowledge; no unrestricted action tools.

## Required checks before launch

- [ ] Verified cross-subdomain identity design and origin policy; do not expose session tokens.
- [ ] Staff MFA and account security review; named least-privilege roles.
- [ ] PostgreSQL concurrent checkout/assignment/finance tests.
- [ ] Private object storage adapter and upload scanning; content/size policy and quarantine.
- [ ] Retention/deletion/backup restoration, including sensitive documents and AI data.
- [ ] Provider callback/reconciliation/refund testing with approved accounts.
- [ ] Automation partial-effect rollback and bounded retry monitoring; external email cannot be guaranteed exactly once by a DB transaction.
- [ ] Notification channel consent and delivery receipts; sensitive data minimization.
- [ ] AI tool permissions, approval gates, injection tests, cost controls and audited escalation.
- [ ] Independent security assessment and staging browser/accessibility/load acceptance.

Never store raw card data, invent credentials, disclose secrets in logs or execute destructive production operations without explicit authorization. Local demo data must remain identifiable and must not be presented as real achievements, sales or reviews.
