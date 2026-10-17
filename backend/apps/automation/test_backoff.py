from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from apps.engagement.models import Notification
from .models import OutboxEvent, AutomationRule, AutomationRun
from .tasks import process_event, dispatch_outbox


class AutomationBackoffTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="backoff", email="backoff@example.invalid")
        self.rule = AutomationRule.objects.create(name="Backoff", trigger="backoff", action="notify", template="Test")
        self.event = OutboxEvent.objects.create(user=self.user, topic="backoff")

    def test_retry_delay_attempt_limits_and_no_early_effects(self):
        clock = timezone.now()
        with patch("apps.automation.tasks.Notification.objects.create", side_effect=RuntimeError("private response")):
            for attempt, delay in enumerate([60, 120, 240, 480, None], start=1):
                with patch("apps.automation.tasks.timezone.now", return_value=clock):
                    process_event(self.event.pk)
                run = AutomationRun.objects.get(event=self.event)
                self.assertEqual(run.attempts, attempt)
                self.assertEqual(run.error, "RuntimeError")
                self.event.refresh_from_db()
                expected = clock + timedelta(seconds=delay) if delay else None
                self.assertEqual(run.next_attempt_at, expected)
                self.assertEqual(self.event.next_attempt_at, expected)
                if expected:
                    with patch("apps.automation.tasks.timezone.now", return_value=expected - timedelta(seconds=1)):
                        process_event(self.event.pk)
                    run.refresh_from_db()
                    self.assertEqual(run.attempts, attempt)
                    clock = expected
        process_event(self.event.pk)
        run.refresh_from_db()
        self.assertEqual(run.attempts, 5)
        self.assertFalse(Notification.objects.exists())

    def test_dispatch_skips_parked_and_future_events_without_starving_ready_work(self):
        parked = OutboxEvent.objects.bulk_create([
            OutboxEvent(user=self.user, topic="backoff", next_attempt_at=None) for _ in range(200)
        ])
        AutomationRun.objects.bulk_create([
            AutomationRun(event=event, rule=self.rule, attempts=5, status="failed") for event in parked
        ])
        OutboxEvent.objects.filter(pk=self.event.pk).update(next_attempt_at=timezone.now() + timedelta(hours=1))
        ready = OutboxEvent.objects.create(user=self.user, topic="backoff")
        dispatch_outbox()
        ready.refresh_from_db()
        self.assertIsNotNone(ready.processed_at)
        self.assertIsNone(ready.next_attempt_at)
        self.assertEqual(Notification.objects.count(), 1)
        self.assertFalse(AutomationRun.objects.filter(event=self.event).exists())

    def test_repeated_manual_grants_keep_backoff_bounded(self):
        AutomationRun.objects.create(event=self.event, rule=self.rule, attempts=20, attempt_limit=22)
        clock = timezone.now()
        with patch("apps.automation.tasks.timezone.now", return_value=clock), patch(
            "apps.automation.tasks.Notification.objects.create", side_effect=RuntimeError("fail")
        ):
            process_event(self.event.pk)
        self.event.refresh_from_db()
        self.assertEqual(self.event.next_attempt_at, clock + timedelta(hours=1))
