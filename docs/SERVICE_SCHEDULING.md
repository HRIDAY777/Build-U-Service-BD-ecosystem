# Service schedules, leave and provider calendar

## Staff-approved service eligibility — 16 October 2026

Admin → Offerings now has `qualified_provider_required`. When enabled, the booking-specific provider picker and assignment endpoint require the exact service in Admin → Provider profiles → Approved services. An absent profile or an empty/different approval list fails closed for these services. Approval is staff-managed; provider self-service cannot grant it. Assignment rechecks the current approval, so a revoked choice cannot be submitted from a stale picker. Admin approval changes are audited and use the provider account lock shared by assignment.

Existing services default to manual eligibility review (`qualified_provider_required=False`), preserving existing bookings and configuration. No provider skills are invented or automatically certified. Operators must review real qualifications, select approved services and enable the requirement on each applicable offering. This is service-specific authorization, not proof of a professional license. Existing assigned jobs remain intact; area matching and customer capacity reservation are still open.

Verification: 18 PostgreSQL provider/scheduling/concurrent-booking tests passed, followed by the additional admin save/audit regression (1 passed); local migrations applied. Ruff and migration drift checks passed.

Service owners: open Portal → Catalog → Manage schedule under a service item. Save weekly periods, closed dates and duration (1–1440 minutes). Customers see these periods and closed dates on the booking form. The entered time uses Asia/Dhaka, regardless of device timezone. The server requires the complete service duration to fit within one configured opening period and rejects any leave date touched by the appointment. A period ending earlier than it starts continues into the next day; 24:00 means midnight. Finishing exactly at closing is allowed. A booking that crosses into a leave date is rejected, unless it ends exactly at midnight before that leave date.

An empty weekly schedule is unconfigured, so requests still require manual confirmation. Enabling a schedule with empty weekdays closes those days. Setting leave dates works even without a weekly schedule. The form is a request, not a guarantee that a matching provider is available.

Providers: open Provider workspace → Manage schedule to set personal hours and leave. Assignment checks these rules, the availability switch and overlapping jobs under the existing provider account lock. Existing assignments are retained when hours or leave change; contact coordination to reschedule them. Going offline does not prevent finishing previously assigned work.

The private Work calendar shows the provider's active appointments intersecting a selected seven-day period, in Bangladesh time. It excludes cancelled, completed and failed jobs. It is separate from the paginated job history and only displays the signed-in provider's appointments.

New bookings snapshot duration. A migration initializes historical durations from the current service definitions, since earlier records did not preserve them. Later catalog edits no longer alter booked duration or overlap calculations. The original request returned by an idempotent repeat is preserved even after hours change.

API: owner GET/PUT `/api/v1/partner-offerings/{id}/service_schedule/` with `weekly_hours`, `leave_dates` and `duration_minutes`; provider GET/PATCH `/api/v1/bookings/provider_profile/`; private GET `/api/v1/bookings/calendar/?date=YYYY-MM-DD`.

Verified locally on 10 October 2026: 98 backend tests passed; five related browser tests passed and cover owner schedule saving, closed-date rejection, provider leave persistence, calendar loading and existing customer workflows. Frontend lint, TypeScript and production build pass. This batch also fixes the requirement to choose a product variant for non-food products.

Still open: skills and area matching, provider-capacity-aware slot suggestions and capacity reservation, rescheduling workflows, service problem types/media/parts, full quote/payment/refund flows and production database concurrency verification. Schedules do not automatically assign a worker or reserve provider capacity when a customer submits a pending request.


## Suggested service times

Operations provider selection now requests `GET /api/v1/bookings/providers/?booking=<id>` for each confirmed/assigned booking. The result excludes providers on leave, outside their working hours, offline, or overlapping another active appointment. This is a preview; assignment still locks and revalidates availability to prevent concurrent conflicts. It does not establish skill certification or area matching. Customer time suggestions still reflect service hours only.

The picker shows loading and empty-result messages and offers a bilingual refresh action. Refresh clears the previous selection and disables the picker until the latest result loads; failed refreshes do not leave stale choices selectable.

The provider calendar starts with today's Bangladesh date and supports previous week, next week and return-to-today navigation. Changing the range clears old results and errors; failed refreshes also clear old results. Dates and the seven-day range follow the selected Bengali/English UI language while all appointment times remain in Asia/Dhaka.

On the booking form, choose a date in the date/time field and press View day times. Starts are suggested every 15 minutes, for up to 90 days ahead. Only future starts whose entire duration fits an opening period and avoids closed dates appear. Clicking a time fills the booking field in Bangladesh time. Overnight opening windows are included. Refreshing the list reads current server settings; submitting still rechecks hours and leave.

A service without configured hours asks for a preferred time rather than inventing available slots. A closed day displays no times. Public `GET /api/v1/offerings/{id}/booking_times/?date=YYYY-MM-DD` returns only service-hour suggestions, duration and confirmation status, with no provider/customer/job details and no cache storage. These suggestions do not claim that a worker is free and do not reserve capacity.

Latest validation: full backend suite 101 tests passed; lint and production build passed. Five related browser checks passed (three customer regressions and two scheduling tests). The scheduling tests cover selecting a suggested start, duration boundaries, refreshed closure, unconfigured fallback and customer workflows.
