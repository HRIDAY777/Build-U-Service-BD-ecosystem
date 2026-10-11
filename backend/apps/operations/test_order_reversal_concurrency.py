"""PostgreSQL cancellation stock and refund reservation regressions."""
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Division, Offering, ProductVariant, ServiceArea

from .models import InventoryMovement, Order, Payment, Refund
from .services import transition


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locks")
class OrderReversalConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.customer = get_user_model().objects.create_user(username="reversal-customer", email="reversal@example.invalid")
        division = Division.objects.create(slug="reversal-shop", name="Shop", kind="goods")
        area = ServiceArea.objects.create(name="Reversal area", delivery_fee=0)
        area.divisions.add(division)
        self.product = Offering.objects.create(division=division, name="Bag", slug="reversal-bag", sku="REVERSAL-BAG", price=100, stock=2)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def order(self, variant=None, key="reversal-order"):
        item = {"offering": self.product.pk, "quantity": 1}
        if variant:
            item["variant"] = variant.pk
        response = self.client.post("/api/v1/orders/", {"items": [item], "address": {"recipient": "Customer", "phone": "01712345678", "area": "Reversal area", "line": "Test road"}}, format="json", HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual(response.status_code, 201, response.data)
        return Order.objects.get(pk=response.data["id"])

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

    def post(self, order, action, data):
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.post(f"/api/v1/orders/{order.pk}/{action}/", data, format="json")
        return response.status_code

    def cancel(self, order):
        return self.post(order, "transition", {"status": "cancelled"})

    def paid_order(self):
        order = self.order()
        order.payment_status = "paid"
        order.save(update_fields=["payment_status"])
        Payment.objects.create(order=order, reference="TEST-VERIFIED", provider="cod", amount=order.total, status="verified", verified_at=timezone.now())
        return order

    def test_concurrent_cancel_restores_base_stock_once(self):
        order = self.order()
        self.assertEqual(sorted(self.race([lambda: self.cancel(order), lambda: self.cancel(order)])), [200, 400])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)
        self.assertEqual(InventoryMovement.objects.filter(order=order, reason="cancelled").count(), 1)

    def test_concurrent_cancel_restores_variant_not_base_stock(self):
        variant = ProductVariant.objects.create(offering=self.product, label="Blue", sku="REVERSAL-BLUE", price=100, stock=2)
        order = self.order(variant)
        self.assertEqual(sorted(self.race([lambda: self.cancel(order), lambda: self.cancel(order)])), [200, 400])
        variant.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(variant.stock, 2)
        self.assertEqual(self.product.stock, 2)
        movement = InventoryMovement.objects.get(order=order, reason="cancelled")
        self.assertEqual(movement.variant_id, variant.pk)
        self.assertEqual(movement.delta, 1)

    def test_concurrent_full_refunds_reserve_paid_amount_once(self):
        order = self.paid_order()
        def request():
            return self.post(order, "refund", {"amount": str(order.total), "reason": "Test refund"})
        self.assertEqual(sorted(self.race([request, request])), [201, 400])
        self.assertEqual(Refund.objects.get(order=order).amount, order.total)
        # Requests only reserve refund records; no gateway payout is executed.
        self.assertEqual(Refund.objects.get().status, "requested")
        self.assertEqual(Payment.objects.get().status, "verified")

    def test_rejection_and_return_restore_variant_once(self):
        reviewer = get_user_model().objects.create_user(username="reversal-reviewer", email="reversal-reviewer@example.invalid", is_superuser=True)
        variant = ProductVariant.objects.create(offering=self.product, label="Blue", sku="REVERSAL-BLUE", price=100, stock=2)
        for previous, target in [("placed", "rejected"), ("failed", "returned")]:
            with self.subTest(target=target):
                order = self.order(variant, key=target)
                order.status = previous
                order.save(update_fields=["status"])
                transition(reviewer, Order, order.pk, target)
                with self.assertRaises(ValidationError):
                    transition(reviewer, Order, order.pk, target)
                variant.refresh_from_db()
                self.product.refresh_from_db()
                self.assertEqual(variant.stock, 2)
                self.assertEqual(self.product.stock, 2)
                movement = InventoryMovement.objects.get(order=order, reason=target)
                self.assertEqual(movement.variant_id, variant.pk)
                self.assertEqual(movement.delta, 1)

    def test_concurrent_partial_refunds_cannot_exceed_paid_amount(self):
        order = self.paid_order()
        def request():
            return self.post(order, "refund", {"amount": "60.00", "reason": "Partial test refund"})
        self.assertEqual(sorted(self.race([request, request])), [201, 400])
        self.assertEqual(Refund.objects.get(order=order).amount, Decimal("60.00"))
