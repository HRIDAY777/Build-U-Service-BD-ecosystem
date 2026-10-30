# U Service — মূল চাহিদা থেকে কাজ শেষ করার তালিকা

আপডেট: ১৭ অক্টোবর ২০২৬। মূল উৎস: REQUIREMENTS.ecosystem.txt-এর ২৬টি final deliverable, পুরোনো মূল চাহিদা ও পরের ব্যবহারকারীর নির্দেশ। বিদ্যমান কাজ সংরক্ষিত থাকবে।

## কাজ করার নিয়ম

প্রতিটি ফিচারে গ্রাহক, সংশ্লিষ্ট কর্মী/পার্টনার ও অ্যাডমিনের প্রয়োজনীয় কাজ; তথ্য সংরক্ষণ; অনুমতি; ভুলের বার্তা; বাংলা–ইংরেজি; মোবাইল এবং প্রাসঙ্গিক পরীক্ষা যাচাই হবে। শুধু পেজ বা বাটন থাকাকে সম্পূর্ণ ধরা হবে না। নির্দিষ্ট কাজ শেষে তার ফল নথিভুক্ত করে পরেরটিতে যাওয়া হবে। শতাংশের বদলে যাচাইকৃত কাজ ও খোলা শর্ত দেখানো হবে।

## মূল ২৬টি deliverable

| # | বিষয় | বর্তমান প্রমাণিত কাজ | এখনও যা শেষ করতে হবে |
|---|---|---|---|
| 1 | বিদ্যমান প্রজেক্ট অডিট | কোড/স্কিমা/ওয়ার্কফ্লোর অডিট ও পরবর্তী পরিবর্তনের রেকর্ড | নতুন পূর্ণ regression ফল মিলিয়ে পুরোনো স্ট্যাটাস সংশোধন |
| 2 | টেকনিক্যাল আর্কিটেকচার | Django/Next মডিউল ও API কাঠামো | subdomain identity, settlement ও AI service boundary |
| 3 | প্রজেক্ট কাঠামো | বর্তমান repository ও migrations | নতুন মডিউলের সঙ্গে continuity বজায় রাখা |
| 4 | কোম্পানির ওয়েবসাইট | responsive homepage, মূল লোগো/অ্যানিমেশন, CMS, bilingual UI | careers/news/help/legal-এর অনুমোদিত বাস্তব কনটেন্ট; পূর্ণ accessibility পরীক্ষা |
| 5 | সার্ভিস subdomain | একই সাইটে আলাদা service route | host-specific routing, DNS/TLS, shared login |
| 6 | কেন্দ্রীয় authentication | username/email login, recovery, profile, security history | verified phone OTP, MFA, subdomain SSO; বাস্তব email delivery |
| 7 | গ্রাহক dashboard | order/booking/delivery, quote consent/history, addresses, notifications | পূর্ণ financial history ও session/device monitoring |
| 8 | merchant dashboard | দোকানের পণ্য/ভ্যারিয়েন্ট/মিডিয়া/স্টক, restaurant hours/options | branch/staff controls ও settlement |
| 9 | provider dashboard | schedule/leave/calendar, কাজের অগ্রগতি, quote/report/history | capacity reservation; অনুমোদিত real skills/areas configuration |
| 10 | কেন্দ্রীয় admin | role permissions, audited workflows, partner review/renewal, support routing | MFA, remaining role-specific modules ও monitoring |
| 11 | Python backend | বিদ্যমান ব্যবসায়িক মডিউল ও পরীক্ষিত API | pharmacy expiry, advanced promotions, accounting/AI gaps |
| 12 | database migrations | স্থানীয় Docker PostgreSQL; additive migrations | production migration/backup/restore rehearsal |
| 13 | API documentation | schema ও feature workflow docs | নতুন API-সহ final contract review |
| 14 | order management | cart, server quote, COD, stock/coupon, cancellation/return/review | payment timeout reconciliation, real refund ও advanced order accounting |
| 15 | booking management | booking, skills/area matching, provider availability preview, reschedule, mechanic quote/report | capacity reservation ও বাকি vertical-specific requirements |
| 16 | payment infrastructure | COD; SSLCOMMERZ collection code; manual finance records | merchant account/certification, real payment/refund/payout; ব্যবহারকারীর নির্দেশে deployment পর্যায়ে |
| 17 | commission system | কিছু সাধারণ reporting/manual records | অনুমোদিত rates, auditable commission/subscription/settlement ledger |
| 18 | notification system | in-app messages, wishlist/renewal reminders | channel preferences/templates; SMTP/SMS/WhatsApp/push; live workers |
| 19 | AI automation | public-knowledge assistant, outbox/rules, retries/backoff | worker operations/alerts, scoped retrieval/tool workflows/cost budgets |
| 20 | AI agent architecture | সীমিত design/credential-gated assistant | conversation store, tool permissions, human approval/escalation, retention |
| 21 | customer support | private conversations/reopen, category, priority, staff routing/queues | SLA/escalation ও external delivery |
| 22 | automated tests | backend/PostgreSQL concurrency ও browser regressions আছে | নতুন পূর্ণ suite; অমীমাংসিত failure; load/security/staging acceptance |
| 23 | security documentation | privacy/permission/upload/deployment boundaries নথিভুক্ত | MFA/scanning/retention/incident/independent review |
| 24 | deployment configuration | Compose/containers/configuration | full stack, worker, TLS/DNS, storage, monitoring, restore; deployment শেষে live flows |
| 25 | operational documentation | বিভিন্ন feature/admin/setup guide | approved business policies, support/settlement/incident runbooks |
| 26 | maintenance roadmap | priorities ও status history আছে | বাকি কাজের সঙ্গে নিয়মিত আপডেট ও production handover |

## প্রথম বাস্তব কাজের ক্রম

1. বর্তমান সব backend regression ও বিদ্যমান ৬৩টি browser check একসঙ্গে চালিয়ে failure ঠিক করা। প্রমাণিত ফিচারের তালিকা হালনাগাদ করা।
2. account/admin নিরাপত্তা: MFA ও session/device controls-এর প্রয়োজনীয় implementation। বাহ্যিক SMS ছাড়া যা সম্ভব আগে করা।
3. অসম্পূর্ণ মূল ব্যবসার workflow: pharmacy eligibility/expiry, food branch/staff, booking capacity ও delivery evidence। একবারে একটি সম্পূর্ণ workflow ধরে কাজ।
4. notifications/support: preferences, templates, SLA/escalation; worker execution আলাদাভাবে যাচাই।
5. approved business rules পেলে commission/settlement; AI-এর অনুমতিভিত্তিক workflow; পরিশেষে production quality/launch gates।

## ব্যবহারকারীর সিদ্ধান্তে পরে

লাইভ payment/refund/payout, merchant registration এবং deployment-পরবর্তী real checkout পরে হবে। DNS/hosting, অনুমোদিত providers, real business policies এবং official content প্রয়োজন হলে নির্দিষ্ট কাজ প্রস্তুত করে জানানো হবে। বাইরের account/configuration না থাকাকে স্থানীয় feature সম্পূর্ণ বলে দেখানো হবে না।

## বর্তমান যাচাই

পূর্ণ backend ও বিদ্যমান browser suite চলছে। ফল না আসা পর্যন্ত আগের test সংখ্যা বর্তমান full-suite success হিসেবে গণনা করা হচ্ছে না।
