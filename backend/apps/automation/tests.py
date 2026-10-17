from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from apps.engagement.models import Notification
from .models import AutomationRule, AutomationRun, OutboxEvent
from .tasks import process_event


class RuleFailureIsolationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="automation", email="automation@example.invalid")
        self.event = OutboxEvent.objects.create(user=self.user, topic="test.event", payload={})
        self.failed = AutomationRule.objects.create(name="Failing", trigger=self.event.topic, action="notify", template="test")
        self.good = AutomationRule.objects.create(name="Working", trigger=self.event.topic, action="notify", template="test")

    def test_real_database_failure_does_not_poison_other_rules_or_retry(self):
        original = Notification.objects.create

        def create(**kwargs):
            if kwargs["title"] == "Failing":
                kwargs["title"] = None
            return original(**kwargs)

        with patch("apps.automation.tasks.Notification.objects.create", side_effect=create):
            process_event(self.event.pk)
        self.assertEqual(AutomationRun.objects.get(rule=self.failed).error, "IntegrityError")
        self.assertEqual(AutomationRun.objects.get(rule=self.good).status, "succeeded")
        self.assertEqual(Notification.objects.count(), 1)
        process_event(self.event.pk)
        self.event.refresh_from_db()
        with patch("apps.automation.tasks.timezone.now", return_value=self.event.next_attempt_at):
            process_event(self.event.pk)
        process_event(self.event.pk)
        self.assertEqual(Notification.objects.count(), 2)
        self.event.refresh_from_db()
        self.assertIsNotNone(self.event.processed_at)

    def test_partial_notification_is_rolled_back_before_retry(self):
        original = Notification.objects.create

        def create(**kwargs):
            result = original(**kwargs)
            if kwargs["title"] == "Failing":
                raise RuntimeError("internal transport details")
            return result

        with patch("apps.automation.tasks.Notification.objects.create", side_effect=create):
            process_event(self.event.pk)
        self.assertEqual(Notification.objects.filter(title="Failing").count(), 0)
        self.assertEqual(AutomationRun.objects.get(rule=self.failed).error, "RuntimeError")
        self.event.refresh_from_db()
        with patch("apps.automation.tasks.timezone.now", return_value=self.event.next_attempt_at):
            process_event(self.event.pk)
        self.assertEqual(Notification.objects.count(), 2)
