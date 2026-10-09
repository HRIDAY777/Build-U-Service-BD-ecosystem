# Integration status

All provider credentials are server-side environment variables. Empty variables intentionally disable the corresponding integration instead of creating a fake success path.

| Integration | Current status |
| --- | --- |
| SSLCOMMERZ | Server-side initiation, return handling, independent verification, idempotency, and payment audit records are implemented. Merchant credentials and sandbox certification are still required. |
| Email | Django SMTP configuration and password reset/email verification messages are implemented. SMTP credentials and deliverability setup are required. |
| AI assistant | Credential-gated HTTPS chat-completions-compatible provider integration with usage limits and approved knowledge context is implemented. Provider credentials are required. |
| Celery/Redis | Outbox dispatch and scheduled task configuration are implemented. Production Redis and worker monitoring are required. |
| PostgreSQL | Docker and database URL configuration are implemented. Production database provisioning and concurrency testing are required. |
| S3-compatible storage | Environment slots are reserved; production media storage and upload scanning still require configuration and validation. |
| SMS / WhatsApp / Meta | Environment slots are reserved for approved providers. No outbound message or conversion event is emitted until provider credentials and event contracts are configured. |
| Maps | Environment slot is reserved. Address entry currently uses configured service areas and does not claim live geocoding. |

Never place provider secrets in frontend code or committed files.
