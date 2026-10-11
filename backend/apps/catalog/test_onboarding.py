import tempfile
from pathlib import Path
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from .models import Division, PartnerApplication, PartnerDocument, Organization


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
