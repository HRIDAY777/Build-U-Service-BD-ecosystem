from decimal import Decimal
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.catalog.models import Division, Organization, Offering, ServiceArea, FoodOptionGroup, FoodOption
from .models import Order


@override_settings(SECURE_SSL_REDIRECT=False)
class FoodOptionTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="option-owner", email="owner@example.invalid")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        division = Division.objects.create(slug="food", name="Food", kind="goods")
        merchant = Organization.objects.create(name="Kitchen", division=division, owner=self.user, approved=True)
        area = ServiceArea.objects.create(name="Test area", delivery_fee=60)
        area.divisions.add(division)
        self.meal = Offering.objects.create(division=division, organization=merchant, name="Meal", slug="meal", sku="MEAL", price=100, stock=10)
        self.group = FoodOptionGroup.objects.create(offering=self.meal, name="Size", min_choices=1, max_choices=1)
        self.small = FoodOption.objects.create(group=self.group, name="Small", price=0)
        self.large = FoodOption.objects.create(group=self.group, name="Large", price=50)

    def checkout(self, choices, **extra):
        return self.client.post("/api/v1/orders/", {"items": [{"offering": self.meal.pk, "quantity": 2, "food_options": choices}], "address": {"recipient": "Customer", "phone": "01712345678", "area": "Test area", "line": "Test road"}, **extra}, format="json", HTTP_IDEMPOTENCY_KEY="food-options")

    def test_required_maximum_duplicate_and_inactive_choices(self):
        for choices in ([], [self.small.pk, self.large.pk], [self.small.pk, self.small.pk]):
            self.assertEqual(self.checkout(choices).status_code, 400)
        self.large.active = False
        self.large.save()
        self.assertEqual(self.checkout([self.large.pk]).status_code, 400)
        self.meal.refresh_from_db()
        self.assertEqual(self.meal.stock, 10)

    def test_server_price_snapshot_and_idempotency(self):
        response = self.checkout([self.large.pk], total="1")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data["total"]), Decimal("360"))
        order = Order.objects.get()
        self.large.name = "Changed"
        self.large.price = 90
        self.large.save()
        repeated = self.checkout([self.large.pk])
        self.assertEqual(str(repeated.data["id"]), str(order.pk))
        self.assertEqual(order.items.get().food_options[0]["name"], "Large")
        self.assertEqual(order.items.get().food_options[0]["price"], "50.00")
        self.meal.refresh_from_db()
        self.assertEqual(self.meal.stock, 8)

    def test_stale_total_rejected(self):
        self.assertEqual(self.checkout([self.large.pk], expected_total="260").status_code, 400)

    def test_owner_settings_and_private_access(self):
        endpoint = f"/api/v1/partner-offerings/{self.meal.pk}/food_options/"
        configs = self.client.get(endpoint).data
        configs[0]["options"][1]["active"] = False
        response = self.client.put(endpoint, configs, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.large.refresh_from_db()
        self.assertFalse(self.large.active)
        other = get_user_model().objects.create_user(username="stranger", email="stranger@example.invalid")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(endpoint).status_code, 404)
