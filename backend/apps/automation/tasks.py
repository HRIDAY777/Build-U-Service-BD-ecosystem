from celery import shared_task
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from apps.engagement.models import Notification, CRMActivity
from .models import OutboxEvent, AutomationRule, AutomationRun


@shared_task
def dispatch_outbox():
    for event_id in OutboxEvent.objects.filter(processed_at__isnull=True, next_attempt_at__lte=timezone.now()).order_by("next_attempt_at", "created_at", "pk").values_list("id", flat=True)[:200]:
        process_event(str(event_id))


def process_event(event_id):
    # DB-backed outbox survives broker outages. Each run has a unique event/rule pair.
    with transaction.atomic():
        event = OutboxEvent.objects.select_for_update().get(pk=event_id)
        now = timezone.now()
        if event.processed_at or event.next_attempt_at is None or event.next_attempt_at > now:
            return
        failed = False
        retry_times = []
        for rule in AutomationRule.objects.filter(trigger=event.topic, active=True):
            if any(event.payload.get(key) != value for key, value in rule.conditions.items()):
                continue
            run, _ = AutomationRun.objects.get_or_create(event=event, rule=rule)
            if run.status == "succeeded":
                continue
            if run.attempts >= run.attempt_limit:
                failed = True
                continue
            if run.next_attempt_at and run.next_attempt_at > now:
                failed = True
                retry_times.append(run.next_attempt_at)
                continue
            try:
                # Roll back partial DB effects and isolate database errors per rule.
                # External email cannot be unsent by a database transaction.
                with transaction.atomic():
                    body = f"{rule.template}\nReference: {event.payload.get('reference', event.id)}"
                    if rule.action == "notify":
                        Notification.objects.create(user=event.user, title=rule.name, body=body)
                    elif rule.action == "crm":
                        CRMActivity.objects.create(customer=event.user, kind=event.topic, note=body)
                    elif rule.action == "email":
                        send_mail(
                            rule.name, body, settings.DEFAULT_FROM_EMAIL, [event.user.email], fail_silently=False
                        )
                    else:
                        raise ValueError("Unsupported action")
                run.status = "succeeded"
                run.error = ""
                run.next_attempt_at = None
            except Exception as exc:
                # Do not persist credentials or transport response bodies.
                run.status = "failed"
                run.error = type(exc).__name__
                failed = True
                run.next_attempt_at = (
                    timezone.now() + timedelta(seconds=min(3600, 60 * (2 ** min(run.attempts, 6))))
                    if run.attempts + 1 < run.attempt_limit else None
                )
                if run.next_attempt_at:
                    retry_times.append(run.next_attempt_at)
            run.attempts += 1
            run.save()
        if not failed:
            event.processed_at = now
        event.next_attempt_at = min(retry_times) if retry_times else None
        event.save(update_fields=["processed_at", "next_attempt_at"])
