"""Real PostgreSQL transactions; SQLite cannot validate row locking."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.engagement.models import Notification
from apps.operations.models import AuditLog

from .models import Division, Organization, PartnerApplication, PartnerDocument, PartnerExpiryReminder
from .renewal_alerts import check_partner_renewal_alerts


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locks")
class PartnerConcurrencyTests(TransactionTestCase):
    def setUp(self):
        users = get_user_model()
        self.owner = users.objects.create_user(username="concurrent-owner")
        self.admin = users.objects.create_superuser(username="concurrent-reviewer", email="review@example.invalid", password="test")
        self.division = Division.objects.create(slug="concurrent", name="Concurrent", kind="goods")
        self.application = PartnerApplication.objects.create(owner=self.owner, division=self.division, business_name="Concurrent business", phone="01712345678", area="Dhaka", address="Dhaka", status="reviewing")
        PartnerDocument.objects.create(application=self.application, title="Checked document", file="private/test.pdf", sha256="a" * 64, review_status="accepted")

    def race(self, operations):
        ready = Barrier(len(operations))

        def run(operation):
            try:
                # A deadlock or broken lock must fail this test, never hang the suite.
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

    def post(self, user, application, action, data=None):
        client = APIClient()
        client.force_authenticate(user)
        response = client.post(f"/api/v1/partner-applications/{application.pk}/{action}/", data or {}, format="json")
        return response.status_code, response.data

    def approve(self):
        return self.post(self.admin, self.application, "review", {"status": "approved", "review_note": "Checked", "verification_reference": "CONCURRENT-1"})

    def approved_business(self):
        self.assertEqual(self.approve()[0], 200)
        self.application.refresh_from_db()
        return self.application.organization

    def test_simultaneous_approval_creates_one_business(self):
        results = self.race([self.approve, self.approve])
        self.assertEqual(sorted(status for status, _ in results), [200, 400])
        self.assertEqual(Organization.objects.filter(owner=self.owner).count(), 1)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "approved")
        self.assertEqual(AuditLog.objects.filter(entity=str(self.application.pk), action="partner.reviewed").count(), 1)

    def test_renewal_from_different_approved_sources_creates_one_application(self):
        organization = self.approved_business()
        second = PartnerApplication.objects.create(owner=self.owner, division=self.division, organization=organization, renewal_of=self.application, status="approved", business_name="Concurrent business", phone="01712345678", area="Dhaka", address="Dhaka")
        results = self.race([
            lambda: self.post(self.owner, self.application, "renew"),
            lambda: self.post(self.owner, second, "renew"),
        ])
        self.assertEqual(sorted(status for status, _ in results), [200, 201])
        self.assertEqual(results[0][1]["id"], results[1][1]["id"])
        self.assertEqual(PartnerApplication.objects.filter(renewal_of__organization=organization, status="submitted").count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="partner.renewal_requested").count(), 1)

    def test_simultaneous_reminder_checks_create_one_notification(self):
        self.approved_business()
        document = self.application.documents.get()
        document.expires_on = timezone.localdate() + timedelta(days=5)
        document.save(update_fields=["expires_on"])
        results = self.race([
            lambda: check_partner_renewal_alerts(user=self.owner),
            lambda: check_partner_renewal_alerts(user=self.owner),
        ])
        self.assertEqual(sorted(results), [0, 1])
        self.assertEqual(PartnerExpiryReminder.objects.count(), 1)
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 1)
