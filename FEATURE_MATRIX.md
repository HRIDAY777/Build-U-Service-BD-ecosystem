# Feature matrix

Canonical detailed matrix: [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md). Statuses and priorities are defined there. This summary groups requirements from the new enterprise request; it is not a completion percentage.

| Requirement group | Current classification | Remaining acceptance gate |
| --- | --- | --- |
| Corporate and design | Implemented; improvement needed | Approved careers/news/legal/help content, complete translation/accessibility |
| Shared accounts | Partial; email login verified | Verified phone login, subdomain identity, MFA |
| Customer workspace | Implemented; security event history added | Complete financial history, MFA and device/failed-attempt monitoring |
| Food | Locally verified core; improvement needed | Branch/staff onboarding, commissions/settlements |
| Pharmacy | Partial; external configuration | Eligibility, expiry controls, regulatory verification and staged workflow |
| Electrician/mechanic | Locally verified core; improvement needed | Skills/quotes/rescheduling/parts/payment |
| Shop | Locally verified core; improvement needed | Advanced catalog/promotions and settlement |
| Admin and partner | Partial; private onboarding and individual document decisions implemented | Renewal/suspension, specialist eligibility, scanning/retention and complete modules |
| Payments/revenue | Partial/missing/external | Live verification, refunds, commissions, settlements |
| Delivery/location | Locally verified core; improvement needed | Recipient evidence, dispatch exceptions; GPS needs actual provider/data |
| Notifications/support | Partial | Preferences, templates, delivery channels and ticket routing |
| AI/agents | Partial/design only | Provider gateway/tools/conversations/workflow/cost/permission infrastructure |
| Automation | Implemented; failure isolation tested | Worker monitoring, dead-letter operations and external-email delivery guarantees |
| SEO/analytics | Partial | Actual metrics, schema/canonicals, consent/attribution |
| Security/performance | Partial | MFA/scanning/retention, load/accessibility, monitoring and independent review |
| Deployment/subdomains | Designed; external configuration | DNS/TLS/staging/SSO/restore/concurrency evidence |
| Project/event extension | Locally verified core; improvement needed | Live finance/signature integrations and acceptance |

Historical local feature groups: [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md). They are narrower than the enterprise requirements and must not be used as a percentage.
