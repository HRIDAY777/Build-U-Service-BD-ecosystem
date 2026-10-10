# Service schedules, leave and provider calendar

Service owners: open Portal → Catalog → Manage schedule under a service item. Save weekly periods, closed dates and duration (1–1440 minutes). Customers see these periods and closed dates on the booking form. The entered time uses Asia/Dhaka, regardless of device timezone. The server requires the complete service duration to fit within one configured opening period and rejects any leave date touched by the appointment. A period ending earlier than it starts continues into the next day; 24:00 means midnight. Finishing exactly at closing is allowed. A booking that crosses into a leave date is rejected, unless it ends exactly at midnight before that leave date.

An empty weekly schedule is unconfigured, so requests still require manual confirmation. Enabling a schedule with empty weekdays closes those days. Setting leave dates works even without a weekly schedule. The form is a request, not a guarantee that a matching provider is available.

Providers: open Provider workspace → Manage schedule to set personal hours and leave. Assignment checks these rules, the availability switch and overlapping jobs under the existing provider account lock. Existing assignments are retained when hours or leave change; contact coordination to reschedule them. Going offline does not prevent finishing previously assigned work.

The private Work calendar shows the provider's active appointments intersecting a selected seven-day period, in Bangladesh time. It excludes cancelled, completed and failed jobs. It is separate from the paginated job history and only displays the signed-in provider's appointments.

New bookings snapshot duration. A migration initializes historical durations from the current service definitions, since earlier records did not preserve them. Later catalog edits no longer alter booked duration or overlap calculations. The original request returned by an idempotent repeat is preserved even after hours change.

API: owner GET/PUT `/api/v1/partner-offerings/{id}/service_schedule/` with `weekly_hours`, `leave_dates` and `duration_minutes`; provider GET/PATCH `/api/v1/bookings/provider_profile/`; private GET `/api/v1/bookings/calendar/?date=YYYY-MM-DD`.

Verified locally on 10 October 2026: 98 backend tests passed; five related browser tests passed and cover owner schedule saving, closed-date rejection, provider leave persistence, calendar loading and existing customer workflows. Frontend lint, TypeScript and production build pass. This batch also fixes the requirement to choose a product variant for non-food products.

Still open: skills and area matching, live customer slot suggestions and capacity reservation, rescheduling workflows, service problem types/media/parts, full quote/payment/refund flows and production database concurrency verification. Schedules do not automatically assign a worker or reserve provider capacity when a customer submits a pending request.
