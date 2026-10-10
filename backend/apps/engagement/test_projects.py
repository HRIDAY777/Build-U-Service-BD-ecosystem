import uuid
import tempfile
from pathlib import Path
from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from .project_models import ProjectApplication, ManagedProject, ProjectEntry, ProjectUpdate
from .project_api import schedule


class ProjectAccountTests(TestCase):
    def setUp(self):
        test_root = Path(__file__).resolve().parents[3] / "artifacts"
        test_root.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=test_root)
        self.addCleanup(temporary.cleanup)
        media = override_settings(MEDIA_ROOT=temporary.name)
        media.enable()
        self.addCleanup(media.disable)
        users = get_user_model()
        self.owner = users.objects.create_user(username="project-owner", email="owner@example.invalid")
        self.other = users.objects.create_user(username="project-other", email="other@example.invalid")
        self.staff = users.objects.create_superuser(username="project-admin", email="admin@example.invalid", password="test-only")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.project = ManagedProject.objects.create(title="Sample solar project", category="solar", area="Dhaka", description="Demo", published=True)

    def payload(self, **kwargs):
        return dict(kind="investor", name="Test Applicant", phone="01712345678", address="Dhaka", details="Solar project", package="starter", amount="10000", months=40, consent=True, request_key=str(uuid.uuid4()), **kwargs)

    def create(self):
        response = self.client.post("/api/v1/project-applications/", self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def upload(self, url):
        document = SimpleUploadedFile("agreement.pdf", b"%PDF-1.4\n% Local test document\n%%EOF", content_type="application/pdf")
        response = self.client.post(url+"agreement/", {"document": document}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(response.data["agreement_sha256"]), 64)

    def test_server_prices_terms_idempotency_and_privacy(self):
        payload = self.payload()
        payload["expected_total"] = "999999"
        response = self.client.post("/api/v1/project-applications/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["expected_total"], "10800.00")
        self.assertEqual(response.data["months"], 4)
        self.assertEqual(response.data["payment_schedule"], [])
        self.assertIsNone(response.data["term"]["maturity_date"])
        self.assertEqual(self.client.post("/api/v1/project-applications/", payload, format="json").status_code, 200)
        self.assertEqual(ProjectApplication.objects.count(), 1)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/v1/project-applications/{response.data["id"]}/').status_code, 404)
        self.assertEqual(self.client.get("/api/v1/project-applications/").data["count"], 0)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get("/api/v1/project-applications/").status_code, [401, 403])

    def test_invalid_units_consent_and_package(self):
        for field, value in [("amount", "10001"), ("amount", "-1"), ("consent", False), ("package", "unknown"), ("months", 41)]:
            payload = self.payload()
            payload[field] = value
            self.assertEqual(self.client.post("/api/v1/project-applications/", payload, format="json").status_code, 400)

    def test_filters_keep_private_scope_and_validate_input(self):
        key = self.create()
        ProjectApplication.objects.filter(pk=key).update(agreement_reference="SEARCH-REF")
        self.client.force_authenticate(self.other)
        self.create()
        url = "/api/v1/project-applications/"
        self.assertEqual(self.client.get(url, {"search": "SEARCH-REF"}).data["count"], 0)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(url, {"search": "SEARCH-REF", "status": "submitted", "kind": "investor"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"kind": "client"}).data["count"], 0)
        self.assertEqual(self.client.get(url, {"status": "active"}).data["count"], 0)
        for query in [{"status": "invalid"}, {"kind": "invalid"}, {"search": "a" * 181}]:
            self.assertEqual(self.client.get(url, query).status_code, 400)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(url).data["count"], 2)

    def test_every_package_matches_supplied_proposal(self):
        for pack, amount, term, total in [("starter", 10000, 4, 10800), ("basic", 25000, 6, 28000), ("premium", 50000, 12, 61000), ("regular", 100000, 40, 125000), ("growth", 100000, 40, 150000)]:
            payload = self.payload()
            payload.update(package=pack, amount=str(amount * 2))
            result = self.client.post("/api/v1/project-applications/", payload, format="json")
            self.assertEqual(result.status_code, 201)
            self.assertEqual(result.data["months"], term)
            self.assertEqual(Decimal(result.data["expected_total"]), total * 2)

    def test_client_confirmed_price_requires_owner_acknowledgement(self):
        payload = self.payload()
        payload.update(kind="client", amount="100000", months=40)
        result = self.client.post("/api/v1/project-applications/", payload, format="json")
        url = f'/api/v1/project-applications/{result.data["id"]}/'
        self.client.force_authenticate(self.staff)
        self.client.post(url+"review/", {"status": "reviewing"}, format="json")
        self.upload(url)
        confirmed = self.client.post(url+"review/", {"status": "approved", "project": self.project.pk, "agreement_reference": "TEST-CLIENT", "confirmed_amount": "120000"}, format="json")
        self.assertEqual(confirmed.data["amount"], "120000.00")
        self.assertEqual(self.client.post(url+"review/", {"status": "active", "start_date": "2026-01-31"}, format="json").status_code, 400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url+"accept/", {"consent": True}, format="json").status_code, 404)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(url+"accept/", {"consent": True, "signed_name": "Test Applicant"}, format="json").status_code, 200)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(url+"ledger/", {"kind": "receipt", "amount": "72000", "date": "2026-01-30", "reference": "TEST-CLIENT-60"}, format="json").status_code, 201)
        result = self.client.post(url+"review/", {"status": "active", "start_date": "2026-01-31"}, format="json")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(sum(Decimal(r["amount"]) for r in result.data["payment_schedule"]), 48000)

    def test_lifecycle_ledger_and_permissions(self):
        key = self.create()
        url = f"/api/v1/project-applications/{key}/"
        self.assertEqual(self.client.post(url+"review/", {"status": "reviewing"}, format="json").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(url+"review/", {"status": "active"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(url+"review/", {"status": "reviewing"}, format="json").status_code, 200)
        self.upload(url)
        self.assertEqual(self.client.post(url+"review/", {"status": "approved"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(url+"review/", {"status": "approved", "project": self.project.pk, "agreement_reference": "TEST-AGREEMENT"}, format="json").status_code, 200)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(url+"accept/", {"consent": True, "signed_name": "Test Applicant"}, format="json").status_code, 200)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(url+"review/", {"status": "active", "start_date": "2026-01-31"}, format="json").status_code, 400)
        receipt = {"kind": "receipt", "amount": "10000", "date": "2026-01-01", "reference": "TEST-CAPITAL"}
        self.assertEqual(self.client.post(url+"ledger/", receipt, format="json").status_code, 201)
        self.assertEqual(self.client.post(url+"ledger/", receipt, format="json").status_code, 400)
        result = self.client.post(url+"review/", {"status": "active", "start_date": "2026-01-31"}, format="json")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["payment_schedule"][0]["date"], "2026-05-31")
        self.assertEqual(result.data["payment_schedule"][0]["amount"], "10800.00")
        self.assertEqual(result.data["term"]["maturity_date"], "2026-05-31")
        self.assertEqual(self.client.post(url+"review/", {"status": "completed"}, format="json").status_code, 400)
        payout = {"kind": "distribution", "amount": "10801", "date": "2026-05-31", "reference": "TEST-PAYOUT"}
        self.assertEqual(self.client.post(url+"ledger/", payout, format="json").status_code, 400)
        payout["amount"] = "10800"
        self.assertEqual(self.client.post(url+"ledger/", payout, format="json").status_code, 201)
        self.assertEqual(self.client.post(url+"review/", {"status": "completed"}, format="json").status_code, 200)
        self.assertEqual(self.client.get(url).data["payment_schedule"][0]["remaining"], "0.00")
        self.assertEqual(ProjectEntry.objects.count(), 2)

    def test_rounding_and_month_end(self):
        obj = ProjectApplication(kind="client", amount=Decimal("10001.01"), expected_total=Decimal("10001.01"), months=3, start_date=date(2024, 1, 31))
        rows = schedule(obj)
        self.assertEqual(rows[0]["date"], "2024-02-29")
        self.assertEqual(sum(Decimal(r["amount"]) for r in rows), Decimal("4000.40"))

    def test_public_gallery_excludes_private_updates_and_projects(self):
        ManagedProject.objects.create(title="Private", category="solar", area="Dhaka", description="Private")
        ProjectUpdate.objects.create(project=self.project, title="Private note", description="Private", date=date.today())
        ProjectUpdate.objects.create(project=self.project, title="Public milestone", description="Public", date=date.today(), public=True)
        self.client.force_authenticate(None)
        result = self.client.get("/api/v1/managed-projects/").data
        self.assertEqual(result["count"], 1)
        self.assertEqual(len(result["results"][0]["updates"]), 1)

    def test_owner_can_cancel_pending_only(self):
        key = self.create()
        url = f"/api/v1/project-applications/{key}/cancel/"
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(self.client.post(url).status_code, 400)

    def test_statement_privacy_totals_and_spreadsheet_safety(self):
        key = self.create()
        obj = ProjectApplication.objects.get(pk=key)
        obj.name = "=UNTRUSTED()"
        obj.save()
        ProjectEntry.objects.create(application=obj, kind="receipt", amount="120.00", reference="@unsafe", note="+formula", date=date.today(), recorded_by=self.staff)
        ProjectEntry.objects.create(application=obj, kind="refund", amount="20.00", reference="refund", date=date.today(), recorded_by=self.staff)
        url = f"/api/v1/project-applications/{key}/statement/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        text = response.content.decode("utf-8-sig")
        self.assertIn("'=UNTRUSTED()", text)
        self.assertIn("'@unsafe", text)
        self.assertIn("'+formula", text)
        self.assertIn("Net receipts,100.00", text)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(url).status_code, [401, 403])

    def test_private_document_and_frozen_consent_evidence(self):
        key = self.create()
        url = f"/api/v1/project-applications/{key}/"
        document = SimpleUploadedFile("bad.pdf", b"not a PDF")
        self.assertEqual(self.client.post(url+"agreement/", {"document": document}, format="multipart").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.client.post(url+"review/", {"status": "reviewing"}, format="json")
        document = SimpleUploadedFile("bad.pdf", b"not a PDF")
        self.assertEqual(self.client.post(url+"agreement/", {"document": document}, format="multipart").status_code, 400)
        self.upload(url)
        self.client.post(url+"review/", {"status": "approved", "project": self.project.pk, "agreement_reference": "PRIVATE-TEST"}, format="json")
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url+"agreement-file/").status_code, 404)
        self.client.force_authenticate(self.owner)
        download = self.client.get(url+"agreement-file/")
        self.assertEqual(download.status_code, 200)
        self.assertIn("attachment", download["Content-Disposition"])
        self.assertTrue(b"".join(download.streaming_content).startswith(b"%PDF-"))
        download.close()
        self.assertEqual(self.client.post(url+"accept/", {"consent": True, "signed_name": "Other"}, format="json").status_code, 400)
        accepted = self.client.post(url+"accept/", {"consent": True, "signed_name": "Test Applicant"}, format="json")
        self.assertEqual(accepted.status_code, 200)
        evidence = accepted.data["acceptance_snapshot"]
        self.assertEqual(evidence["document_sha256"], accepted.data["agreement_sha256"])
        self.assertEqual(evidence["amount"], "10000.00")
        self.assertEqual(self.client.post(url+"accept/", {"consent": True, "signed_name": "Test Applicant"}, format="json").data["acceptance_snapshot"], evidence)
        self.client.force_authenticate(self.staff)
        document = SimpleUploadedFile("new.pdf", b"%PDF-1.4\n%%EOF")
        self.assertEqual(self.client.post(url+"agreement/", {"document": document}, format="multipart").status_code, 400)
