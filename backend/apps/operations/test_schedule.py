from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Division, Offering, Organization, ServiceArea
from apps.catalog.service_schedule import appointment_allowed
from .models import Booking, ProviderProfile


@override_settings(SECURE_SSL_REDIRECT=False)
class ScheduleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = get_user_model().objects.create_user(username="schedule-customer", email="customer@example.invalid")
        self.worker = get_user_model().objects.create_user(username="schedule-worker", email="worker@example.invalid")
        self.worker.groups.add(Group.objects.create(name="Provider"))
        self.manager = get_user_model().objects.create_user(username="schedule-manager", email="manager@example.invalid")
        self.manager.user_permissions.add(*Permission.objects.filter(codename__in=["view_booking", "change_booking"]))
        division = Division.objects.create(slug="services", name="Services", kind="service")
        merchant = Organization.objects.create(name="Services", division=division, owner=self.worker, approved=True)
        self.service = Offering.objects.create(division=division, organization=merchant, name="Repair", slug="repair", sku="REPAIR", price=100, duration_minutes=90)
        area = ServiceArea.objects.create(name="Test area")
        area.divisions.add(division)
        future = timezone.now().astimezone(ZoneInfo("Asia/Dhaka")) + timedelta(days=5)
        self.start = future.replace(hour=10, minute=0, second=0, microsecond=0)
        self.hours = {str(self.start.weekday()): [{"open": "09:00", "close": "12:00"}]}
        self.address = {"recipient": "Customer", "phone": "01712345678", "area": "Test area", "line": "Test road"}

    def book(self, start=None, key="schedule"):
        self.client.force_authenticate(self.customer)
        return self.client.post("/api/v1/bookings/", {"offering": self.service.pk, "scheduled_at": (start or self.start).isoformat(), "address": self.address}, format="json", HTTP_IDEMPOTENCY_KEY=key)

    def test_entire_duration_boundaries_and_overnight_leave(self):
        self.assertTrue(appointment_allowed(self.hours, [], self.start, 120))
        self.assertFalse(appointment_allowed(self.hours, [], self.start, 121))
        self.assertFalse(appointment_allowed(self.hours, [], self.start.replace(hour=8), 60))
        night = datetime(2030, 1, 7, 23, 30, tzinfo=ZoneInfo("Asia/Dhaka"))
        hours = {"0": [{"open": "22:00", "close": "02:00"}]}
        self.assertTrue(appointment_allowed(hours, [], night, 150))
        self.assertTrue(appointment_allowed(hours, ["2030-01-08"], night, 30))
        self.assertFalse(appointment_allowed(hours, ["2030-01-08"], night, 31))
        self.assertTrue(appointment_allowed({"0": [{"open": "00:00", "close": "24:00"}]}, [], night, 30))
        self.assertFalse(appointment_allowed({"1": []}, [], night, 30))

    def test_booking_hours_leave_snapshot_and_repeat(self):
        self.service.service_weekly_hours = self.hours
        self.service.save()
        self.assertEqual(self.book(self.start.replace(hour=11)).status_code, 400)
        result = self.book()
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["duration_minutes"], 90)
        self.service.duration_minutes = 5
        self.service.service_leave_dates = [self.start.date().isoformat()]
        self.service.save()
        self.assertEqual(self.book(key="new").status_code, 400)
        repeated = self.book()
        self.assertEqual(repeated.status_code, 201)
        self.assertEqual(repeated.data["duration_minutes"], 90)
        self.assertEqual(Booking.objects.count(), 1)

    def test_provider_schedule_and_snapshot_conflict(self):
        result = self.book()
        job = Booking.objects.get(pk=result.data["id"])
        job.status = "confirmed"
        job.save()
        profile = ProviderProfile.objects.create(user=self.worker, weekly_hours=self.hours, leave_dates=[self.start.date().isoformat()])
        self.client.force_authenticate(self.manager)
        endpoint = f"/api/v1/bookings/{job.pk}/assign/"
        self.assertEqual(self.client.post(endpoint, {"worker": self.worker.pk}, format="json").status_code, 400)
        profile.leave_dates = []
        profile.save()
        self.assertEqual(self.client.post(endpoint, {"worker": self.worker.pk}, format="json").status_code, 200)
        self.service.duration_minutes = 5
        self.service.save()
        second = self.book(self.start + timedelta(minutes=30), "second")
        job2 = Booking.objects.get(pk=second.data["id"])
        job2.status = "confirmed"
        job2.save()
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{job2.pk}/assign/", {"worker": self.worker.pk}, format="json").status_code, 400)

    def test_schedule_validation_ownership_and_calendar_privacy(self):
        self.client.force_authenticate(self.worker)
        profile = "/api/v1/bookings/provider_profile/"
        for data in ({"weekly_hours": {"7": []}}, {"weekly_hours": {"0": [{"open": "oops", "close": "10:00"}]}}, {"leave_dates": ["2030-02-30"]}, {"leave_dates": ["2030-01-01", "2030-01-01"]}):
            self.assertEqual(self.client.patch(profile, data, format="json").status_code, 400)
        self.assertEqual(self.client.patch(profile, {"weekly_hours": self.hours}, format="json").status_code, 200)
        endpoint = f"/api/v1/partner-offerings/{self.service.pk}/service_schedule/"
        data = {"weekly_hours": self.hours, "leave_dates": [], "duration_minutes": 90}
        self.assertEqual(self.client.put(endpoint, data, format="json").status_code, 200)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.put(endpoint, data, format="json").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/bookings/calendar/?date=2030-01-01").status_code, 403)
        result = self.book()
        job = Booking.objects.get(pk=result.data["id"])
        job.provider = self.worker
        job.save()
        self.client.force_authenticate(self.worker)
        calendar = self.client.get(f"/api/v1/bookings/calendar/?date={self.start.date().isoformat()}")
        self.assertEqual(calendar.status_code, 200, calendar.data)
        self.assertEqual(len(calendar.data["results"]), 1)
        self.assertEqual(self.client.get("/api/v1/bookings/calendar/?date=bad").status_code, 400)


    def test_public_times_fit_duration_and_respect_closure_and_privacy(self):
        self.service.service_weekly_hours = self.hours
        self.service.save()
        self.client.force_authenticate(None)
        endpoint = f"/api/v1/offerings/{self.service.pk}/booking_times/?date={self.start.date().isoformat()}"
        result = self.client.get(endpoint)
        self.assertEqual(result.status_code, 200, result.data)
        self.assertTrue(result.data["requires_confirmation"])
        self.assertEqual(result.data["timezone"], "Asia/Dhaka")
        starts = [slot["start"][11:16] for slot in result.data["slots"]]
        self.assertEqual(starts, ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30"])
        self.assertNotIn("provider", str(result.data))
        self.service.service_leave_dates = [self.start.date().isoformat()]
        self.service.save()
        self.assertEqual(self.client.get(endpoint).data["mode"], "closed")
        self.service.service_weekly_hours = {}
        self.service.save()
        self.assertEqual(self.client.get(endpoint).data["mode"], "closed")
        self.service.service_leave_dates = []
        self.service.save()
        self.assertEqual(self.client.get(endpoint).data["mode"], "manual")
        self.service.active = False
        self.service.save()
        self.assertEqual(self.client.get(endpoint).status_code, 404)

    def test_suggestion_dates_and_nonservice_rejected(self):
        self.client.force_authenticate(None)
        endpoint = f"/api/v1/offerings/{self.service.pk}/booking_times/?date="
        for day in ("bad", "2000-01-01", "2099-01-01"):
            self.assertEqual(self.client.get(endpoint + day).status_code, 400)
        division = Division.objects.create(slug="shop", name="Shop", kind="goods")
        item = Offering.objects.create(division=division, name="Goods", slug="goods", sku="GOODS", price=100)
        self.assertEqual(self.client.get(f"/api/v1/offerings/{item.pk}/booking_times/?date={self.start.date().isoformat()}").status_code, 400)

    def test_overnight_suggestions_skip_elapsed_times(self):
        from apps.catalog.service_schedule import suggested_appointments
        self.service.service_weekly_hours = {"0": [{"open": "22:00", "close": "02:00"}]}
        day = datetime(2030, 1, 8).date()
        now = datetime(2030, 1, 8, 0, 0, tzinfo=ZoneInfo("Asia/Dhaka"))
        result = suggested_appointments(self.service, day, now)
        self.assertEqual([slot["start"][11:16] for slot in result["slots"]], ["00:15", "00:30"])
