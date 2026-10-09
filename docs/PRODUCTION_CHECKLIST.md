# U Service BD production checklist

This checklist records what can be verified in the repository and what still requires an external account, domain, or operational decision.

## Verified locally

- Django system checks and migration drift checks pass.
- 41 backend tests pass, including authentication, authorization, checkout, inventory, booking, delivery, payment verification, addresses, notifications, and session invalidation.
- Ruff, frontend ESLint, TypeScript, and formatting checks pass.
- Session authentication uses HTTP-only cookies, CSRF protection, SameSite cookies, server-side permissions, throttling, audit events, and production HSTS settings.
- Docker Compose defines PostgreSQL, Redis, Django, Celery worker/beat, Next.js, and Nginx services.
- Health, API schema, admin, seed data, and local run instructions are documented.

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

The local Windows sandbox cannot complete the Next.js production build because SWC cannot canonicalize the workspace path and returns `Access is denied`. Lint, type checking, and runtime tests pass; verify `npm run build` in a normal developer or CI checkout before release.
