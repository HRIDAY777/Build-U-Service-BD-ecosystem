from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.operations.services import audit

from .models import AutomationRun, OutboxEvent


def authorize_retry(user, run_ids):
    """Queue one extra attempt without resetting counters or executing effects."""
    if not user.is_active or not user.is_staff or not user.has_perms(["automation.view_automationrun", "automation.retry_automationrun"]):
        raise PermissionDenied("Automation monitoring and retry permissions are required.")
    identifiers = list(dict.fromkeys(run_ids))
    if len(identifiers) > 50:
        raise ValidationError("Select at most 50 runs per retry request.")
    queued = 0
    # Worker and administrator always acquire event before run locks.
    for run_id, event_id in AutomationRun.objects.filter(pk__in=identifiers).order_by("event_id", "pk").values_list("pk", "event_id"):
        with transaction.atomic():
            event = OutboxEvent.objects.select_for_update().get(pk=event_id)
            run = AutomationRun.objects.select_for_update().select_related("rule").get(pk=run_id)
            if event.processed_at or not event.user.is_active or not run.rule.active or run.rule.trigger != event.topic:
                continue
            if any(event.payload.get(key) != value for key, value in run.rule.conditions.items()):
                continue
            if run.status != "failed" or run.attempts < run.attempt_limit:
                continue
            previous_limit = run.attempt_limit
            run.attempt_limit = run.attempts + 1
            run.status = "pending"
            run.next_attempt_at = timezone.now()
            run.save(update_fields=["attempt_limit", "status", "next_attempt_at", "updated_at"])
            event.next_attempt_at = run.next_attempt_at
            event.save(update_fields=["next_attempt_at"])
            audit(user, "automation.retry_authorized", run.pk, event=str(event.pk), attempts=run.attempts, previous_limit=previous_limit, attempt_limit=run.attempt_limit)
            queued += 1
    return {"queued": queued, "skipped": len(identifiers) - queued}
