"""Real PostgreSQL stock and checkout retry regressions."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.automation.models import OutboxEvent
from apps.catalog.models import Division, Offering, ProductVariant, ServiceArea

from .models import AuditLog, Coupon, InventoryMovement, Order


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locks")
class CheckoutConcurrencyTests(TransactionTestCase):
    def setUp(self):
        users = get_user_model()
        self.first = users.objects.create_user(username="stock-first", email="stock-first@example.invalid")
        self.second = users.objects.create_user(username="stock-second", email="stock-second@example.invalid")
        self.division = Division.objects.create(slug="stock-shop", name="Shop", kind="goods")
        area = ServiceArea.objects.create(name="Stock area", delivery_fee=60)
        area.divisions.add(self.division)
        self.product = Offering.objects.create(division=self.division, name="Bag", slug="stock-bag", sku="STOCK-BAG", price=100, stock=1)
        self.address = {"recipient": "Customer", "phone": "01712345678", "area": "Stock area", "line": "Test road"}

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

    def checkout(self, user, key="stock-order", variant=None, coupon=None, product=None):
        client = APIClient()
        client.force_authenticate(user)
        line = {"offering": (product or self.product).pk, "quantity": 1}
        if variant:
            line["variant"] = variant.pk
        data = {"items": [line], "address": self.address}
        if coupon:
            data["coupon"] = coupon.code
        response = client.post("/api/v1/orders/", data, format="json", HTTP_IDEMPOTENCY_KEY=key)
        return response.status_code, response.data

    def assert_one_order_effects(self):
        self.assertEqual(Order.objects.count(), 1)
        movement = InventoryMovement.objects.get()
        self.assertEqual(movement.delta, -1)
        self.assertEqual(movement.reason, "order_reserved")
        self.assertEqual(AuditLog.objects.filter(action="order.created").count(), 1)
        self.assertEqual(OutboxEvent.objects.filter(topic="order.created").count(), 1)

    def test_two_customers_cannot_buy_the_last_item(self):
        results = self.race([lambda: self.checkout(self.first), lambda: self.checkout(self.second)])
        self.assertEqual(sorted(status for status, _ in results), [201, 400])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assert_one_order_effects()

    def test_same_retry_reserves_stock_once(self):
        results = self.race([lambda: self.checkout(self.first), lambda: self.checkout(self.first)])
        self.assertEqual([status for status, _ in results], [201, 201])
        self.assertEqual(results[0][1]["id"], results[1][1]["id"])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assert_one_order_effects()

    def test_last_variant_stock_is_not_oversold(self):
        variant = ProductVariant.objects.create(offering=self.product, label="Blue", sku="STOCK-BLUE", price=120, stock=1)
        results = self.race([lambda: self.checkout(self.first, variant=variant), lambda: self.checkout(self.second, variant=variant)])
        self.assertEqual(sorted(status for status, _ in results), [201, 400])
        variant.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(variant.stock, 0)
        self.assertEqual(self.product.stock, 1)
        self.assert_one_order_effects()
        self.assertEqual(InventoryMovement.objects.get().variant_id, variant.pk)

    def test_last_coupon_use_is_not_spent_twice(self):
        other_product = Offering.objects.create(division=self.division, name="Other bag", slug="stock-other", sku="STOCK-OTHER", price=100, stock=1)
        coupon = Coupon.objects.create(code="LAST-USE", amount=10, limit=1, expires_at=timezone.now() + timedelta(days=1))
        # Separate product locks ensure this exercises the shared coupon lock.
        results = self.race([lambda: self.checkout(self.first, coupon=coupon), lambda: self.checkout(self.second, coupon=coupon, product=other_product)])
        self.assertEqual(sorted(status for status, _ in results), [201, 400])
        coupon.refresh_from_db()
        self.product.refresh_from_db()
        other_product.refresh_from_db()
        self.assertEqual(coupon.used, 1)
        self.assertEqual(self.product.stock + other_product.stock, 1)
        self.assert_one_order_effects()
