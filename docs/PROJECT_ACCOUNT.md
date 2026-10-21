# Project and investment account

## Investor experience update — 2026-10-21

The public plans and private account now share a dedicated responsive design and navigation. Five proposed plans retain the existing calculations and enquiry workflow. A selected plan and valid unit count carry into the application, including through login or registration. Login return destinations are restricted to the project-account route.

The private statement explains the next action for each application status, including agreement acknowledgement and the team's activation gates. Gallery categories, progress numbers and dates follow the selected language; switching categories clears stale cards, failed requests offer a retry, and projects without updates say so. Demo projects remain explicitly fictional; no funds, payouts or real project achievements were invented.

Local verification includes the 16 project/backend launch tests, plan enquiry, private application/reload/search/CSV/cancellation, and reviewer pagination/retry. Live funding, automatic payouts, certified signing and production acceptance remain the separate setup work described in `PROJECT_LIVE_SETUP.bn.md`.

Final verification on 2026-10-21: webpack production build and targeted ESLint passed. All four project browser tests passed against the production build, including login return with the selected plan and gallery failure/retry without stale cards. English/Bangla presentation and 768/390/320-pixel widths were checked; desktop and mobile screenshots were inspected.

Integrated into the existing Django/Next website, based on the user-supplied Laravel archive and business PDFs. No Laravel dependencies, environment secrets, accounts or SQLite data were imported.

## Working flow

1. `/projects`: five proposed packages, illustrative calculations, client 10/30/20/40 calculator, enquiry and paginated project gallery with category filters.
2. `/project-account`: authenticated investor/client applications, geographic address picker, consent, duplicate-request protection, private application history and cancellation while pending.
3. Operations: submitted -> reviewing -> approved/rejected; approval requires an assigned project, reviewed agreement reference and private PDF (maximum 5 MB). Client price can be confirmed on approval.
4. Customer: downloads the private PDF and acknowledges the approved price/plan/reference using their name. The account stores the document SHA-256, timestamp and immutable terms snapshot. This is authenticated typed-name consent, not a certified digital signature replacing signed paperwork. Only the owner and authorized staff can download the attachment; it has no public media URL. Upload checks size and PDF header, not malware; production scanning remains necessary.
5. Finance: records completed receipts with unique references. Investor activation requires recorded capital and customer acknowledgement. Client term activation requires recorded 60% milestone receipts.
6. Operations: confirms actual handover/start date; term does not start at application time.
7. Account: maturity, time progress, month-end-safe instalments, rounded final instalment, recorded payments and remaining amounts, ledger, project updates and printable statement. Regular investor distributions include principal. Client schedule covers the remaining 40%; milestones cover 10/30/20.
8. Finance: manually records distributions/refunds. Bounds, permissions, dates and funded capital are validated. No payment is executed by these records. A partially distributed investment cannot use the simple capital-refund path; it needs a separately reviewed settlement.
9. Operations: completes only fully settled accounts; cancellation after approval requires receipts reconciled.
10. In-app notifications and audit entries accompany review and financial records.

## Admin and roles

Project-account page handles guarded application review and ledger recording. Django admin manages projects and public/private updates; application/ledger admin records are read-only to prevent bypassing the workflow. Operations Manager reviews; Finance records transactions; Content Manager maintains the gallery. Superusers can perform all tasks. Published projects appear publicly; private updates appear only to the assigned application's owner or authorized staff.

`seed_project_demo` is DEBUG-only, creates four clearly labelled fictional gallery examples, adds scoped role permissions and preserves existing edits. Base demo role definitions include the new permissions. No fake deposits or payouts are seeded.

## Source differences resolved

The Laravel model used annual estimates that differ from the supplied PDFs and its plan page. This module consistently preserves the five PDF proposal totals already displayed on `/projects`: 10,000 -> 10,800 over 4 months; 25,000 -> 28,000 over 6; 50,000 -> 61,000 over 12; 100,000 -> 125,000 or 150,000 over 40. No zero-risk, guaranteed-return, tax-free or religious certification claims were copied. Existing registration, service booking, provider and CMS functions are reused.

## Boundary

This is a local application, review and manual accounting workflow. It does not launch a public fundraising offer, collect investment funds, execute bank payouts, validate identities, provide certified digital signatures or certify the proposal's legal/financial assumptions. Original PDFs and archive remain private sources. Reviewed documents and typed-name consent evidence are stored privately. Production launch and payment/settlement integrations remain separate work. The user confirmed no provider accounts exist yet; see [Bangla setup checklist](PROJECT_LIVE_SETUP.bn.md).

## Verification

Backend tests cover all package totals, private access, consent, idempotency, invalid inputs, owner acknowledgement, client confirmed quotes, approval/funding gates, ledger bounds, completion, month-end rounding, public/private gallery and cancellation. Browser checks cover package enquiry and real API persistence, private application/reload/cancellation, mobile width and admin controls. Frontend lint/typecheck and production build pass.

Final local verification: full backend suite 111 tests passed; 8 project-specific tests passed after the final milestone guard; two project browser workflows passed; admin runtime errors zero; lint/typecheck and production build passed.

2026-10-10 document update: 112 backend tests passed, including private PDF access, invalid upload, typed-name matching and frozen acceptance evidence. Two project browser workflows, lint, typecheck, production build, Ruff and migration consistency passed. Local backend and frontend were restarted with the changes.

Account statements also download as private CSV with BDT transaction totals and net receipts. Access follows the same owner/staff permissions; downloads are audited and spreadsheet formula prefixes in user-supplied text are escaped. CSV downloads do not confirm or execute transfers.

Applications support paginated search by name, phone or agreement reference, combined with status and investor/client filters. Search never broadens owner visibility. Applying or resetting filters returns to page one; stale list responses cannot overwrite newer search results.

Reviewer project choices support loading subsequent pages, a visible error and retry without losing existing choices, and display the assigned project even before its page has loaded. Review forms reset between applications/status changes and cannot submit terminal applications. A browser test with controlled paginated API responses covers failed page-two loading, retry and selection; the real customer workflow is tested separately.

Payment summaries show the server's statement date, net receipts after refunds, remaining scheduled amounts, overdue amount/count and the first unsettled date. Only active accounts flag unpaid dates before today as overdue; today's amounts are due today. Unstarted or cancelled accounts do not show overdue alerts. Investor schedules describe proposed distributions, not verified guaranteed returns. The CSV includes the same summary values.

Application history displays paginated submission, review, cancellation, PDF upload, acknowledgement and ledger events. It uses an explicit event whitelist and shows generic customer/team/system roles with Bangladesh timestamps, without exposing staff identities or raw internal audit metadata. Access is restricted to the application owner or authorized staff. Existing applications show only events actually recorded; no historical events are invented.
