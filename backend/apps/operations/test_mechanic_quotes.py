from datetime import timedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Division, Offering
from apps.engagement.models import Notification
from .models import Booking, AuditLog


@override_settings(SECURE_SSL_REDIRECT=False)
class MechanicQuoteTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.customer = users.objects.create_user(username="quote-customer", email="quote-customer@example.invalid")
        self.provider = users.objects.create_user(username="quote-provider", email="quote-provider@example.invalid")
        self.provider.groups.add(Group.objects.get_or_create(name="Provider")[0])
        self.stranger = users.objects.create_user(username="quote-stranger", email="quote-stranger@example.invalid")
        division = Division.objects.create(slug="mechanic", name="Mechanic", kind="service")
        offering = Offering.objects.create(division=division, name="Repair", slug="repair", sku="REPAIR", price=500)
        self.booking = Booking.objects.create(customer=self.customer, provider=self.provider,
            offering=offering, scheduled_at=timezone.now() + timedelta(days=1), address={},
            status="arrived", price=500, idempotency_key="quote", request_hash="x")
        self.client = APIClient()
        self.client.force_authenticate(self.provider)
        self.url = f"/api/v1/bookings/{self.booking.pk}/mechanic_quote/"
        self.body = {"revision": "", "items": [
            {"description": "Labour", "quantity": 1, "unit_price": "250.50"},
            {"description": "Brake pads", "quantity": 2, "unit_price": "100.25"},
        ], "note": "Additional repair costs"}

    def publish(self):
        response = self.client.put(self.url, self.body, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["mechanic_quote"]

    def test_quote_total_consent_revisions_and_replay(self):
        quote = self.publish()
        self.assertEqual(quote["extra_total"], "451.00")
        self.assertEqual(quote["status"], "pending")
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.price, 500)
        self.client.force_authenticate(self.customer)
        decision = {"revision": quote["revision"], "decision": "accepted"}
        self.assertEqual(self.client.post(self.url, decision, format="json").status_code, 200)
        count = AuditLog.objects.count()
        self.assertEqual(self.client.post(self.url, decision, format="json").status_code, 200)
        self.assertEqual(AuditLog.objects.count(), count)
        self.client.force_authenticate(self.provider)
        self.body["revision"] = quote["revision"]
        revised = self.publish()
        self.assertEqual(revised["status"], "pending")
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(self.url, decision, format="json").status_code, 400)
        decision = {"revision": revised["revision"], "decision": "rejected"}
        self.assertEqual(self.client.post(self.url, decision, format="json").status_code, 200)
        self.assertTrue(Notification.objects.filter(user=self.provider, title="Repair quotation reviewed").exists())

    def test_privacy_permissions_invalid_input_and_closed_booking(self):
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.put(self.url, self.body, format="json").status_code, 404)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.put(self.url, self.body, format="json").status_code, 403)
        self.client.force_authenticate(self.provider)
        self.assertEqual(self.client.post(self.url, {"revision": "x", "decision": "accepted"}, format="json").status_code, 403)
        for items in [[], [{"description": "Bad", "quantity": 0, "unit_price": "1"}],
                      [{"description": "Bad", "quantity": 1, "unit_price": "-1"}], self.body["items"] * 11]:
            response = self.client.put(self.url, {**self.body, "items": items}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        self.booking.status = "completed"
        self.booking.save(update_fields=["status"])
        self.assertEqual(self.client.put(self.url, self.body, format="json").status_code, 400)
        self.assertFalse(AuditLog.objects.filter(action="booking.mechanic_quote_updated").exists())

    def test_consent_gates_work_and_completion(self):
        quote = self.publish()
        endpoint = f"/api/v1/bookings/{self.booking.pk}/transition/"
        detail = self.client.get(f"/api/v1/bookings/{self.booking.pk}/")
        self.assertNotIn("in_progress", detail.data["available_actions"])
        self.assertEqual(self.client.post(endpoint, {"status": "in_progress"}, format="json").status_code, 400)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(self.url, {"revision": quote["revision"], "decision": "accepted"}, format="json").status_code, 200)
        self.client.force_authenticate(self.provider)
        self.assertEqual(self.client.post(endpoint, {"status": "in_progress"}, format="json").status_code, 200)
        self.body["revision"] = quote["revision"]
        revised = self.publish()
        self.assertEqual(self.client.post(endpoint, {"status": "completed"}, format="json").status_code, 400)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(self.url, {"revision": revised["revision"], "decision": "accepted"}, format="json").status_code, 200)
        self.client.force_authenticate(self.provider)
        self.assertEqual(self.client.post(endpoint, {"status": "completed"}, format="json").status_code, 200)

    def test_quotation_is_restricted_to_mechanic_bookings(self):
        division = self.booking.offering.division
        division.slug = "electrician"
        division.save(update_fields=["slug"])
        self.assertEqual(self.client.put(self.url, self.body, format="json").status_code, 400)
