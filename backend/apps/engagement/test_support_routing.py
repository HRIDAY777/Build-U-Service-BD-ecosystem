from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.operations.models import AuditLog
from .models import SupportTicket, Notification


@override_settings(SECURE_SSL_REDIRECT=False)
class SupportRoutingTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.customer = users.objects.create_user(username="support-customer", email="sc@example.invalid")
        self.staff = users.objects.create_user(username="support-staff", email="ss@example.invalid", is_staff=True)
        self.other = users.objects.create_user(username="support-other", email="so@example.invalid")
        self.staff.user_permissions.add(*Permission.objects.filter(content_type__app_label="engagement", codename__in=["view_supportticket", "change_supportticket"]))
        self.ticket = SupportTicket.objects.create(customer=self.customer, subject="Help", message="Delivery issue")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.url = f"/api/v1/tickets/{self.ticket.pk}/route_ticket/"
        self.body = {"category": "delivery", "priority": "urgent", "assigned_to": self.staff.pk}

    def test_assignment_filters_audit_and_idempotent_notifications(self):
        result = self.client.post(self.url, self.body, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.assigned_to, self.staff)
        self.assertEqual(self.ticket.priority, "urgent")
        self.assertEqual(self.client.get("/api/v1/tickets/?assigned_to_me=1&priority=urgent&category=delivery").data["count"], 1)
        self.assertEqual(self.client.get("/api/v1/tickets/?priority=low").data["count"], 0)
        self.assertEqual(self.client.get("/api/v1/tickets/?priority=invalid").status_code, 400)
        self.assertEqual(self.client.post(self.url, self.body, format="json").status_code, 200)
        self.assertEqual(AuditLog.objects.filter(action="support.routed").count(), 1)
        self.assertEqual(Notification.objects.filter(title="Support ticket assigned").count(), 1)
        self.assertEqual(self.client.get("/api/v1/tickets/responders/").data["results"], [{"id": self.staff.pk, "name": self.staff.username}])

    def test_customer_cannot_route_or_set_priority_but_can_choose_category(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(self.url, self.body, format="json").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/tickets/responders/").status_code, 403)
        response = self.client.post("/api/v1/tickets/", {"subject": "Account help", "message": "Help", **self.body}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["category"], "delivery")
        self.assertEqual(response.data["priority"], "normal")
        self.assertIsNone(response.data["assigned_to"])
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/v1/tickets/{self.ticket.pk}/").status_code, 404)

    def test_invalid_inactive_non_support_and_resolved_routing_rejected(self):
        for body in [{**self.body, "assigned_to": self.other.pk}, {**self.body, "priority": "invalid"}]:
            self.assertEqual(self.client.post(self.url, body, format="json").status_code, 400)
        self.other.is_staff = True
        self.other.is_active = False
        self.other.save(update_fields=["is_staff", "is_active"])
        self.assertEqual(self.client.post(self.url, {**self.body, "assigned_to": self.other.pk}, format="json").status_code, 400)
        self.ticket.status = "resolved"
        self.ticket.save(update_fields=["status"])
        self.assertEqual(self.client.post(self.url, self.body, format="json").status_code, 400)

    def test_notification_failure_rolls_back_assignment_and_audit(self):
        with patch("apps.engagement.api.Notification.objects.create", side_effect=RuntimeError("failed")):
            with self.assertRaises(RuntimeError):
                self.client.post(self.url, self.body, format="json")
        self.ticket.refresh_from_db()
        self.assertIsNone(self.ticket.assigned_to)
        self.assertEqual(self.ticket.priority, "normal")
        self.assertFalse(AuditLog.objects.filter(action="support.routed").exists())
