# Automation monitoring and controlled retries

Open `/admin/automation/automationrun/` with an authorized staff account. The list shows rule, event topic, status, attempts, attempt limit, error type and latest update. Filter **Failed: attempts exhausted / চেষ্টা শেষ** to find unprocessed events whose failed run has used its available attempts. Search rule names/topics or filter action/status. Records remain read-only.

Retry operators require both `automation.view_automationrun` and the new `automation.retry_automationrun` permission, plus active staff access. A staff flag or viewing permission alone cannot queue retries. Superusers have the permission. Grant it only to designated operators.

Select at most 50 exhausted failed runs and choose **Queue one extra attempt / আরও একবার চেষ্টা করুন**. This queues one additional attempt per eligible run and records the operator, event and old/new attempt limits in the audit log. It preserves total attempts and the previous error type; it does not clear historical counters. Duplicate clicks/concurrent approvals cannot increase the budget twice while the run is pending.

Completed events, successful/pending runs, inactive users/rules, changed triggers/conditions and runs that still have automatic attempts remaining are skipped. Queueing executes no notification, email or payment. The configured outbox worker must run to process it; the local Redis/Celery/Beat services were not started in this milestone. A queued run can fail again and then requires a fresh deliberate authorization.

The worker still skips successful rule runs. Its default limit remains five; existing runs gain `attempt_limit=5` via migration `automation.0002`. Authorization grants exactly one extra attempt. Worker and retry operations both lock the event first, then the run. Audits and the budget update commit together per run.

External email cannot be rolled back or proven undelivered by a database transaction. Inspect the provider's delivery record before retrying an email failure. These controls do not establish exactly-once external delivery, monitoring alerts, broker availability, backoff or production readiness.

Tests cover permissions/admin action visibility, exhausted filtering, preserved counters, no immediate effects, successful-rule deduplication, one-attempt retry exhaustion, inactive/changed/completed runs, batch limit, audit rollback and concurrent operator authorization on PostgreSQL. Run `./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.automation`.

Final verification: all eight targeted automation tests passed on PostgreSQL after the final exhausted-filter, changed-trigger and inactive-user assertions. Full 164-test suite passed earlier in this milestone. Ruff and migration drift passed. Worker/external delivery was not executed.
