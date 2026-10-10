from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.operations.models import Order, InventoryMovement, AuditLog
from .models import Division, Organization, Offering, ServiceArea
from .restaurant_rules import restaurant_status, validate_weekly_hours


@override_settings(SECURE_SSL_REDIRECT=False)
class RestaurantTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.owner = users.objects.create_user(username="restaurant-owner", email="owner@restaurant.invalid")
        self.customer = users.objects.create_user(
            username="restaurant-customer", email="customer@restaurant.invalid"
        )
        self.food = Division.objects.create(slug="food", name="Food", name_bn="খাবার", kind="goods")
        self.restaurant = Organization.objects.create(
            name="Demo restaurant",
            division=self.food,
            owner=self.owner,
            approved=True,
            area="Dhanmondi",
            minimum_order="250",
        )
        self.item = Offering.objects.create(
            division=self.food,
            organization=self.restaurant,
            name="Demo meal",
            name_bn="ডেমো",
            slug="demo-meal",
            sku="DEMO-MEAL",
            price="100",
            stock=20,
        )
        area = ServiceArea.objects.create(name="Dhanmondi", name_bn="ধানমন্ডি", delivery_fee=60)
        area.divisions.add(self.food)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        self.payload = {
            "items": [{"offering": self.item.pk, "quantity": 3}],
            "address": {
                "recipient": "Demo customer",
                "phone": "01712345678",
                "area": "Dhanmondi",
                "line": "Demo address",
            },
        }

    def test_hours_boundaries_and_overnight_in_bangladesh(self):
        self.restaurant.weekly_hours = {"0": [{"open": "22:00", "close": "02:00"}]}
        # 2026-10-12 is Monday. UTC is converted to Asia/Dhaka.
        for utc, expected in [
            ("2026-10-12T15:59:00", False),
            ("2026-10-12T16:00:00", True),
            ("2026-10-12T19:59:00", True),
            ("2026-10-12T20:00:00", False),
            ("2026-10-13T16:00:00", False),
        ]:
            with self.subTest(utc=utc):
                self.assertEqual(
                    restaurant_status(
                        self.restaurant, datetime.fromisoformat(utc).replace(tzinfo=dt_timezone.utc)
                    )["is_open"],
                    expected,
                )
        self.restaurant.weekly_hours = {"6": [{"open": "22:00", "close": "02:00"}]}
        self.assertTrue(
            restaurant_status(self.restaurant, datetime(2026, 10, 11, 19, tzinfo=dt_timezone.utc))["is_open"]
        )
        self.restaurant.weekly_hours = {"0": [{"open": "00:00", "close": "24:00"}]}
        validate_weekly_hours(self.restaurant.weekly_hours)
        self.assertTrue(
            restaurant_status(self.restaurant, datetime(2026, 10, 12, 17, 59, tzinfo=dt_timezone.utc))[
                "is_open"
            ]
        )
        self.assertFalse(
            restaurant_status(self.restaurant, datetime(2026, 10, 12, 18, tzinfo=dt_timezone.utc))["is_open"]
        )

    def test_invalid_hours_rejected(self):
        for hours in [
            [],
            {"7": []},
            {"0": {}},
            {"0": [{"open": "25:00", "close": "10:00"}]},
            {"0": [{"open": "10:00", "close": "10:00"}]},
            {"0": [{"open": "10:00"}]},
        ]:
            with self.subTest(hours=hours), self.assertRaises(ValidationError):
                validate_weekly_hours(hours)

    def test_mismatched_merchant_division_cannot_checkout(self):
        other = Division.objects.create(slug="shop", name="Shop", name_bn="শপ", kind="goods")
        self.restaurant.division = other
        self.restaurant.save(update_fields=["division"])
        response = self.client.post("/api/v1/orders/", self.payload, format="json", HTTP_IDEMPOTENCY_KEY="wrong-division")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_minimum_uses_food_subtotal_and_failed_order_does_not_reserve(self):
        self.payload["items"][0]["quantity"] = 2  # subtotal 200 + delivery 60 must still fail
        result = self.client.post(
            "/api/v1/orders/", self.payload, format="json", HTTP_IDEMPOTENCY_KEY="minimum"
        )
        self.assertEqual(result.status_code, 400, result.data)
        self.assertFalse(Order.objects.exists())
        self.assertFalse(InventoryMovement.objects.exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 20)

    def test_pause_and_close_are_rechecked_after_quote(self):
        quote = self.client.post("/api/v1/orders/quote/", self.payload, format="json")
        self.assertEqual(quote.status_code, 200, quote.data)
        self.assertEqual(quote.data["preparation_minutes"], 30)
        self.restaurant.accepting_orders = False
        self.restaurant.save()
        self.assertEqual(
            self.client.post(
                "/api/v1/orders/", self.payload, format="json", HTTP_IDEMPOTENCY_KEY="paused"
            ).status_code,
            400,
        )
        self.restaurant.accepting_orders = True
        self.restaurant.weekly_hours = {str(day): [] for day in range(7)}
        self.restaurant.save()
        self.assertEqual(
            self.client.post("/api/v1/orders/quote/", self.payload, format="json").status_code, 400
        )

    def test_success_snapshots_preparation_and_duplicate_is_safe(self):
        first = self.client.post("/api/v1/orders/", self.payload, format="json", HTTP_IDEMPOTENCY_KEY="meal")
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data["preparation_minutes"], 30)
        self.assertEqual(Decimal(first.data["total"]), Decimal("360"))
        self.restaurant.preparation_minutes = 60
        self.restaurant.accepting_orders = False
        self.restaurant.save()
        second = self.client.post("/api/v1/orders/", self.payload, format="json", HTTP_IDEMPOTENCY_KEY="meal")
        self.assertEqual(second.data["id"], first.data["id"])
        self.assertEqual(second.data["preparation_minutes"], 30)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 17)

    def test_owner_settings_validation_privacy_and_audit(self):
        url = f"/api/v1/partner-restaurants/{self.restaurant.pk}/"
        self.assertEqual(self.client.patch(url, {"accepting_orders": False}, format="json").status_code, 404)
        self.client.force_authenticate(self.owner)
        for data in [
            {"minimum_order": -1},
            {"preparation_minutes": 0},
            {"preparation_minutes": 361},
            {"weekly_hours": {"8": []}},
        ]:
            self.assertEqual(self.client.patch(url, data, format="json").status_code, 400)
        result = self.client.patch(
            url,
            {
                "minimum_order": "400",
                "preparation_minutes": 45,
                "weekly_hours": {"0": [{"open": "09:00", "close": "22:00"}]},
                "approved": False,
                "owner": self.customer.pk,
            },
            format="json",
        )
        self.assertEqual(result.status_code, 200, result.data)
        self.restaurant.refresh_from_db()
        self.assertTrue(self.restaurant.approved)
        self.assertEqual(self.restaurant.owner_id, self.owner.pk)
        self.assertEqual(self.restaurant.minimum_order, Decimal("400"))
        self.assertTrue(AuditLog.objects.filter(action="restaurant.settings_updated").exists())
        public = APIClient().get(f"/api/v1/organizations/{self.restaurant.pk}/")
        self.assertNotIn("owner", public.data)
        self.assertEqual(public.data["preparation_minutes"], 45)
