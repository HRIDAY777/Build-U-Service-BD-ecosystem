# Restaurant ordering rules

An approved restaurant owner opens `/portal`, then **Catalog / ক্যাটালগ**, to manage their restaurant's ordering settings. Staff with `catalog.change_organization` may manage approved restaurants. Customers and unrelated owners cannot edit them; ownership, approval and division cannot be changed through this endpoint.

## Owner controls

- Pause/resume new orders independently of opening hours. Existing orders continue through their existing fulfillment workflow.
- Set the minimum food subtotal in BDT. The minimum is measured before coupons and excludes delivery fees; the server recomputes food/variant sale prices.
- Set estimated preparation between 1 and 360 minutes. This is preparation only, not a promised delivery ETA.
- Enable weekly hours in **Asia/Dhaka**. Monday is weekday 0, Sunday is 6. Up to eight periods per day are supported. Unspecified days are closed when scheduling is enabled.
- A closing time earlier than opening represents an overnight period. Monday 22:00–02:00 includes early Tuesday until 02:00, with closing exclusive.
- Choose **Open all day / ২৪ ঘণ্টা খোলা** for a full day, represented as 00:00–24:00.
- Disable scheduling to clear enforced weekly hours. Public pages explicitly state that hours are not set rather than claiming the restaurant is open.

Existing merchants migrate with orders enabled, no enforced schedule, minimum zero and a 30-minute preparation estimate. Owners should configure their real operational values before public launch. The old descriptive `opening_hours` remains a display field and is not parsed into an enforceable schedule.

## Server behavior

Both `POST /api/v1/orders/quote/` and `POST /api/v1/orders/` reject food orders when paused, outside configured hours or below minimum. Food without an approved restaurant cannot checkout. Confirming an old quote rechecks current settings. Failed orders do not reserve stock or consume coupons.

Restaurant settings are locked during checkout and updates. Successful orders snapshot preparation minutes; later setting changes do not overwrite previous orders. Repeating the same idempotent request returns the original order, even if the restaurant has since paused.

The public directory and restaurant catalog show current ordering status, minimum, preparation estimate and weekly hours. Checkout displays the preparation estimate from the server quote; customer/staff order details retain the order snapshot. Public status is a point-in-time response; checkout remains authoritative.

## API

- `GET /api/v1/partner-restaurants/` — paginated owner/staff restaurant list.
- `GET/PATCH /api/v1/partner-restaurants/<id>/` — approved restaurant settings, validated and audited.
- Public organization responses include settings and `ordering_status`; they never expose owner IDs or bank details.

## Verified scope

Backend tests cover boundaries, overnight/week rollover, full-day hours, malformed hours, minimum calculation, failed-order stock, pause-after-quote, duplicate checkout, preparation snapshot, ownership and audit. A browser test creates a clearly labeled local QA restaurant, edits its rules through the owner screen and verifies the public result; it disables that fixture afterward. Cuisine discovery, branch-specific menus and settlements remain separate unfinished requirements.


## Meal options and add-ons

In the owner portal, open Catalog, then Manage food options under a food item. Add a named group, set minimum and maximum choices, and add options with extra prices. Both names can be translated. Minimum zero means optional; minimum one means customers must select. A maximum of one permits a single selection. Turn a group or option off to stop offering it. Saving validates that required groups have enough active options. Records are retained rather than deleted.

Customers choose options on the meal detail page. Different selections create separate cart lines. The server recalculates each unit price from the base or variant sale price plus selected options; quantities apply to the complete unit price. Inactive, foreign, repeated or missing required options fail checkout without consuming stock. Old quotes require another review if prices change. Orders preserve option names, group names and extra prices; later menu changes do not rewrite order details or invoices. Idempotent repeats preserve the original order.

Validation on 10 October 2026: 94 backend tests passed, including four dedicated modifier tests; four browser tests passed, including owner editing, required selection, separate cart lines, quote, checkout and account details. Frontend lint, TypeScript via production build, and production build passed. This does not verify production database concurrency or external settlement integrations.
