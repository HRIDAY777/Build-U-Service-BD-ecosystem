# Account security history

Account -> Preferences -> Security history shows the signed-in user's recorded account creation, successful sign-in/sign-out, password change/reset, logout-all, email verification and deletion-request events. Times are explicitly displayed in Bangladesh time. Refresh, paginated results, loading/error and empty states are supported.

`GET /api/v1/auth/security-history/?page=1` is authenticated and always scoped to the current user. Supplying a different user ID does not change the scope, including for administrators. Output is limited to event ID/action/time, with an explicit event whitelist and `Cache-Control: private, no-store`. Raw audit metadata, actor identities, password values and session tokens are never returned.

This is not a device/IP inventory or a record of every failed sign-in attempt. No historical events are fabricated. Staff MFA and verified phone authentication remain separate roadmap work. The existing password change and logout-all controls retain their behavior.

Migration `operations.0015` adds an index on audit entity/date/id for security/project history queries. It does not modify or delete event data.

Verification covers owner scope, administrator self-scope, event whitelist, redaction, pagination/order and anonymous denial. Browser acceptance uses a real new account, sign-out, email sign-in and Preferences/history refresh.
