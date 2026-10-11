# U Service BD production checklist

This checklist records what can be verified in the repository and what still requires an external account, domain, or operational decision.

## Verified locally

- Django system checks and migration drift checks pass.
- 125 backend tests pass (11 October 2026) on local SQLite, including authentication, authorization, checkout, inventory, booking, delivery, payment validation, project accounts/history and automation failure isolation.
- Ruff, frontend ESLint, TypeScript, and formatting checks pass.
- Session authentication uses HTTP-only cookies, CSRF protection, SameSite cookies, server-side permissions, throttling, audit events, and production HSTS settings.
- Docker Compose defines PostgreSQL, Redis, Django, Celery worker/beat, Next.js, and Nginx services.
- Health, API schema, admin, seed data, and local run instructions are documented.
- Entire local browser suite: 17 passed. Compose configuration-only validation passed with test/example settings; this does not establish a running production stack. Root `IMPLEMENTATION_AUDIT.md` records the expanded request's remaining gaps.

## Required before public launch

- Set a strong random `DJANGO_SECRET_KEY`, database credentials, allowed hosts, and trusted origins.
- Create the production `.env` from `.env.example`; never commit it.
- Run migrations, collect static files, seed or import approved content, and create named admin users with least-privilege groups.
- Configure HTTPS termination, DNS for approved domains, email delivery, backups, monitoring, and log retention.
- Complete SSLCOMMERZ merchant sandbox certification and test webhook retries, reconciliation, and refunds with the merchant account.
- Obtain and configure approved SMS, WhatsApp, storage, maps, AI, and Meta credentials where those channels are required.
- Run PostgreSQL concurrency tests, restore drills, malware scanning for uploads, and an independent security review.
- Run the browser suite against the deployed staging environment before production traffic.

## Known environment limitations

The restricted Windows sandbox prevents SWC from canonicalizing the workspace path. The production build succeeded outside that sandbox on 10 October 2026, after fixing missing Suspense boundaries on password recovery/email verification. The new GitHub Actions workflow checks backend tests on PostgreSQL and frontend lint/type/build; its remote run has not yet been verified. A successful local build does not establish deployed staging or production readiness.
