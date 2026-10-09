# Delivery workflow

## Customer

Open `/delivery`, sign in, and enter sender/pickup and recipient/destination details. The two addresses have independent cascading Bangladesh location pickers. Only active service areas enabled for the delivery division appear in the service-area dropdown; choosing a district does not create coverage.

Describe the package, choose category, quantity (1–100), total weight (0.01–20 kg), COD amount (BDT 0–100,000), optional preferred pickup time, fragile flag and instructions. Pickup and drop-off can each have separate instructions. COD is the parcel value and is separate from the service fee. A preferred time is a request, not a guaranteed slot. The form tells customers not to send hazardous or prohibited goods; actual inspection and acceptance remain operational responsibilities.

Review the server-calculated fee, then confirm. Base fee is the higher of the pickup and destination area fees; each kg above 1 kg adds BDT 20, including proportional fractional weight. The server validates coverage and rechecks the price when booking. Edits require a new review. Repeated submission with the same `Idempotency-Key` and details returns the same booking; reuse with different details is rejected.

Confirmation opens `/delivery/<uuid>`. This private page shows addresses, rider name, status history, instructions, fee and handover/failure information. The customer can cancel while the request is still `requested`; later cancellation requires operations/support. `/delivery` provides status filters, pagination, refresh and reference lookup. Account > Deliveries links to the same detail page. The booking receipt can be opened and printed with the browser.

## Dispatch and riders

Operations users need `operations.view_deliveryrequest` and `operations.change_deliveryrequest`. They can open `/delivery` or Portal > Deliveries. Confirm a request, select an active user in the `Rider` group, assign the rider, then set the status to Assigned. The assigned rider can access the delivery via their list/detail page and record pickup, transit and handover. Unassigned users cannot read private parcel details, histories or receipts.

Normal states: Requested → Confirmed → Assigned → Pickup pending (rider accepts) → Picked up → In transit → Out for delivery → Delivered. A newly assigned rider may reject with a reason before accepting; dispatch then assigns another rider. Completion requires the receiver's name and the exact requested COD amount; a handover note is optional. This is an operator/rider attestation, not an OTP-verified proof or signature. A failed delivery requires a reason, and may then become Returned. Terminal states cannot be reopened using arbitrary transitions. A rider cannot confirm or assign a request. Each status change is audited and creates an in-app customer notification; assignment notifies the rider.

`/rider` provides vehicle/profile settings, availability, active/completed jobs, recorded earnings, unreconciled COD, ratings, failure/return counts and support. Unavailable riders are excluded from new assignment. Existing jobs remain accessible. Map links open the address in Google Maps; these are not live GPS tracking. The customer may rate their own completed delivery once.

Rider earnings use the admin-configured `RiderProfile.earning_per_delivery`, snapshotted at assignment and counted only for delivered jobs. The initial rate is zero; no payout or income promise is fabricated. Configure the agreed rate in central administration. Finance users with `operations.add_payment` and `operations.view_deliveryrequest` can reconcile the exact collected COD against a unique deposit reference. This records manual confirmation of received funds; it does not move money or record a payout to the sender. Duplicate references and mismatched amounts are rejected.

The central Django admin provides read-only parcel search and filters. Workflow changes use the validated detail page/API.

## API

- `POST /api/v1/deliveries/quote/`: validate booking input and return `base_fee`, `weight_fee`, `fee`, `currency`; creates no booking.
- `POST /api/v1/deliveries/`: same input, `Idempotency-Key` header required; optional `expected_fee` rejects stale prices. The website always supplies it.
- `GET /api/v1/deliveries/?status=<state>&page=<n>`: permission-scoped paginated records.
- `GET /api/v1/deliveries/<uuid>/`, `history/`, `receipt/`: permission-scoped details/history/printable booking record.
- `GET /api/v1/deliveries/riders/?page=<n>`: available active riders, dispatch permission required.
- `POST /api/v1/deliveries/<uuid>/assign/`: `{ "worker": <user_id> }`.
- `POST /api/v1/deliveries/<uuid>/transition/`: `{ "status": "..." }`; Delivered requires `received_by` and accepts `delivery_note`; Failed requires `failure_reason`.
- `GET/PATCH /api/v1/deliveries/rider_profile/`: Rider-only profile, availability and summary; earning rates cannot be changed by the rider.
- `POST /api/v1/deliveries/<uuid>/reject_assignment/`: assigned rider only, requires `reason`.
- `POST /api/v1/deliveries/<uuid>/reconcile_cash/`: finance-only manual COD deposit confirmation; requires `reference` and exact `amount`.
- `POST /api/v1/deliveries/<uuid>/feedback/`: owning customer only, once after delivery; `rating` 1–5 and optional `comment`.

Booking inputs include `pickup`/`dropoff` addresses (`recipient`, `phone`, `area`, `line`, optional `instructions`), `description`, `weight_kg`, `quantity`, `cod_amount`, `package_type`, `fragile`, optional ISO `pickup_at` and `instructions`. Handover requires `cod_collected` equal to `cod_amount` (zero by default). Private idempotency hashes and cash-deposit references are never returned.

## Operational limits

This implements local booking, dispatch, status tracking, handover/COD records, manual deposit reconciliation, recorded earnings and customer ratings. It does not include live GPS, route optimization, SMS/WhatsApp sending, recipient OTP/signature verification, insurance, an online parcel payment gateway, sender payouts or rider payouts. The displayed service fee and booking receipt do not prove payment of the service fee. Cash handling, settlement and agreed earning rates require business-approved procedures. In-app notifications work directly; external automation still needs configured workers/providers. Current seeded coverage and prices are demonstration data and must be approved before commercial use.

## Verification

Backend tests cover fee calculation/coverage/weight/time validation, duplicate requests, stale prices, private access, eligible rider assignment, availability/rejection, role-restricted transitions, required handover/failure details, COD reconciliation, earning snapshots, ratings, cancellation, returns, notifications, filtering and escaped receipts. Browser tests cover customer quote/confirmation/tracking and location selection. A separate local three-role browser check verified customer booking → operator assignment → rider acceptance/handover/COD → finance reconciliation → customer feedback/receipt/filter/mobile display and rider availability/earnings. Its screenshot is `artifacts/delivery-completed-mobile.png`. Temporary test logins are deactivated after verification.
