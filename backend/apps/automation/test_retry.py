from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import connection, connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.engagement.models import Notification
from apps.operations.models import AuditLog

from .models import AutomationRule, AutomationRun, OutboxEvent
from .retry import authorize_retry
from .tasks import process_event


class AutomationRetryTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.customer = users.objects.create_user(username="retry-customer", email="retry-customer@example.invalid")
        self.operator = users.objects.create_user(username="retry-operator", email="retry-operator@example.invalid", is_staff=True)
        self.operator.user_permissions.add(*Permission.objects.filter(content_type__app_label="automation", codename__in=["view_automationrun", "retry_automationrun"]))
        self.viewer = users.objects.create_user(username="retry-viewer", email="retry-viewer@example.invalid", is_staff=True)
        self.viewer.user_permissions.add(Permission.objects.get(content_type__app_label="automation", codename="view_automationrun"))
        self.event = OutboxEvent.objects.create(user=self.customer, topic="retry.test", payload={"reference": "TEST"})
        self.rule = AutomationRule.objects.create(name="Retry test", trigger=self.event.topic, action="notify", template="Test notification")
        self.run = AutomationRun.objects.create(event=self.event, rule=self.rule, status="failed", attempts=5, error="RuntimeError")

    def test_extra_attempt_preserves_history_and_skips_successful_rules(self):
        good_rule = AutomationRule.objects.create(name="Already succeeded", trigger=self.event.topic, action="notify", template="Test")
        AutomationRun.objects.create(event=self.event, rule=good_rule, status="succeeded", attempts=1)
        self.assertEqual(authorize_retry(self.operator, [self.run.pk]), {"queued": 1, "skipped": 0})
        self.run.refresh_from_db()
        self.assertEqual((self.run.attempts, self.run.attempt_limit, self.run.status, self.run.error), (5, 6, "pending", "RuntimeError"))
        self.assertEqual(Notification.objects.count(), 0)
        self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)
        process_event(self.event.pk)
        process_event(self.event.pk)
        self.run.refresh_from_db()
        self.assertEqual((self.run.status, self.run.attempts), ("succeeded", 6))
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="automation.retry_authorized").count(), 1)
        self.event.refresh_from_db()
        self.assertIsNotNone(self.event.processed_at)

    def test_repeated_failure_stops_after_one_authorized_attempt(self):
        authorize_retry(self.operator, [self.run.pk])
        with patch("apps.automation.tasks.Notification.objects.create", side_effect=RuntimeError("secret transport payload")):
            process_event(self.event.pk)
            process_event(self.event.pk)
        self.run.refresh_from_db()
        self.assertEqual((self.run.attempts, self.run.attempt_limit, self.run.status, self.run.error), (6, 6, "failed", "RuntimeError"))
        self.assertEqual(Notification.objects.count(), 0)

    def test_permissions_and_admin_action_visibility(self):
        waiting_rule = AutomationRule.objects.create(name="Automatic retries remain", trigger=self.event.topic, action="notify", template="Test")
        AutomationRun.objects.create(event=self.event, rule=waiting_rule, status="failed", attempts=2)
        for user in [self.customer, self.viewer]:
            with self.assertRaises(PermissionDenied):
                authorize_retry(user, [self.run.pk])
        self.client.force_login(self.viewer)
        response = self.client.get("/admin/automation/automationrun/?exhausted=yes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([run.pk for run in response.context["cl"].result_list], [self.run.pk])
        self.assertNotContains(response, 'value="queue_retry"')
        self.client.force_login(self.operator)
        response = self.client.get("/admin/automation/automationrun/?exhausted=yes")
        self.assertContains(response, 'value="queue_retry"')
        response = self.client.post("/admin/automation/automationrun/", {"action": "queue_retry", "_selected_action": str(self.run.pk)})
        self.assertEqual(response.status_code, 302)
        self.run.refresh_from_db()
        self.assertEqual(self.run.status, "pending")

    def test_ineligible_or_already_pending_runs_are_not_requeued(self):
        for changes in [{"status": "succeeded"}, {"status": "pending"}, {"attempts": 4}]:
            AutomationRun.objects.filter(pk=self.run.pk).update(status="failed", attempts=5)
            AutomationRun.objects.filter(pk=self.run.pk).update(**changes)
            self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)
        AutomationRun.objects.filter(pk=self.run.pk).update(status="failed", attempts=5)
        self.rule.active = False
        self.rule.save()
        self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)
        self.rule.active = True
        self.rule.conditions = {"missing": "value"}
        self.rule.save()
        self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)
        self.rule.conditions = {}
        self.rule.save()
        self.rule.trigger = "other.topic"
        self.rule.save()
        self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)
        self.rule.trigger = self.event.topic
        self.rule.save()
        self.customer.is_active = False
        self.customer.save()
        self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)
        self.customer.is_active = True
        self.customer.save()
        self.event.processed_at = timezone.now()
        self.event.save()
        self.assertEqual(authorize_retry(self.operator, [self.run.pk])["queued"], 0)

    def test_batch_limit_and_failed_audit_leave_run_unchanged(self):
        with self.assertRaises(ValidationError):
            authorize_retry(self.operator, range(51))
        with patch("apps.automation.retry.audit", side_effect=RuntimeError("audit unavailable")):
            with self.assertRaises(RuntimeError):
                authorize_retry(self.operator, [self.run.pk])
        self.run.refresh_from_db()
        self.assertEqual((self.run.status, self.run.attempt_limit), ("failed", 5))


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locks")
class ConcurrentRetryTests(TransactionTestCase):
    def test_concurrent_authorization_grants_only_one_extra_attempt(self):
        user = get_user_model().objects.create_user(username="concurrent-operator", email="concurrent-operator@example.invalid", is_staff=True, is_superuser=True)
        event = OutboxEvent.objects.create(user=user, topic="retry.test")
        rule = AutomationRule.objects.create(name="Retry", trigger=event.topic, action="notify", template="Test")
        run = AutomationRun.objects.create(event=event, rule=rule, status="failed", attempts=5)
        ready = Barrier(2)

        def queue():
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout = '10s'")
                    cursor.execute("SET statement_timeout = '15s'")
                ready.wait(timeout=10)
                return authorize_retry(user, [run.pk])["queued"]
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(queue), executor.submit(queue)]
            results = [future.result(timeout=30) for future in futures]
        self.assertEqual(sorted(results), [0, 1])
        run.refresh_from_db()
        self.assertEqual((run.attempts, run.attempt_limit, run.status), (5, 6, "pending"))
        self.assertEqual(AuditLog.objects.filter(action="automation.retry_authorized").count(), 1)
