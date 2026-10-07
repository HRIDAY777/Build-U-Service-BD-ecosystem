import tempfile
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission, Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Division, Offering, ServiceArea
from apps.engagement.models import Notification
from apps.automation.models import AutomationRule, OutboxEvent, KnowledgeDocument, AIUsage
from apps.automation.tasks import process_event
from .models import Order, Booking, Coupon, InventoryMovement, Payment


@override_settings(
    SECURE_SSL_REDIRECT=False, PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"]
)
class WorkflowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="customer", email="customer@example.invalid", password="Strong-test-pass-42"
        )
        self.other = get_user_model().objects.create_user(
            username="other", email="other@example.invalid", password="Strong-test-pass-42"
        )
        self.manager = get_user_model().objects.create_user(
            username="manager", email="manager@example.invalid", password="Strong-test-pass-42"
        )
        self.manager.user_permissions.add(
            *Permission.objects.filter(
                codename__in=[
                    "view_order",
                    "change_order",
                    "view_booking",
                    "change_booking",
                    "view_deliveryrequest",
                    "change_deliveryrequest",
                    "add_payment",
                    "change_prescription",
                ]
            )
        )
        self.shop = Division.objects.create(slug="shop", name="Shop", name_bn="শপ", kind="goods")
        self.services = Division.objects.create(
            slug="services", name="Services", name_bn="সেবা", kind="service"
        )
        self.pharmacy = Division.objects.create(
            slug="pharmacy", name="Pharmacy", name_bn="ফার্মেসি", kind="goods"
        )
        self.delivery = Division.objects.create(
            slug="delivery", name="Delivery", name_bn="ডেলিভারি", kind="delivery"
        )
        self.area = ServiceArea.objects.create(name="Dhanmondi", name_bn="ধানমন্ডি", delivery_fee="60")
        self.area.divisions.set([self.shop, self.services, self.pharmacy, self.delivery])
        self.item = Offering.objects.create(
            division=self.shop, name="Cotton bag", name_bn="ব্যাগ", slug="bag", sku="BAG", price="250", stock=5
        )
        self.service = Offering.objects.create(
            division=self.services,
            name="Cleaning",
            name_bn="পরিষ্কার",
            slug="cleaning",
            sku="CLEAN",
            price="800",
        )
        self.rx = Offering.objects.create(
            division=self.pharmacy,
            name="Prescription test",
            name_bn="ডেমো",
            slug="rx",
            sku="RX",
            price="100",
            stock=10,
            prescription_required=True,
        )
        self.address = {
            "recipient": "A Customer",
            "phone": "01712345678",
            "area": "Dhanmondi",
            "line": "Demo address",
        }
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def order(self, **kwargs):
        data = {"items": [{"offering": self.item.pk, "quantity": 2}], "address": self.address, **kwargs}
        return self.client.post("/api/v1/orders/", data, format="json", HTTP_IDEMPOTENCY_KEY="checkout-1")

    def test_checkout_ignores_client_price_and_reserves_stock(self):
        response = self.order(total="1", discount="999", payment_status="paid")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data["total"]), Decimal("560"))
        self.assertEqual(response.data["payment_status"], "unpaid")
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 3)
        self.assertEqual(InventoryMovement.objects.get().delta, -2)

    def test_repeated_checkout_is_idempotent(self):
        a = self.order()
        b = self.order()
        self.assertEqual(a.data["id"], b.data["id"])
        self.assertEqual(Order.objects.count(), 1)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 3)

    def test_idempotency_key_cannot_change_payload(self):
        self.order()
        self.assertEqual(self.order(notes="changed").status_code, 400)

    def test_stock_never_negative(self):
        response = self.order(items=[{"offering": self.item.pk, "quantity": 6}])
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 5)

    def test_duplicate_line_quantities_are_combined(self):
        response = self.order(
            items=[{"offering": self.item.pk, "quantity": 3}, {"offering": self.item.pk, "quantity": 3}]
        )
        self.assertEqual(response.status_code, 400)

    def test_mixed_division_rejected(self):
        self.assertEqual(
            self.order(
                items=[{"offering": self.item.pk, "quantity": 1}, {"offering": self.rx.pk, "quantity": 1}]
            ).status_code,
            400,
        )

    def test_unsupported_area_rejected(self):
        self.assertEqual(self.order(address={**self.address, "area": "Unknown"}).status_code, 400)

    def test_cross_customer_access_denied(self):
        order_id = self.order().data["id"]
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/v1/orders/{order_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/orders/{order_id}/invoice/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/orders/").data["count"], 0)

    def test_customer_cannot_accept_order(self):
        order_id = self.order().data["id"]
        response = self.client.post(f"/api/v1/orders/{order_id}/transition/", {"status": "accepted"})
        self.assertEqual(response.status_code, 403)

    def test_cancel_restores_stock_only_once(self):
        order_id = self.order().data["id"]
        self.assertEqual(
            self.client.post(f"/api/v1/orders/{order_id}/transition/", {"status": "cancelled"}).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(f"/api/v1/orders/{order_id}/transition/", {"status": "cancelled"}).status_code,
            400,
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 5)

    def test_coupon_usage_limit(self):
        coupon = Coupon.objects.create(
            code="WELCOME", amount=100, limit=1, expires_at=timezone.now() + timedelta(days=1)
        )
        response = self.order(coupon="welcome")
        self.assertEqual(Decimal(response.data["total"]), Decimal("460"))
        self.client.force_authenticate(self.other)
        self.assertEqual(self.order(coupon="WELCOME").status_code, 400)
        coupon.refresh_from_db()
        self.assertEqual(coupon.used, 1)

    def test_expired_coupon_rejected(self):
        Coupon.objects.create(code="OLD", amount=100, expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.order(coupon="OLD").status_code, 400)

    def test_prescription_cannot_skip_review(self):
        response = self.order(items=[{"offering": self.rx.pk, "quantity": 1}])
        self.assertEqual(response.data["status"], "prescription_pending")
        self.client.force_authenticate(self.manager)
        self.assertEqual(
            self.client.post(
                f"/api/v1/orders/{response.data['id']}/transition/", {"status": "accepted"}
            ).status_code,
            400,
        )

    def test_prescription_private_upload_and_review(self):
        with tempfile.TemporaryDirectory(dir=".") as media, override_settings(MEDIA_ROOT=media):
            order_id = self.order(items=[{"offering": self.rx.pk, "quantity": 1}]).data["id"]
            file = SimpleUploadedFile(
                "rx.pdf", b"%PDF-1.7\nDemo prescription", content_type="application/pdf"
            )
            response = self.client.post(
                f"/api/v1/orders/{order_id}/prescription/", {"document": file}, format="multipart"
            )
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(
                self.client.post(
                    f"/api/v1/orders/{order_id}/review-prescription/",
                    {"decision": "approved", "note": "Checked"},
                ).status_code,
                403,
            )
            self.client.force_authenticate(self.other)
            self.assertEqual(
                self.client.get(f"/api/v1/orders/{order_id}/prescription-file/").status_code, 404
            )
            self.client.force_authenticate(self.manager)
            self.assertEqual(
                self.client.post(
                    f"/api/v1/orders/{order_id}/review-prescription/",
                    {"decision": "approved", "note": "Checked"},
                ).status_code,
                200,
            )
            self.assertEqual(Order.objects.get(pk=order_id).status, "placed")

    def test_cod_requires_finance_and_delivery(self):
        order_id = self.order().data["id"]
        endpoint = f"/api/v1/orders/{order_id}/reconcile-cod/"
        self.assertEqual(self.client.post(endpoint, {"reference": "bank-1"}).status_code, 403)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(endpoint, {"reference": "bank-1"}).status_code, 400)
        Order.objects.filter(pk=order_id).update(status="delivered")
        self.assertEqual(self.client.post(endpoint, {"reference": "bank-1"}).status_code, 200)
        self.assertEqual(self.client.post(endpoint, {"reference": "bank-1"}).status_code, 200)
        self.assertEqual(Payment.objects.count(), 1)

    def test_refund_cannot_exceed_verified_amount(self):
        order_id = self.order().data["id"]
        endpoint = f"/api/v1/orders/{order_id}/refund/"
        self.assertEqual(self.client.post(endpoint, {"amount": "100", "reason": "Return"}).status_code, 400)
        Order.objects.filter(pk=order_id).update(status="delivered", payment_status="paid")
        self.assertEqual(self.client.post(endpoint, {"amount": "500", "reason": "Return"}).status_code, 201)
        self.assertEqual(self.client.post(endpoint, {"amount": "100", "reason": "Return"}).status_code, 400)

    def test_booking_authoritative_price_and_future_date(self):
        data = {
            "offering": self.service.pk,
            "scheduled_at": (timezone.now() + timedelta(days=1)).isoformat(),
            "address": self.address,
            "price": "1",
        }
        response = self.client.post(
            "/api/v1/bookings/", data, format="json", HTTP_IDEMPOTENCY_KEY="booking-1"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data["price"]), Decimal("800"))
        data["scheduled_at"] = (timezone.now() - timedelta(days=1)).isoformat()
        self.assertEqual(
            self.client.post(
                "/api/v1/bookings/", data, format="json", HTTP_IDEMPOTENCY_KEY="booking-2"
            ).status_code,
            400,
        )

    def test_delivery_fee_server_calculated(self):
        response = self.client.post(
            "/api/v1/deliveries/",
            {
                "pickup": self.address,
                "dropoff": self.address,
                "weight_kg": "2",
                "description": "Books",
                "fee": "1",
                "rider": self.other.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data["fee"]), Decimal("80"))
        self.assertIsNone(response.data["rider"])

    def test_unassigned_worker_cannot_see_jobs(self):
        self.other.groups.add(Group.objects.create(name="Provider"))
        booking = Booking.objects.create(
            customer=self.user,
            offering=self.service,
            scheduled_at=timezone.now() + timedelta(days=1),
            address=self.address,
            price=800,
            idempotency_key="b",
            request_hash="x",
        )
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/v1/bookings/{booking.id}/").status_code, 404)

    def test_outbox_replay_does_not_duplicate_notification(self):
        AutomationRule.objects.create(
            name="Order confirmation", trigger="order.created", action="notify", template="Order saved"
        )
        self.order()
        event = OutboxEvent.objects.get(topic="order.created")
        process_event(event.id)
        process_event(event.id)
        self.assertEqual(Notification.objects.count(), 1)

    def test_ai_missing_credentials_fails_closed(self):
        with patch.dict("os.environ", {"AI_CHAT_ENDPOINT": "", "AI_API_KEY": "", "AI_MODEL": ""}):
            self.assertEqual(
                self.client.post("/api/v1/assistant/", {"message": "Where is my order?"}).status_code, 503
            )

    def test_ai_never_sends_private_knowledge(self):
        KnowledgeDocument.objects.create(
            title="Secret policy", text="PRIVATE-NOT-FOR-CUSTOMERS", approved=True, public=False
        )
        KnowledgeDocument.objects.create(
            title="Order help", text="View order history in your account.", approved=True, public=True
        )
        with (
            patch.dict(
                "os.environ",
                {
                    "AI_CHAT_ENDPOINT": "https://ai.example.invalid/chat",
                    "AI_API_KEY": "test",
                    "AI_MODEL": "model",
                },
            ),
            patch("apps.automation.api.requests.post") as post,
        ):
            post.return_value.json.return_value = {
                "choices": [{"message": {"content": "See your account."}}],
                "usage": {"total_tokens": 45},
            }
            response = self.client.post("/api/v1/assistant/", {"message": "Order help"})
            self.assertEqual(response.status_code, 200)
            self.assertNotIn("PRIVATE-NOT-FOR-CUSTOMERS", str(post.call_args))
            self.assertEqual(AIUsage.objects.get().tokens, 45)

    def test_anonymous_checkout_denied(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.order().status_code, 403)

    def test_login_requires_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(
            client.post(
                "/api/v1/auth/login/", {"username": "customer", "password": "Strong-test-pass-42"}
            ).status_code,
            403,
        )

    def test_registration_cannot_set_admin_role(self):
        self.client.force_authenticate(None)
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "username": "newuser",
                "email": "new@example.invalid",
                "password": "Strong-another-pass-82",
                "is_staff": True,
                "is_superuser": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        user = get_user_model().objects.get(username="newuser")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_analytics_restricted(self):
        self.assertEqual(self.client.get("/api/v1/analytics/").status_code, 403)
