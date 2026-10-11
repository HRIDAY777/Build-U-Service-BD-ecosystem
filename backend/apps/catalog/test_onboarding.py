import tempfile
from pathlib import Path
from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from .models import Division, PartnerApplication, PartnerDocument, Organization
from .models import PartnerExpiryReminder
from .renewal_alerts import check_partner_renewal_alerts
from apps.engagement.models import Notification
from apps.operations.models import AuditLog


class PartnerOnboardingTests(TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[3] / "artifacts"
        root.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=root)
        self.addCleanup(temporary.cleanup)
        media = override_settings(MEDIA_ROOT=temporary.name)
        media.enable()
        self.addCleanup(media.disable)
        users = get_user_model()
        self.owner = users.objects.create_user(username="partner-owner", email="owner@example.invalid")
        self.other = users.objects.create_user(username="partner-other", email="other@example.invalid", is_staff=True)
        self.admin = users.objects.create_superuser(username="partner-reviewer", email="review@example.invalid", password="test")
        self.division = Division.objects.create(slug="food", name="Food", name_bn="Food", kind="goods")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        response = self.client.post("/api/v1/partner-applications/", {
            "division": self.division.pk, "business_name": "Test business", "phone": "+8801712345678",
            "area": "Dhaka", "address": "Test address", "status": "approved",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.url = f'/api/v1/partner-applications/{response.data["id"]}/'
        self.application = PartnerApplication.objects.get(pk=response.data["id"])

    def upload(self):
        response = self.client.post(self.url + "document/", {
            "title": "Business document", "file": SimpleUploadedFile("test.pdf", b"%PDF-1.4\n%%EOF"),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn("file", response.data)
        return response.data["id"]

    def test_history_is_private_paginated_and_redacted(self):
        for index in range(27):
            AuditLog.objects.create(actor=self.admin, entity=str(self.application.pk), action="partner.document_reviewed", metadata={"status": "accepted", "note": "PRIVATE NOTE", "filename": "private.pdf"})
        AuditLog.objects.create(actor=self.owner, entity=str(self.application.pk), action="unrelated.secret", metadata={"secret": "hidden"})
        AuditLog.objects.create(entity=str(self.application.pk), action="partner.reviewed", metadata={"status": ["invalid"]})
        url = self.url + "history/"
        result = self.client.get(url)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["count"], 29)
        self.assertEqual(len(result.data["results"]), 24)
        self.assertEqual(result.data["results"][0]["actor"], "system")
        self.assertIsNone(result.data["results"][0]["status"])
        self.assertEqual(set(result.data["results"][0]), {"id", "action", "date", "actor", "status"})
        self.assertNotIn("PRIVATE NOTE", str(result.data))
        self.assertIn("no-store", result["Cache-Control"])
        self.assertEqual(len(self.client.get(url + "?page=2").data["results"]), 5)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(url).status_code, [401, 403])

    def review(self, status, **extra):
        return self.client.post(self.url + "review/", {"status": status, "review_note": "Manual review", **extra}, format="json")

    def accept_documents(self):
        for document in self.application.documents.filter(active=True):
            response = self.client.post(self.url + f"documents/{document.pk}/review/", {"status": "accepted", "note": "Checked against business record"}, format="json")
            self.assertEqual(response.status_code, 200, response.data)

    def test_private_scope_and_self_approval_denied(self):
        self.assertEqual(self.application.status, "submitted")
        self.assertEqual(self.review("reviewing").status_code, 403)
        document = self.upload()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get(self.url + f"documents/{document}/download/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/partner-applications/").data["count"], 0)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, [401, 403])

    def test_review_requires_documents_and_reference_and_preserves_existing_business(self):
        existing = Organization.objects.create(owner=self.owner, division=self.division, name="Existing", approved=False)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.review("approved").status_code, 400)
        self.assertEqual(self.review("reviewing").status_code, 200)
        self.assertEqual(self.review("approved", verification_reference="CHECK-1").status_code, 400)
        self.assertEqual(self.review("needs_changes").status_code, 200)
        self.client.force_authenticate(self.owner)
        self.upload()
        self.assertEqual(self.client.patch(self.url, {"details": "Updated"}, format="json").status_code, 200)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.review("reviewing").status_code, 200)
        self.assertEqual(self.review("approved").status_code, 400)
        self.assertEqual(self.review("approved", verification_reference="CHECK-1").status_code, 400)
        self.accept_documents()
        response = self.review("approved", verification_reference="CHECK-1")
        self.assertEqual(response.status_code, 200, response.data)
        existing.refresh_from_db()
        self.assertFalse(existing.approved)
        created = Organization.objects.get(pk=response.data["organization"])
        self.assertTrue(created.approved)
        self.assertEqual(created.owner, self.owner)
        self.assertEqual(self.review("approved", verification_reference="CHECK-1").status_code, 400)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.patch(self.url, {"business_name": "Changed"}, format="json").status_code, 403)
        self.assertFalse(self.owner.is_staff)

    def test_expiry_withdrawal_and_private_download(self):
        document_id = self.upload()
        response = self.client.get(self.url + f"documents/{document_id}/download/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        # Manual response cleanup must not end TestCase's PostgreSQL transaction.
        with patch("django.http.response.signals.request_finished.send"):
            response.close()
        document = PartnerDocument.objects.get(pk=document_id)
        document.expires_on = timezone.localdate() - timedelta(days=1)
        document.save()
        self.client.force_authenticate(self.admin)
        self.review("reviewing")
        self.assertEqual(self.client.post(self.url + f"documents/{document_id}/review/", {"status": "accepted", "note": "Expired"}, format="json").status_code, 400)
        self.assertEqual(self.review("approved", verification_reference="CHECK-2").status_code, 400)
        self.review("needs_changes")
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(self.url + f"documents/{document_id}/withdraw/").status_code, 200)
        self.upload()
        self.client.patch(self.url, {"details": "Replacement supplied"}, format="json")
        self.client.force_authenticate(self.admin)
        self.review("reviewing")
        self.accept_documents()
        self.assertEqual(self.review("approved", verification_reference="CHECK-2").status_code, 200)

    def test_invalid_upload_and_cancel(self):
        response = self.client.post(self.url + "document/", {"title": "Invalid", "file": SimpleUploadedFile("bad.pdf", b"bad")}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post(self.url + "cancel/").status_code, 200)
        self.assertEqual(self.client.patch(self.url, {"area": "Changed"}, format="json").status_code, 403)

    def test_reviewer_cannot_review_own_application(self):
        document = self.upload()
        self.application.owner = self.admin
        self.application.save()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.review("reviewing").status_code, 403)
        self.application.status = "reviewing"
        self.application.save()
        self.assertEqual(self.client.post(self.url + f"documents/{document}/review/", {"status": "accepted", "note": "Self review"}, format="json").status_code, 403)

    def test_document_review_scope_state_and_rejection(self):
        document = self.upload()
        url = self.url + f"documents/{document}/review/"
        payload = {"status": "accepted", "note": "Checked"}
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        self.review("reviewing")
        self.assertEqual(self.client.post(url, {"status": "rejected", "note": "Unreadable"}, format="json").status_code, 200)
        self.assertEqual(self.review("approved", verification_reference="CHECK-3").status_code, 400)
        self.assertEqual(self.client.post(url, {"status": "accepted", "note": ""}, format="json").status_code, 400)
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 200)
        self.assertEqual(self.review("approved", verification_reference="CHECK-3").status_code, 200)
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        self.client.force_authenticate(self.owner)
        result = self.client.get(self.url).data["documents"][0]
        self.assertEqual(result["review_status"], "accepted")
        self.assertEqual(result["review_note"], "Checked")
        self.assertIsNotNone(result["reviewed_at"])

    def test_expiry_summary_boundaries_and_withdrawal(self):
        document_id = self.upload()
        document = PartnerDocument.objects.get(pk=document_id)
        for days, status, renewal in [(None, "not_provided", False), (-1, "expired", True), (0, "due_today", True), (30, "expiring_soon", True), (31, "valid", False)]:
            document.expires_on = timezone.localdate() + timedelta(days=days) if days is not None else None
            document.save()
            expiry = self.client.get(self.url).data["documents"][0]["expiry"]
            self.assertEqual(expiry["status"], status)
            self.assertEqual(expiry["days_remaining"], days)
            self.assertEqual(expiry["renewal_needed"], renewal)
            self.assertEqual(expiry["as_of"], timezone.localdate().isoformat())
        document.active = False
        document.save()
        expiry = self.client.get(self.url).data["documents"][0]["expiry"]
        self.assertEqual(expiry["status"], "withdrawn")
        self.assertFalse(expiry["renewal_needed"])

    def approved_source(self):
        organization = Organization.objects.create(owner=self.owner, division=self.division, name="Existing business", area="Dhaka", address="Existing address", approved=True)
        self.application.status = "approved"
        self.application.organization = organization
        self.application.save()
        return organization

    def test_renewal_reuses_business_and_keeps_original_frozen(self):
        organization = self.approved_source()
        original_id = self.application.pk
        response = self.client.post(self.url + "renew/")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["renewal_of"], str(original_id))
        self.assertEqual(response.data["documents"], [])
        again = self.client.post(self.url + "renew/")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data["id"], response.data["id"])
        self.application = PartnerApplication.objects.get(pk=response.data["id"])
        self.url = f'/api/v1/partner-applications/{self.application.pk}/'
        self.upload()
        self.client.force_authenticate(self.admin)
        self.review("reviewing")
        self.assertEqual(self.review("approved", verification_reference="RENEW-1").status_code, 400)
        self.accept_documents()
        approved = self.review("approved", verification_reference="RENEW-1")
        self.assertEqual(approved.status_code, 200, approved.data)
        self.assertEqual(approved.data["organization"], organization.pk)
        self.assertEqual(Organization.objects.count(), 1)
        original = PartnerApplication.objects.get(pk=original_id)
        self.assertEqual(original.status, "approved")
        self.assertEqual(original.documents.count(), 0)
        self.assertEqual(original.organization_id, organization.pk)

    def test_renewal_scope_and_ineligible_business(self):
        self.assertEqual(self.client.post(self.url + "renew/").status_code, 400)

        organization = self.approved_source()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(self.url + "renew/").status_code, 403)
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url + "renew/")
        renewal_url = f'/api/v1/partner-applications/{response.data["id"]}/'
        other_division = Division.objects.create(slug="shop", name="Shop", name_bn="Shop", kind="goods")
        self.assertEqual(self.client.patch(renewal_url, {"division": other_division.pk}, format="json").status_code, 400)
        self.assertEqual(self.client.post(renewal_url + "cancel/").status_code, 200)
        self.assertEqual(self.client.post(self.url + "renew/").status_code, 201)
        organization.approved = False
        organization.save()
        self.assertEqual(self.client.post(self.url + "renew/").status_code, 400)

    def test_application_filters_preserve_private_scope(self):
        self.approved_source()
        renewal = PartnerApplication.objects.create(owner=self.owner, division=self.division, business_name="Renewal example", phone="01712345678", area="Mirpur", address="Dhaka", status="needs_changes", renewal_of=self.application)
        PartnerApplication.objects.create(owner=self.other, division=self.division, business_name="Private business", phone="01812345678", area="Mirpur", address="Dhaka", verification_reference="SECRET-REF")
        url = "/api/v1/partner-applications/"
        result = self.client.get(url, {"search": "mirpur", "kind": "renewal", "status": "needs_changes"})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["count"], 1)
        self.assertEqual(result.data["results"][0]["id"], str(renewal.pk))
        self.assertEqual(self.client.get(url, {"search": "SECRET-REF"}).data["count"], 0)
        self.assertEqual(self.client.get(url, {"kind": "initial", "status": "approved"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"status": "unknown"}).status_code, 400)
        self.assertEqual(self.client.get(url, {"kind": "unknown"}).status_code, 400)
        self.assertEqual(self.client.get(url, {"search": "a" * 161}).status_code, 400)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(url, {"search": "SECRET-REF"}).data["count"], 1)

    def due_document(self):
        document_id = self.upload()
        self.approved_source()
        document = PartnerDocument.objects.get(pk=document_id)
        document.expires_on = timezone.localdate() + timedelta(days=30)
        document.save()
        return document

    def test_renewal_reminders_are_private_and_deduplicated(self):
        document = self.due_document()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post("/api/v1/partner-applications/check-renewal-reminders/", {"user": self.owner.pk}, format="json").data["created"], 0)
        self.client.force_authenticate(self.owner)
        self.assertEqual(check_partner_renewal_alerts(user=self.other), 0)
        self.assertEqual(check_partner_renewal_alerts(user=self.owner), 1)
        self.assertEqual(check_partner_renewal_alerts(), 0)
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 1)
        self.assertEqual(PartnerExpiryReminder.objects.get().expires_on, document.expires_on)
        self.assertEqual(self.client.post("/api/v1/partner-applications/check-renewal-reminders/").data["created"], 0)

    def test_reminder_failure_rolls_back_and_retry_succeeds(self):
        self.due_document()
        with patch("apps.catalog.renewal_alerts.Notification.objects.create", side_effect=RuntimeError("notification failure")):
            with self.assertRaises(RuntimeError):
                check_partner_renewal_alerts()
        self.assertFalse(PartnerExpiryReminder.objects.exists())
        self.assertEqual(check_partner_renewal_alerts(), 1)

    def test_reminders_skip_superseded_and_ineligible_documents(self):
        document = self.due_document()
        document.expires_on = timezone.localdate() + timedelta(days=31)
        document.save()
        self.assertEqual(check_partner_renewal_alerts(), 0)
        document.expires_on = timezone.localdate() - timedelta(days=1)
        document.active = False
        document.save()
        self.assertEqual(check_partner_renewal_alerts(), 0)
        document.active = True
        document.save()
        organization = self.application.organization
        organization.approved = False
        organization.save()
        self.assertEqual(check_partner_renewal_alerts(), 0)
        organization.approved = True
        organization.save()
        organization.owner = self.other
        organization.save()
        self.assertEqual(check_partner_renewal_alerts(), 0)
        organization.owner = self.owner
        organization.save()
        self.owner.is_active = False
        self.owner.save()
        self.assertEqual(check_partner_renewal_alerts(), 0)
        self.owner.is_active = True
        self.owner.save()
        PartnerApplication.objects.create(owner=self.owner, division=self.division, business_name="Renewed", phone="01712345678", area="Dhaka", address="Dhaka", organization=organization, status="approved", renewal_of=self.application)
        self.assertEqual(check_partner_renewal_alerts(), 0)
