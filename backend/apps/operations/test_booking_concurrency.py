"""PostgreSQL regressions for booking retries and provider appointment conflicts."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import connection, connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Division, Offering, Organization, ServiceArea

from .models import AuditLog, Booking


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locks")
class BookingConcurrencyTests(TransactionTestCase):
    def setUp(self):
        users = get_user_model()
        self.customer = users.objects.create_user(username="race-customer", email="race-customer@example.invalid")
        self.provider = users.objects.create_user(username="race-provider", email="race-provider@example.invalid")
        self.provider.groups.add(Group.objects.create(name="Provider"))
        self.manager = users.objects.create_user(username="race-manager", email="race-manager@example.invalid")
        self.manager.user_permissions.add(*Permission.objects.filter(content_type__app_label="operations", codename__in=["view_booking", "change_booking"]))
        division = Division.objects.create(slug="race-service", name="Service", kind="service")
        organization = Organization.objects.create(owner=self.provider, division=division, name="Service", approved=True)
        self.offering = Offering.objects.create(division=division, organization=organization, name="Repair", slug="race-repair", sku="RACE-REPAIR", price=100, duration_minutes=90)
        area = ServiceArea.objects.create(name="Race area")
        area.divisions.add(division)
        self.start = (timezone.now().astimezone(ZoneInfo("Asia/Dhaka")) + timedelta(days=5)).replace(hour=10, minute=0, second=0, microsecond=0)
        self.address = {"recipient": "Customer", "phone": "01712345678", "area": "Race area", "line": "Test road"}

    def race(self, operations):
        ready = Barrier(len(operations))

        def run(operation):
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout = '10s'")
                    cursor.execute("SET statement_timeout = '15s'")
                ready.wait(timeout=10)
                return operation()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(operations)) as executor:
            futures = [executor.submit(run, operation) for operation in operations]
            return [future.result(timeout=30) for future in futures]

    def book(self, key, start=None):
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.post("/api/v1/bookings/", {"offering": self.offering.pk, "scheduled_at": (start or self.start).isoformat(), "address": self.address}, format="json", HTTP_IDEMPOTENCY_KEY=key)
        return response.status_code, response.data

    def confirmed(self, key, start):
        status, data = self.book(key, start)
        self.assertEqual(status, 201, data)
        booking = Booking.objects.get(pk=data["id"])
        booking.status = "confirmed"
        booking.save(update_fields=["status"])
        return booking

    def assign(self, booking):
        client = APIClient()
        client.force_authenticate(self.manager)
        response = client.post(f"/api/v1/bookings/{booking.pk}/assign/", {"worker": self.provider.pk}, format="json")
        return response.status_code, response.data

    def test_simultaneous_retry_creates_one_booking(self):
        results = self.race([lambda: self.book("same-key"), lambda: self.book("same-key")])
        self.assertEqual([status for status, _ in results], [201, 201])
        self.assertEqual(results[0][1]["id"], results[1][1]["id"])
        self.assertEqual(Booking.objects.count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="booking.created").count(), 1)

    def test_simultaneous_changed_retry_rejected(self):
        results = self.race([lambda: self.book("same-key"), lambda: self.book("same-key", self.start + timedelta(hours=2))])
        self.assertEqual(sorted(status for status, _ in results), [201, 400])
        self.assertEqual(Booking.objects.count(), 1)

    def test_overlapping_appointments_cannot_share_provider(self):
        first = self.confirmed("first", self.start)
        second = self.confirmed("second", self.start + timedelta(minutes=30))
        results = self.race([lambda: self.assign(first), lambda: self.assign(second)])
        self.assertEqual(sorted(status for status, _ in results), [200, 400])
        self.assertEqual(Booking.objects.filter(provider=self.provider).count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="booking.assigned").count(), 1)

    def test_adjacent_appointments_can_share_provider(self):
        first = self.confirmed("first", self.start)
        second = self.confirmed("second", self.start + timedelta(minutes=90))
        results = self.race([lambda: self.assign(first), lambda: self.assign(second)])
        self.assertEqual([status for status, _ in results], [200, 200])
        self.assertEqual(Booking.objects.filter(provider=self.provider).count(), 2)
