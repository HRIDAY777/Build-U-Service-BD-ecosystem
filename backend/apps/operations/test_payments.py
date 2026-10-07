from unittest.mock import patch
from django.test import override_settings, TestCase
from rest_framework.exceptions import ValidationError
from . import tests as fixtures
from .models import Order, Payment
from .payments import verify_payment
from apps.automation.models import OutboxEvent


@override_settings(SECURE_SSL_REDIRECT=False)
class PaymentVerificationTests(TestCase):
    setUp = fixtures.WorkflowTests.setUp
    order = fixtures.WorkflowTests.order

    # Reuse fixtures while keeping these tests focused on gateway boundary validation.
    def gateway_record(self, **overrides):
        order = Order.objects.get(pk=self.order().data["id"])
        order.payment_method = "sslcommerz"
        order.save()
        payment = Payment.objects.create(
            order=order, provider="sslcommerz", reference="US-test-1", amount=order.total
        )
        return (
            order,
            payment,
            {
                "status": "VALID",
                "amount": str(order.total),
                "currency": "BDT",
                "tran_id": payment.reference,
                "val_id": "validation-1",
                "risk_level": "0",
                **overrides,
            },
        )

    def verify(self, data):
        with (
            patch.dict(
                "os.environ",
                {
                    "SSLCOMMERZ_STORE_ID": "demo",
                    "SSLCOMMERZ_STORE_PASSWORD": "demo",
                    "PAYMENT_PUBLIC_URL": "https://example.invalid",
                },
            ),
            patch("apps.operations.payments.requests.get") as get,
        ):
            get.return_value.json.return_value = data
            verify_payment("validation-1")

    def test_gateway_replay_records_one_paid_event(self):
        order, payment, data = self.gateway_record()
        self.verify(data)
        self.verify(data)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "paid")
        self.assertEqual(OutboxEvent.objects.filter(topic="order.paid").count(), 1)

    def test_gateway_amount_mismatch_rejected(self):
        order, payment, data = self.gateway_record(amount="1.00")
        with self.assertRaises(ValidationError):
            self.verify(data)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "unpaid")

    def test_gateway_risk_held_for_manual_review(self):
        order, payment, data = self.gateway_record(risk_level="1")
        self.verify(data)
        payment.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(payment.status, "review_required")
        self.assertEqual(order.payment_status, "unpaid")

    def test_gateway_currency_mismatch_rejected(self):
        order, payment, data = self.gateway_record(currency="USD")
        with self.assertRaises(ValidationError):
            self.verify(data)

    def test_quote_does_not_reserve_inventory(self):
        response = self.client.post(
            "/api/v1/orders/quote/",
            {"items": [{"offering": self.item.pk, "quantity": 2}], "address": self.address},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["total"], "560.00")
        self.assertFalse(Order.objects.exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 5)

    def test_changed_quote_cannot_place_order(self):
        self.assertEqual(self.order(expected_total="1.00").status_code, 400)
        self.assertFalse(Order.objects.exists())
