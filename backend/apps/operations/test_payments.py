from unittest.mock import patch
from django.test import override_settings, TestCase
from rest_framework.exceptions import ValidationError
from . import tests as fixtures
from .models import AuditLog, Order, Payment, PaymentGateway
from .payments import PAYMENT_GATEWAY_CODES, verify_payment
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

    def test_bangladesh_payment_gateways_activate_deactivate_and_trx_verification(self):
        response = self.client.get("/api/v1/payment-methods/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("cod", response.data["methods"])
        self.assertIn("bkash", response.data["methods"])
        self.assertIn("nagad", response.data["methods"])
        self.assertIn("rocket", response.data["methods"])
        self.assertNotIn("aamarpay", response.data["methods"])
        self.assertEqual(PaymentGateway.objects.count(), len(PAYMENT_GATEWAY_CODES))

        # Non-staff cannot manage gateways
        self.assertEqual(self.client.get("/api/v1/payment-gateways/").status_code, 403)
        self.assertEqual(
            self.client.patch("/api/v1/payment-gateways/bkash/", {"active": False}, format="json").status_code,
            403,
        )

        # Staff/Manager can list and activate/deactivate any gateway with checkbox toggle
        self.client.force_authenticate(self.manager)
        all_resp = self.client.get("/api/v1/payment-gateways/")
        self.assertEqual(all_resp.status_code, 200)
        self.assertEqual(len(all_resp.data["results"]), 11)

        # Deactivate nagad and activate aamarpay
        deact = self.client.patch("/api/v1/payment-gateways/nagad/", {"active": False}, format="json")
        self.assertEqual(deact.status_code, 200)
        self.assertFalse(deact.data["active"])

        act_aamar = self.client.patch(
            "/api/v1/payment-gateways/aamarpay/",
            {"active": True, "account_number": "01700000000"},
            format="json",
        )
        self.assertEqual(act_aamar.status_code, 200)
        self.assertTrue(act_aamar.data["active"])
        self.assertEqual(act_aamar.data["account_number"], "01700000000")
        self.assertTrue(
            AuditLog.objects.filter(action="payment_gateway.updated", entity="aamarpay").exists()
        )

        # Public methods reflect the updated active toggles
        methods_resp = self.client.get("/api/v1/payment-methods/")
        self.assertNotIn("nagad", methods_resp.data["methods"])
        self.assertIn("aamarpay", methods_resp.data["methods"])

        # Customer cannot checkout with deactivated gateway (nagad), but can checkout with active bkash
        self.client.force_authenticate(self.user)
        rejected = self.client.post(
            "/api/v1/orders/",
            {
                "items": [{"offering": self.item.pk, "quantity": 1}],
                "address": self.address,
                "payment_method": "nagad",
            },
            HTTP_IDEMPOTENCY_KEY="nagad-deactivated-key",
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)

        placed = self.client.post(
            "/api/v1/orders/",
            {
                "items": [{"offering": self.item.pk, "quantity": 1}],
                "address": self.address,
                "payment_method": "bkash",
            },
            HTTP_IDEMPOTENCY_KEY="bkash-active-key",
            format="json",
        )
        self.assertEqual(placed.status_code, 201, placed.data)
        order_id = placed.data["id"]

        # Customer submits bKash TrxID
        trx_resp = self.client.post(
            f"/api/v1/payments/{order_id}/submit-trx/",
            {"trx_id": "BKASH987654321", "sender_phone": "01712345678"},
            format="json",
        )
        self.assertEqual(trx_resp.status_code, 200, trx_resp.data)
        self.assertEqual(trx_resp.data["payment_status"], "review_required")
        self.assertEqual(trx_resp.data["trx_id"], "BKASH987654321")

        # Manager verifies the bKash TrxID
        self.client.force_authenticate(self.manager)
        verify_resp = self.client.post(
            f"/api/v1/payments/{order_id}/verify-trx/",
            {"decision": "verified"},
            format="json",
        )
        self.assertEqual(verify_resp.status_code, 200, verify_resp.data)
        self.assertEqual(verify_resp.data["payment_status"], "paid")
        order = Order.objects.get(pk=order_id)
        self.assertEqual(order.payment_status, "paid")
