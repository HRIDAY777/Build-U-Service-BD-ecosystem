from datetime import timedelta
from zoneinfo import ZoneInfo
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Division, Offering, ServiceArea
from .models import Booking, ProviderProfile


@override_settings(SECURE_SSL_REDIRECT=False)
class AvailabilityPreviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        division = Division.objects.create(name="Repair", slug="repair", kind="service")
        self.day = (timezone.now().astimezone(ZoneInfo("Asia/Dhaka")) + timedelta(days=5)).replace(hour=9, minute=0, second=0, microsecond=0)
        self.service = Offering.objects.create(division=division, name="Repair", slug="repair", sku="REPAIR", price=100,
            qualified_provider_required=True, duration_minutes=60,
            service_weekly_hours={str(self.day.weekday()): [{"open": "09:00", "close": "12:00"}]})
        self.area = ServiceArea.objects.create(name="Test area", name_bn="পরীক্ষা")
        self.area.divisions.add(division)
        self.worker = get_user_model().objects.create_user(username="preview-worker", email="preview@example.invalid")
        self.worker.groups.add(Group.objects.create(name="Provider"))
        self.profile = ProviderProfile.objects.create(user=self.worker, restrict_service_areas=True)
        self.profile.approved_services.add(self.service)
        self.profile.service_areas.add(self.area)
        self.url = f"/api/v1/offerings/{self.service.pk}/booking_times/"

    def preview(self, area="Test area"):
        return self.client.get(self.url, {"date": self.day.date().isoformat(), **({"area": area} if area else {})})

    def test_overlaps_removed_adjacent_times_preserved_and_response_private(self):
        start = self.day + timedelta(hours=1)
        Booking.objects.create(customer=self.worker, provider=self.worker, offering=self.service, scheduled_at=start,
            duration_minutes=60, address={}, status="assigned", price=100, idempotency_key="busy", request_hash="x")
        result = self.preview()
        self.assertEqual(result.status_code, 200, result.data)
        self.assertTrue(result.data["availability_checked"])
        self.assertEqual([slot["start"][11:16] for slot in result.data["slots"]], ["09:00", "11:00"])
        self.assertEqual(set(result.data["slots"][0]), {"start", "end"})
        self.assertNotIn("preview-worker", str(result.data))
        self.assertEqual(result["Cache-Control"], "no-store")

    def test_skills_coverage_offline_leave_and_duration_are_applied(self):
        self.assertTrue(self.preview().data["slots"])
        self.profile.approved_services.clear()
        self.assertEqual(self.preview().data["slots"], [])
        self.profile.approved_services.add(self.service)
        self.profile.service_areas.clear()
        self.assertEqual(self.preview().data["slots"], [])
        self.profile.service_areas.add(self.area)
        self.profile.available = False
        self.profile.save()
        self.assertEqual(self.preview().data["slots"], [])
        self.profile.available = True
        self.profile.leave_dates = [self.day.date().isoformat()]
        self.profile.save()
        self.assertEqual(self.preview().data["slots"], [])
        self.profile.leave_dates = []
        self.profile.weekly_hours = {str(self.day.weekday()): [{"open": "09:00", "close": "10:00"}]}
        self.profile.save()
        self.assertEqual([slot["start"][11:16] for slot in self.preview().data["slots"]], ["09:00"])

    def test_coverage_validation_legacy_hours_and_manual_schedule(self):
        legacy = self.preview(area="")
        self.assertFalse(legacy.data["availability_checked"])
        self.assertEqual(len(legacy.data["slots"]), 9)
        self.assertEqual(self.preview(area="unknown").status_code, 400)
        self.area.active = False
        self.area.save()
        self.assertEqual(self.preview().status_code, 400)
        self.area.active = True
        self.area.divisions.clear()
        self.area.save()
        self.assertEqual(self.preview().status_code, 400)
        self.area.divisions.add(self.service.division)
        self.service.service_weekly_hours = {}
        self.service.save()
        self.assertEqual(self.preview().data["mode"], "manual")
        self.assertFalse(self.preview().data["availability_checked"])
