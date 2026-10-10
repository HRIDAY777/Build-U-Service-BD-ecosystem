# মূল প্রম্পটের অগ্রগতি — ১০ অক্টোবর ২০২৬

মূল চাহিদা: `REQUIREMENTS.original.txt`। এটি কাজের বর্তমান সীমা ও পরবর্তী ধাপের তালিকা; ১০০% সম্পন্ন হওয়ার ঘোষণা নয়। কোড, কাজের প্রবাহ ও পরীক্ষা—তিনটি মিললেই একটি অংশ সম্পন্ন ধরা হবে। একটি কাজের গ্রুপে একাধিক অসম্পূর্ণ চাহিদা থাকতে পারে, তাই ২৬টি স্থানীয় গ্রুপকে শতকরা অগ্রগতি বলা যাবে না।

## মূল প্রম্পটের ১৯ ধাপ

| ধাপ | বর্তমান কাজ | সম্পূর্ণ করতে বাকি |
| --- | --- | --- |
| ১. Architecture / infrastructure | Django modular backend, Next frontend, migration, Docker/PostgreSQL/Redis/Celery/Nginx configuration; CI verification workflow added | Docker stack validation, production concurrency, infrastructure provisioning |
| ২. Unified account / RBAC | Registration, session login, CSRF, ownership, groups/permissions, profile, password recovery, email verification | Subdomain SSO verification, staff MFA, full account security review |
| ৩. Corporate / CMS | Company logo, homepage, divisions, content pages, demo stock/district images | Complete editorial content for every requested corporate page, legal/business approval, full CMS publishing workflow |
| ৪. Shop | Catalog, category/search/filter, variants/SKU/sale pricing, inventory, cart, COD checkout, wishlist/share/alerts, reviews, returns | Barcode/media gallery/video, collections, frequently bought together, recently viewed, recommendations and advanced promotions |
| ৫. Food / restaurant | Shared food catalog, ordering and merchant operations | Restaurant hours/minimum order, food add-ons/meal modifiers, cuisine/nearby filters, preparation estimates, branch menus, staff accounts and settlements |
| ৬. Service booking | Electrician/mechanic/general-service booking, provider assignment, progress and overlap checks | Skills matching, calendar/leave/duration slots, problem types/media, parts requests, complete service quotes/payment/refunds |
| ৭. Pharmacy | Catalog/order and private prescription upload/human review | Verified pharmacist eligibility, retention/expiry rules, regulatory launch approval, full prescription browser verification |
| ৮. Delivery / rider | Parcel quote/request, assignment/history, handover, manual COD reconciliation, rider availability/earnings/feedback | Live GPS, recipient proof/OTP, route optimization, complete dispatch exceptions and payout accounting |
| ৯. Partner / provider | Applications, catalog/inventory operations, provider private jobs and availability | Onboarding documents/bank/agreement/expiry/verification, provider skills/hours/areas/job media/parts and settlement |
| ১০. Payments / billing | COD, server SSLCOMMERZ initiation/verification, invoice and refund records | Real gateway certification, timeout reconciliation, execution of refunds, wallet, commissions, merchant/provider/rider settlements |
| ১১. CRM / leads | Leads and basic CRM activities | Full segmentation, lifecycle, task pipelines, deduplicated lead conversion, authorized CRM workflows |
| ১২. Notifications | In-app notifications, SMTP recovery/verification, outbox notify/CRM/email rules | Approved SMS/WhatsApp adapters, receipts/retry/consent, push subscription and delivery, campaign templates |
| ১৩. AI | Credential-gated approved public knowledge assistant, usage record and limits | Vector retrieval, fallback/cost budgets, support/sales/CRM/inventory/review/executive workflows and human approval control |
| ১৪. Marketing | Reserved integration configuration | Meta Pixel/CAPI event contracts, deduplication, consent and attribution; Google analytics/tag integrations and campaigns |
| ১৫. Analytics | Basic group statistics/reports | Financial reconciliation/profit/commission reports, division dashboards, cohorts, campaign ROI and export |
| ১৬. SEO / UX | Responsive UI, Bangla/English shared UI, metadata/sitemap foundations | Whole-site translation coverage, editorial SEO/structured data, performance/mobile/accessibility audit and PWA offline/push |
| ১৭. Security / audit | HTTP-only session, CSRF, permissions, throttles, audit, secret protection and production security settings | MFA, upload malware scanning, object storage/retention, monitoring/error tracking, independent security audit |
| ১৮. Testing | Local backend, lint/type and selected browser tests; CI test/build jobs | Whole browser suite, PostgreSQL concurrent checkout tests, staging end-to-end and load tests; CI run verification |
| ১৯. Deploy / documentation | Local run instructions, integration/feature/workflow docs and container configuration | Hosting/DNS/HTTPS/subdomains, worker/Beat, credentials, backup/restore drills, complete role guides and production launch |

