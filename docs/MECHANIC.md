# Mechanic booking and work reports

Home mechanic cards open /mechanic with active services and booking guidance. Existing catalog filtering remains available. Booking takes vehicle type, brand/model, optional registration and odometer, problem category, mobility, preferred Bangladesh appointment time, service coverage address and notes. Booking data is stored in PostgreSQL and shown to the customer, authorized operations and assigned provider. Existing service hours, provider assignment, overlap protection and work status transitions are reused.

The assigned provider or an operator with change_booking permission can PUT /api/v1/bookings/{id}/mechanic_report/ during in_progress or waiting_for_parts. Diagnosis and work performed are required; parts used and follow-up are optional. Writes lock the booking and create an audit entry. Reports are read-only after completion. New mechanic bookings with structured vehicle details require a report before completion; historical bookings without these details retain the earlier behavior.

The displayed fee is the selected service fee. Additional repair/parts prices must be confirmed separately. This change does not add towing dispatch, emergency recovery, automatic parts purchasing, online repair quotations, collection/refunds or insurer integration. No bank transfer is initiated.

Validation covers input limits, invalid enum/odometer, idempotent retries, cross-service misuse, customer isolation, assigned-provider visibility, report permissions, completion gating and locked reports. Browser tests exercise real customer booking persistence, language changes and a mobile service listing.

Verified locally: all 170 backend tests passed on PostgreSQL; three mechanic browser tests passed, including the work-report editor with a mocked provider API. TypeScript, lint and production build are checked separately. Live parts quotations, payments and towing remain outside this implementation.
