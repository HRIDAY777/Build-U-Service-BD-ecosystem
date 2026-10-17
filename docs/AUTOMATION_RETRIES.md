# Automation monitoring and controlled retries

## Retry scheduling — 17 October 2026

Failed runs now store next_attempt_at and wait 60, 120, 240 and 480 seconds between the default five total attempts. Delay is measured from failure and grows exponentially, capped at one hour if the budget is extended. Direct process_event calls respect event/run due times. Successful runs clear their due time and remain skipped on retries.

Outbox events store the earliest remaining automatic retry time. Dispatch selects only due events, ordered by due time/creation/ID, with the existing 200-event batch limit. Exhausted events remain unprocessed with no next_attempt_at, so parked work cannot fill every batch ahead of new ready work. The existing permission-checked admin action grants one extra attempt and sets run/event due times to now; counters/errors are preserved and audit failure rolls back scheduling too. New rules do not automatically reactivate parked historical events.

The admin run list shows next_attempt_at. Migration automation.0003 adds run/event timestamps and an event due-time index; existing pending events become eligible once for schedule evaluation. Live workers/Beat/Redis and external email delivery were not executed; configured running workers remain required for automatic execution.

Open `/admin/automation/automationrun/` with an authorized staff account. The list shows rule, event topic, status, attempts, attempt limit, error type and latest update. Filter **Failed: attempts exhausted / চেষ্টা শেষ** to find unprocessed events whose failed run has used its available attempts. Search rule names/topics or filter action/status. Records remain read-only.

Retry operators require both `automation.view_automationrun` and the new `automation.retry_automationrun` permission, plus active staff access. A staff flag or viewing permission alone cannot queue retries. Superusers have the permission. Grant it only to designated operators.

Select at most 50 exhausted failed runs and choose **Queue one extra attempt / আরও একবার চেষ্টা করুন**. This queues one additional attempt per eligible run and records the operator, event and old/new attempt limits in the audit log. It preserves total attempts and the previous error type; it does not clear historical counters. Duplicate clicks/concurrent approvals cannot increase the budget twice while the run is pending.

Completed events, successful/pending runs, inactive users/rules, changed triggers/conditions and runs that still have automatic attempts remaining are skipped. Queueing executes no notification, email or payment. The configured outbox worker must run to process it; the local Redis/Celery/Beat services were not started in this milestone. A queued run can fail again and then requires a fresh deliberate authorization.

The worker still skips successful rule runs. Its default limit remains five; existing runs gain `attempt_limit=5` via migration `automation.0002`. Authorization grants exactly one extra attempt. Worker and retry operations both lock the event first, then the run. Audits and the budget update commit together per run.

External email cannot be rolled back or proven undelivered by a database transaction. Inspect the provider's delivery record before retrying an email failure. These controls do not establish exactly-once external delivery, monitoring alerts, broker availability or production readiness.

Tests cover permissions/admin action visibility, exhausted filtering, preserved counters, no immediate effects, successful-rule deduplication, one-attempt retry exhaustion, inactive/changed/completed runs, batch limit, audit rollback and concurrent operator authorization on PostgreSQL. Run `./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.automation`.

Final verification: all eight targeted automation tests passed on PostgreSQL after the final exhausted-filter, changed-trigger and inactive-user assertions. Full 164-test suite passed earlier in this milestone. Ruff and migration drift passed. Worker/external delivery was not executed.