## ব্যবহারকারীর অতিরিক্ত চাহিদা

| চাহিদা | যাচাইকৃত অবস্থা |
| --- | --- |
| কোম্পানির মূল লোগো | সরবরাহ করা লোগো shared brand component-এ ব্যবহার করা আছে |
| ছবি দিয়ে সাজানো | স্থানীয় বিষয়ভিত্তিক স্টক/ডেমো ছবি ও লাইসেন্সসহ জেলা ছবি আছে; এগুলো আসল ব্যবসা/প্রোভাইডারের পরিচয় নয় |
| বাংলাদেশের ঠিকানা | ৮ বিভাগ, ৬৪ জেলা, কমিউনিটি উৎসের উপজেলা/ইউনিয়ন; গ্রামের সম্পূর্ণ অফিসিয়াল তালিকা নেই, manual locality আছে |
| ঠিকানা দুইবার লেখা | shared picker/manual address integration আছে; সব ফর্মের পুনরাবৃত্তির UX audit এখনও প্রয়োজন |
| Event / wedding packages | ৩টি bundle ও ৭ সেবার ৪টি tier; এই ধাপে নির্বাচন, লগইনের পর নির্বাচন ধরে রাখা, server validation, সংরক্ষণ ও customer/staff display যোগ করা হয়েছে |
| Wishlist | Save/remove, search/filter/sort, revocable share, price-drop/restock in-app alerts; সময়মতো background alert-এর জন্য worker/Beat প্রয়োজন |
| বাংলা অনুবাদ | Shared UI ও বহু form/control অনূদিত; সব API content/error, CMS ও বাকি dynamic text সম্পূর্ণ অনূদিত নয় |
| GitHub push | আগের সংরক্ষিত পরিবর্তন GitHub-এ যাচাই করা হয়েছে; এই audit-এর নতুন পরিবর্তন আলাদা করে যাচাই/সংরক্ষণ করতে হবে |

## কাজের ক্রম

১. Audit-এর ধরা পড়া সরাসরি ভাঙা প্রবাহ: event package selection, password/email production build।
২. Catalog/food বাস্তব ordering rules ও customer service scheduling।
৩. Provider/partner onboarding, wallet/loyalty/referral, accounting/settlement।
৪. Notification/payment/AI/marketing integration adapters ও তাদের পরীক্ষিত failure/retry/consent rules।
৫. Bangla coverage, accessibility/performance, deployment/backup/security ও সম্পূর্ণ staging পরীক্ষা।

## যে তথ্য ছাড়া live কাজ সম্পন্ন করা যাবে না

- বাস্তব payment merchant credentials এবং sandbox/live certification।
- অনুমোদিত SMTP/SMS/WhatsApp/Meta/AI/storage/maps credentials।
- Hosting এবং domain/DNS access।
- Commission/settlement/refund/provider eligibility ও চূড়ান্ত price/coverage policy।
- সম্পূর্ণ গ্রাম তালিকার প্রয়োজন হলে অনুমোদিত হালনাগাদ উৎস।

এগুলো ছাড়া code ও controlled tests তৈরি করা সম্ভব, কিন্তু সফল live delivery/payment/deployment দাবি করা যাবে না। External credentials-এর অভাব অন্য implementation কাজ বন্ধ করার কারণ নয়।

## এই ধাপের পরীক্ষার প্রমাণ

- Full Django suite: ৮৩টি পরীক্ষা পাস; Ruff ও migration drift check পাস।
- Next.js production build: সফল, ২৫টি static page তৈরি; dynamic route-ও build হয়েছে।
- Event package ও language browser tests: ২টি পাস, Chrome দিয়ে প্রকৃত স্থানীয় frontend/backend-এ।
- CI workflow যোগ করা হয়েছে; GitHub-এর remote run এবং PostgreSQL পরীক্ষার ফল এখনও যাচাই হয়নি।

- Complete local browser suite: ৮টির সবগুলো পাস (customer ordering/booking/delivery, mobile layout, partner application, event packages, language, geography, photos and wishlist)।
