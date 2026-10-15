from datetime import timedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Division, Offering
from apps.engagement.models import Notification
from .models import Booking, ProviderProfile, AuditLog


@override_settings(
    SECURE_SSL_REDIRECT=False,
    REST_FRAMEWORK={
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
        "PAGE_SIZE": 24,
    },
)
class ProviderTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.customer = users.objects.create_user(username="customer", email="customer@example.invalid")
        self.provider = users.objects.create_user(
            username="provider", email="provider@example.invalid", first_name="Demo Technician"
        )
        self.provider.groups.add(Group.objects.create(name="Provider"))
        self.manager = users.objects.create_user(username="manager", email="manager@example.invalid")
        self.manager.user_permissions.add(
            *Permission.objects.filter(codename__in=["view_booking", "change_booking"])
        )
        division = Division.objects.create(slug="electrician", name="Electrician", kind="service")
        self.service = Offering.objects.create(
            division=division, name="Wiring", slug="wiring", sku="WIRE", price=500, duration_minutes=60
        )
        self.client = APIClient()
        self.client.force_authenticate(self.provider)

    def booking(self, key, **kwargs):
        data = dict(
            customer=self.customer,
            offering=self.service,
            scheduled_at=timezone.now() + timedelta(days=1),
            address={
                "recipient": "Demo customer",
                "phone": "01712345678",
                "area": "Dhanmondi",
                "line": "Demo address",
            },
            status="confirmed",
            price=500,
            idempotency_key=key,
            request_hash="x",
        )
        data.update(kwargs)
        return Booking.objects.create(**data)

    def test_booking_specific_provider_choices_exclude_conflicts_and_leave(self):
        from zoneinfo import ZoneInfo
        target = self.booking("provider-choices")
        self.client.force_authenticate(self.manager)
        endpoint = f"/api/v1/bookings/providers/?booking={target.pk}"
        self.assertEqual(self.client.get(endpoint).data["count"], 1)
        conflict = self.booking("occupied", provider=self.provider,
                                scheduled_at=target.scheduled_at + timedelta(minutes=30))
        self.assertEqual(self.client.get(endpoint).data["count"], 0)
        conflict.status = "completed"
        conflict.save(update_fields=["status"])
        self.assertEqual(self.client.get(endpoint).data["count"], 1)
        profile = ProviderProfile.objects.create(user=self.provider, leave_dates=[
            target.scheduled_at.astimezone(ZoneInfo("Asia/Dhaka")).date().isoformat()
        ])
        self.assertEqual(self.client.get(endpoint).data["count"], 0)
        profile.leave_dates = []
        profile.save(update_fields=["leave_dates"])
        self.assertEqual(self.client.get(endpoint).data["count"], 1)
        self.assertEqual(self.client.get("/api/v1/bookings/providers/?booking=invalid").status_code, 400)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(endpoint).status_code, 403)

    def test_profile_permissions_and_availability_block_new_assignment(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/v1/bookings/provider_profile/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/bookings/providers/").status_code, 403)
        self.client.force_authenticate(self.provider)
        self.assertEqual(
            self.client.patch(
                "/api/v1/bookings/provider_profile/", {"available": False}, format="json"
            ).status_code,
            200,
        )
        self.assertTrue(AuditLog.objects.filter(action="provider.availability_updated").exists())
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get("/api/v1/bookings/providers/").data["count"], 0)
        job = self.booking("offline")
        self.assertEqual(
            self.client.post(
                f"/api/v1/bookings/{job.pk}/assign/", {"worker": self.provider.pk}, format="json"
            ).status_code,
            400,
        )
        job.refresh_from_db()
        self.assertIsNone(job.provider)

    def test_assignment_conflicts_and_notifications(self):
        first = self.booking("first")
        second = self.booking("second", scheduled_at=first.scheduled_at + timedelta(minutes=30))
        self.client.force_authenticate(self.manager)
        self.assertEqual(
            self.client.get("/api/v1/bookings/providers/").data["results"][0]["name"], "Demo Technician"
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/bookings/{first.pk}/assign/", {"worker": self.provider.pk}, format="json"
            ).status_code,
            200,
        )
        self.assertTrue(
            Notification.objects.filter(user=self.provider, title="Service job assigned").exists()
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/bookings/{second.pk}/assign/", {"worker": self.provider.pk}, format="json"
            ).status_code,
            400,
        )
        second.scheduled_at = first.scheduled_at + timedelta(minutes=60)
        second.save()
        self.assertEqual(
            self.client.post(
                f"/api/v1/bookings/{second.pk}/assign/", {"worker": self.provider.pk}, format="json"
            ).status_code,
            200,
        )

    def test_assigned_jobs_private_and_provider_can_complete_while_offline(self):
        job = self.booking("mine", provider=self.provider, status="assigned")
        hidden = self.booking("hidden")
        ProviderProfile.objects.create(user=self.provider, available=False)
        self.assertEqual(self.client.get(f"/api/v1/bookings/{hidden.pk}/").status_code, 404)
        result = self.client.get("/api/v1/bookings/?assigned_to_me=1")
        self.assertEqual(result.data["count"], 1)
        self.assertEqual(result.data["results"][0]["available_actions"], ["on_the_way"])
        self.assertEqual(
            self.client.post(
                f"/api/v1/bookings/{job.pk}/transition/", {"status": "completed"}, format="json"
            ).status_code,
            400,
        )
        for state in ["on_the_way", "arrived", "in_progress", "completed"]:
            result = self.client.post(
                f"/api/v1/bookings/{job.pk}/transition/", {"status": state}, format="json"
            )
            self.assertEqual(result.status_code, 200, result.data)
        profile = self.client.get("/api/v1/bookings/provider_profile/").data
        self.assertEqual(profile["completed_jobs"], 1)
        self.assertEqual(profile["active_jobs"], 0)
        self.assertEqual(
            self.client.get("/api/v1/bookings/?assigned_to_me=1&status=assigned").data["count"], 0
        )
        self.assertEqual(
            Notification.objects.filter(user=self.customer, title="Service booking updated").count(), 4
        )

    def test_customer_actions_do_not_include_staff_transitions(self):
        job = self.booking("customer", status="pending")
        self.client.force_authenticate(self.customer)
        self.assertEqual(
            self.client.get(f"/api/v1/bookings/{job.pk}/").data["available_actions"], ["cancelled"]
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/bookings/{job.pk}/transition/", {"status": "confirmed"}, format="json"
            ).status_code,
            403,
        )
