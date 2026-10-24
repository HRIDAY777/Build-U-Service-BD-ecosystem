# Account notification center

The account's Notifications tab displays paginated private messages with Bangladesh timestamps and bilingual controls. Customers can mark a message read or unread, mark every page read, refresh the current page, and retry failed requests. Failed reads clear stale cards; failed mutations retain the previous read state. Pending mutations disable controls to prevent duplicate submissions.

Existing authenticated notification endpoints are reused. Ownership is enforced by the backend queryset; marking all read does not change another user's messages. Message content remains as recorded by its source; the center does not fabricate translations of user-authored content.

Browser coverage includes failed second-page loading and retry, failed read marking and retry, reversible unread marking, marking all pages read, Bangla controls and mobile width. Backend checks cover reversible changes and cross-user isolation. Email/SMS/push delivery remains a separate integration.
