# Support classification and routing

17 October 2026: ticket lists support `assignment=all|mine|unassigned` and `ordering=newest|oldest|priority`, with validated inputs. Priority ordering places unresolved tickets first, then Urgent/High/Normal/Low and oldest-first within each rank. Resolved tickets sort after unresolved work. Ownership restrictions apply to every queue/sort. Existing assigned_to_me=1 remains supported.

The support page defaults staff to priority order and customers to newest-first. Staff can select all/own/unassigned work; all users can choose sort order. Filters reset pagination and show the total matching count. Old results are cleared during refresh; response version checks prevent slower stale requests overwriting the latest query. No assignment permission or response-time guarantee is granted by sorting.

Customers choose General, Order, Booking, Delivery, Payment or Account when opening a ticket from Support or Account. Priority defaults to Normal and assignment is empty. Customer submissions cannot override priority or assignee.

Active staff with both view_supportticket and change_supportticket can open the routing panel on /support, select category, Low/Normal/High/Urgent priority and an eligible team member, or clear assignment. Candidate accounts must be active staff with both permissions. The paginated responders endpoint exposes names/IDs only to those operators. Customer ticket responses show a team member's full name or the generic Support team label, never their email. Other authorized operators retain access and can reply; assignment indicates responsibility rather than exclusive access.

`POST /api/v1/tickets/{id}/route_ticket/` requires category, priority and assigned_to (ID or null). Routing locks the ticket and records before/after in the audit log. New assignees receive an in-app notice. Repeating unchanged routing creates no duplicate audit or notification. Notification failure rolls back routing and its audit. Resolved tickets require customer reopening before routing. Existing messages/replies remain intact.

Ticket lists accept validated status/category/priority filters and assigned_to_me=1. Ownership restrictions still apply after filtering. Support page filters reset pagination. Central admin provides read-only category/priority/assignee columns and filters.

This is manual support routing. Automatic escalation, SLA deadlines, email/SMS delivery and staffing schedules remain open. Priorities do not promise a response time. Existing tickets retain General/Normal/unassigned defaults.

Verified: four PostgreSQL routing tests plus three existing support regressions passed; controlled bilingual/mobile routing browser check passed. TypeScript/lint/build, Ruff and migration drift passed; engagement.0009 applied locally and restarted API returned HTTP 200. No production load or external notification delivery is claimed.
