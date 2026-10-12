# Mechanic booking and work reports

Home mechanic cards open /mechanic with active services and booking guidance. Existing catalog filtering remains available. Booking takes vehicle type, brand/model, optional registration and odometer, problem category, mobility, preferred Bangladesh appointment time, service coverage address and notes. Booking data is stored in PostgreSQL and shown to the customer, authorized operations and assigned provider. Existing service hours, provider assignment, overlap protection and work status transitions are reused.

The assigned provider or an operator with change_booking permission can PUT /api/v1/bookings/{id}/mechanic_report/ during in_progress or waiting_for_parts. Diagnosis and work performed are required; parts used and follow-up are optional. Writes lock the booking and create an audit entry. Reports are read-only after completion. New mechanic bookings with structured vehicle details require a report before completion; historical bookings without these details retain the earlier behavior.

The displayed fee is the selected service fee. Additional repair/parts prices must be confirmed separately. This change does not add towing dispatch, emergency recovery, automatic parts purchasing, online repair quotations, collection/refunds or insurer integration. No bank transfer is initiated.

Validation covers input limits, invalid enum/odometer, idempotent retries, cross-service misuse, customer isolation, assigned-provider visibility, report permissions, completion gating and locked reports. Browser tests exercise real customer booking persistence, language changes and a mobile service listing.

Verified locally: all 170 backend tests passed on PostgreSQL; three mechanic browser tests passed, including the work-report editor with a mocked provider API. TypeScript, lint and production build are checked separately. Live parts quotations, payments and towing remain outside this implementation.

## Booking time changes

Customers and operators with change_booking permission can POST scheduled_at to /api/v1/bookings/{id}/reschedule/ while pending, confirmed or assigned. Assigned providers cannot change a customer's time. The request locks the booking and assigned provider, validates future time, service hours/leave and provider availability/hours/leave, and rejects overlapping active appointments. It preserves status, price and vehicle details. Changes create an audit entry and notify the assigned provider; repeating the same time does not duplicate that entry. The customer mechanic card offers a bilingual time-change form and existing service-hour suggestions. Changes stop once travelling begins.

Booking search and status filters apply to loaded records; the displayed count states that scope explicitly.

Latest rescheduling validation: 110 operations backend tests and six account/mechanic browser tests passed, including real customer rescheduling persisted in PostgreSQL.

## Private problem photo

A mechanic booking supports one customer-uploaded problem photo (JPEG/PNG/WebP, up to 5 MB and 20 million pixels). POST /api/v1/bookings/{id}/problem-photo/ uploads or replaces it; DELETE removes it. GET streams a normalized JPEG with private/no-store caching. Only users authorized to view the booking can read it; only its customer or authorized operator can change it, before the booking closes. Uploads are decoded and re-encoded with orientation corrected, metadata removed and a 2000-pixel maximum side. File names and media URLs are not exposed in booking responses. Provider cards show the photo; customer cards offer upload/replace/remove controls. Video and multiple-photo galleries remain unimplemented.
