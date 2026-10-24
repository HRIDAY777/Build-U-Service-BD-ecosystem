import tempfile
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission, Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import Sum
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Category, Division, Offering, ProductVariant, Organization, ServiceArea
from apps.engagement.admin import LoyaltyRedemptionAdmin
from apps.engagement.models import Notification, LoyaltyEntry, LoyaltyReward, LoyaltyRedemption
from apps.automation.models import AutomationRule, OutboxEvent, KnowledgeDocument, AIUsage
from apps.automation.tasks import process_event
from .models import Order, Booking, Coupon, InventoryMovement, Payment, EventRequest, AuditLog, ReturnRequest


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
                    "view_eventrequest",
                    "change_eventrequest",
                ]
            )
        )
        self.manager.is_staff = True
        self.manager.save(update_fields=["is_staff"])
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

    def test_checkout_uses_sale_price_without_exposing_cost_price(self):
        self.item.sale_price = "200"
        self.item.cost_price = "100"
        self.item.save(update_fields=["sale_price", "cost_price", "updated_at"])

        catalog_item = self.client.get(f"/api/v1/offerings/{self.item.pk}/")
        self.assertEqual(Decimal(catalog_item.data["current_price"]), Decimal("200"))
        self.assertNotIn("cost_price", catalog_item.data)

        response = self.order()

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data["subtotal"]), Decimal("400"))
        self.assertEqual(Decimal(response.data["items"][0]["unit_price"]), Decimal("200"))

    def test_checkout_uses_variant_price_and_reserves_variant_stock(self):
        variant = ProductVariant.objects.create(
            offering=self.item,
            label="Large / Red",
            attributes={"size": "Large", "color": "Red"},
            sku="BAG-L-RED",
            price="300",
            sale_price="250",
            cost_price="120",
            stock=4,
        )
        catalog_item = self.client.get(f"/api/v1/offerings/{self.item.pk}/")
        self.assertEqual(catalog_item.status_code, 200)
        self.assertEqual(catalog_item.data["variants"][0]["sku"], "BAG-L-RED")
        self.assertEqual(catalog_item.data["stock"], 4)
        self.assertNotIn("cost_price", catalog_item.data["variants"][0])
        self.assertIn(
            self.item.pk,
            [item["id"] for item in self.client.get("/api/v1/offerings/?in_stock=true").data["results"]],
        )

        response = self.order(items=[{"offering": self.item.pk, "variant": variant.pk, "quantity": 2}])

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data["subtotal"]), Decimal("500"))
        self.assertEqual(response.data["items"][0]["variant"], variant.pk)
        variant.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(variant.stock, 2)
        self.assertEqual(self.item.stock, 5)
        self.assertEqual(InventoryMovement.objects.get().variant_id, variant.pk)
        variant.stock = 0
        variant.save(update_fields=["stock"])
        in_stock_ids = [
            item["id"] for item in self.client.get("/api/v1/offerings/?in_stock=true").data["results"]
        ]
        self.assertNotIn(self.item.pk, in_stock_ids)

    def test_checkout_requires_a_variant_when_offering_has_variants(self):
        ProductVariant.objects.create(
            offering=self.item,
            label="Large",
            attributes={"size": "Large"},
            sku="BAG-L",
            price="300",
            stock=4,
        )

        response = self.order()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

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
            HTTP_IDEMPOTENCY_KEY="delivery-fee-test",
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

    def test_password_change_keeps_session_and_rejects_old_password(self):
        response = self.client.post(
            "/api/v1/auth/password/",
            {"old_password": "Strong-test-pass-42", "new_password": "New-strong-test-pass-83"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)
        self.client.post("/api/v1/auth/logout/", {}, format="json")
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/login/",
                {"username": "customer", "password": "Strong-test-pass-42"},
                format="json",
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/login/",
                {"username": "customer", "password": "New-strong-test-pass-83"},
                format="json",
            ).status_code,
            200,
        )

    def test_password_change_requires_current_password(self):
        response = self.client.post(
            "/api/v1/auth/password/",
            {"old_password": "wrong", "new_password": "New-strong-test-pass-83"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_password_reset_request_is_non_enumerating_and_confirm_is_single_use(self):
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            response = self.client.post(
                "/api/v1/auth/password-reset/", {"email": "customer@example.invalid"}, format="json"
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn("If an active account matches", response.data["message"])
            from django.core import mail

            self.assertEqual(len(mail.outbox), 1)
            import re

            match = re.search(r"uid=([^&]+)&token=([^\s]+)", mail.outbox[0].body)
            self.assertIsNotNone(match)
            payload = {
                "uid": match.group(1),
                "token": match.group(2),
                "new_password": "Reset-strong-password-93",
            }
            self.assertEqual(
                self.client.post("/api/v1/auth/password-reset/confirm/", payload, format="json").status_code,
                200,
            )
            self.assertEqual(
                self.client.post("/api/v1/auth/password-reset/confirm/", payload, format="json").status_code,
                400,
            )

    def test_password_reset_unknown_email_has_same_response(self):
        from django.core.cache import cache

        cache.clear()
        response = self.client.post(
            "/api/v1/auth/password-reset/", {"email": "unknown@example.invalid"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["sent"], True)

    def test_email_verification_is_single_use(self):
        self.user.email_verified = False
        self.user.save(update_fields=["email_verified"])
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            response = self.client.post("/api/v1/auth/email-verification/", {}, format="json")
            self.assertEqual(response.status_code, 200)
            from django.core import mail
            import re

            match = re.search(r"uid=([^&]+)&token=([^\s]+)", mail.outbox[0].body)
            payload = {"uid": match.group(1), "token": match.group(2)}
            self.assertEqual(
                self.client.post(
                    "/api/v1/auth/email-verification/confirm/", payload, format="json"
                ).status_code,
                200,
            )
            self.assertEqual(
                self.client.post(
                    "/api/v1/auth/email-verification/confirm/", payload, format="json"
                ).status_code,
                400,
            )

    def test_saved_addresses_are_private_to_the_owner(self):
        response = self.client.post(
            "/api/v1/addresses/",
            {
                "label": "Home",
                "recipient": "A Customer",
                "phone": "01712345678",
                "district": "Dhaka",
                "area": "Dhanmondi",
                "line": "Road 1, House 2",
                "postal_code": "1209",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        address_id = response.data["id"]
        self.assertEqual(self.client.get("/api/v1/addresses/").data["results"][0]["id"], address_id)

        other_client = APIClient()
        other_client.force_authenticate(self.other)
        self.assertEqual(other_client.get("/api/v1/addresses/").data["results"], [])
        self.assertEqual(other_client.delete(f"/api/v1/addresses/{address_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/addresses/{address_id}/").status_code, 200)

    def test_saved_address_rejects_invalid_phone(self):
        response = self.client.post(
            "/api/v1/addresses/",
            {
                "label": "Invalid",
                "recipient": "A Customer",
                "phone": "not-a-phone",
                "district": "Dhaka",
                "area": "Dhanmondi",
                "line": "Road 1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data["error"])

    def test_customer_can_request_wedding_event(self):
        response = self.client.post(
            "/api/v1/events/",
            {
                "event_type": "wedding",
                "title": "Demo wedding",
                "event_date": "2027-02-14",
                "guest_count": 180,
                "venue": "Dhanmondi Community Centre",
                "area": "Dhanmondi",
                "budget": "250000",
                "services": ["Catering", "Decoration"],
                "notes": "Demo planning request",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "requested")
        self.assertEqual(self.client.get("/api/v1/events/").data["count"], 1)
        history_url = f"/api/v1/events/{response.data['id']}/history/"
        history = self.client.get(history_url)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data[0]["action"], "event.requested")
        other_client = APIClient()
        other_client.force_authenticate(self.other)
        self.assertEqual(other_client.get(history_url).status_code, 404)
        self.assertTrue(Notification.objects.filter(user=self.user, title="Event request received").exists())

    def test_customer_can_manage_wishlist(self):
        response = self.client.post("/api/v1/wishlist/", {"offering": self.item.pk}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["offering_detail"]["id"], self.item.pk)
        duplicate = self.client.post("/api/v1/wishlist/", {"offering": self.item.pk}, format="json")
        self.assertEqual(duplicate.status_code, 400)
        item_id = response.data["id"]
        other_client = APIClient()
        other_client.force_authenticate(self.other)
        self.assertEqual(other_client.get("/api/v1/wishlist/").data["count"], 0)
        self.assertEqual(other_client.get(f"/api/v1/wishlist/{item_id}/").status_code, 404)
        self.assertEqual(other_client.delete(f"/api/v1/wishlist/{item_id}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/v1/wishlist/{item_id}/").status_code, 204)

    def test_return_request_ownership_and_review_workflow(self):
        order_id = self.order().data["id"]
        payload = {"order": order_id, "reason": "Damaged item"}
        self.assertEqual(self.client.post("/api/v1/returns/", payload, format="json").status_code, 400)
        Order.objects.filter(pk=order_id).update(status="delivered")
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.post("/api/v1/returns/", payload, format="json").status_code, 403)
        result = self.client.post("/api/v1/returns/", payload, format="json")
        self.assertEqual(result.status_code, 201, result.data)
        url = f"/api/v1/returns/{result.data['id']}/transition/"
        self.assertEqual(self.client.post(url, {"status": "approved"}, format="json").status_code, 403)
        self.assertEqual(other.get(f"/api/v1/returns/{result.data['id']}/").status_code, 404)
        self.assertEqual(self.client.post("/api/v1/returns/", payload, format="json").status_code, 400)
        self.manager.user_permissions.add(
            *Permission.objects.filter(codename__in=["view_returnrequest", "change_returnrequest"])
        )
        staff = APIClient()
        staff.force_authenticate(self.manager)
        self.assertEqual(staff.post(url, {"status": "closed"}, format="json").status_code, 400)
        for status in ["approved", "received", "closed"]:
            response = staff.post(url, {"status": status, "review_note": "Reviewed"}, format="json")
            self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(staff.post(url, {"status": "approved"}, format="json").status_code, 400)

    def test_eligible_return_orders_are_paginated_private_and_exclude_requested(self):
        orders = [
            Order.objects.create(
                customer=self.user,
                division=self.shop,
                status="delivered",
                address=self.address,
                subtotal=250,
                delivery_fee=60,
                total=310,
                idempotency_key=f"eligible-{index}",
            )
            for index in range(26)
        ]
        ReturnRequest.objects.create(order=orders[0], reason="Damaged")
        orders[1].status = "placed"
        orders[1].save()
        orders[2].division = self.pharmacy
        orders[2].save()
        orders[3].customer = self.other
        orders[3].save()
        response = self.client.get("/api/v1/returns/eligible_orders/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 22)
        ids = {row["id"] for row in response.data["results"]}
        self.assertTrue(all(str(order.pk) not in ids for order in orders[:4]))
        Order.objects.filter(pk__in=[order.pk for order in orders[1:4]]).update(
            status="delivered", division=self.shop, customer=self.user
        )
        response = self.client.get("/api/v1/returns/eligible_orders/")
        self.assertEqual(response.data["count"], 25)
        self.assertIsNotNone(response.data["next"])
        second = self.client.get("/api/v1/returns/eligible_orders/?page=2")
        self.assertEqual(len(second.data["results"]), 1)
        self.assertNotIn(second.data["results"][0]["id"], {row["id"] for row in response.data["results"]})

    def test_event_request_rejects_past_date_and_negative_budget(self):
        response = self.client.post(
            "/api/v1/events/",
            {
                "event_type": "wedding",
                "title": "Invalid event",
                "event_date": "2020-01-01",
                "guest_count": 10,
                "venue": "Dhaka",
                "area": "Dhanmondi",
                "budget": "-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("event_date", response.data["error"])

    def test_authorized_staff_can_review_event_request(self):
        response = self.client.post(
            "/api/v1/events/",
            {
                "event_type": "wedding",
                "title": "Staff review demo",
                "event_date": "2027-03-20",
                "guest_count": 80,
                "venue": "Gulshan venue",
                "area": "Gulshan",
                "services": ["Decoration"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        event_id = response.data["id"]
        staff_client = APIClient()
        staff_client.force_authenticate(self.manager)
        self.assertEqual(
            staff_client.post(
                f"/api/v1/events/{event_id}/transition/", {"status": "reviewing"}, format="json"
            ).status_code,
            200,
        )
        quote = staff_client.post(
            f"/api/v1/events/{event_id}/quote/",
            {"quoted_budget": "275000", "staff_notes": "Includes setup and coordination."},
            format="json",
        )
        self.assertEqual(quote.status_code, 200, quote.data)
        self.assertEqual(quote.data["status"], "quoted")
        self.assertEqual(quote.data["quoted_budget"], "275000.00")
        self.assertEqual(
            staff_client.post(f"/api/v1/events/{event_id}/accept_quote/", {}, format="json").status_code, 403
        )
        self.assertEqual(
            staff_client.patch(
                f"/api/v1/events/{event_id}/", {"title": "Staff overwrite"}, format="json"
            ).status_code,
            403,
        )
        self.assertEqual(
            staff_client.post(
                f"/api/v1/events/{event_id}/transition/", {"status": "confirmed"}, format="json"
            ).status_code,
            400,
        )
        accepted = self.client.post(f"/api/v1/events/{event_id}/accept_quote/", {}, format="json")
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.data["status"], "confirmed")
        self.assertEqual(
            staff_client.post(
                f"/api/v1/events/{event_id}/quote/", {"quoted_budget": "1"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/events/{event_id}/", {"title": "Changed after confirmation"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            staff_client.post(
                f"/api/v1/events/{event_id}/transition/", {"status": "completed"}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(f"/api/v1/events/{event_id}/cancel/", {}, format="json").status_code, 400
        )

    def test_logout_all_invalidates_authenticated_session(self):
        response = self.client.post("/api/v1/auth/logout-all/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(None)
        self.assertIsNone(self.client.get("/api/v1/auth/me/").data)

    def test_event_acceptance_rolls_back_when_notification_fails(self):
        event = EventRequest.objects.create(
            customer=self.user,
            title="Rollback demo",
            event_date=timezone.localdate() + timedelta(days=30),
            guest_count=100,
            venue="Dhaka venue",
            area="Dhaka",
            status="quoted",
            quoted_budget=Decimal("250000"),
        )
        with patch(
            "apps.operations.api.Notification.objects.create",
            side_effect=RuntimeError("Notification failure"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(f"/api/v1/events/{event.pk}/accept_quote/", {}, format="json")
        event.refresh_from_db()
        self.assertEqual(event.status, "quoted")
        self.assertFalse(
            AuditLog.objects.filter(entity=str(event.pk), action="event.quote_accepted").exists()
        )
        response = self.client.post(f"/api/v1/events/{event.pk}/accept_quote/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "confirmed")

    def test_account_deletion_request_is_idempotent(self):
        first = self.client.post(
            "/api/v1/auth/delete-request/", {"reason": "Please remove my account."}, format="json"
        )
        self.assertEqual(first.status_code, 201)
        second = self.client.post("/api/v1/auth/delete-request/", {}, format="json")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["status"], "requested")

    def test_customer_can_mark_all_notifications_read(self):
        Notification.objects.create(user=self.user, title="One", body="First")
        Notification.objects.create(user=self.user, title="Two", body="Second")
        response = self.client.post("/api/v1/notifications/mark_all_read/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated"], 2)
        self.assertFalse(Notification.objects.filter(user=self.user, read=False).exists())

    def test_notification_read_changes_are_private_and_reversible(self):
        own = Notification.objects.create(user=self.user, title="Own", body="Private")
        other = Notification.objects.create(user=self.other, title="Other", body="Private")
        for read in (True, False):
            response = self.client.patch(f"/api/v1/notifications/{own.pk}/", {"read": read}, format="json")
            self.assertEqual(response.status_code, 200)
            own.refresh_from_db()
            self.assertEqual(own.read, read)
        self.assertEqual(self.client.patch(f"/api/v1/notifications/{other.pk}/", {"read": True}, format="json").status_code, 404)
        self.client.post("/api/v1/notifications/mark_all_read/", {}, format="json")
        other.refresh_from_db()
        self.assertFalse(other.read)

    def test_loyalty_statement_is_private_and_read_only(self):
        entry = LoyaltyEntry.objects.create(customer=self.user, points=50, reference="loyalty-demo-1")
        LoyaltyEntry.objects.create(customer=self.user, points=-10, reference="loyalty-demo-2")
        LoyaltyEntry.objects.create(customer=self.other, points=900, reference="loyalty-other")
        self.assertEqual(self.client.get("/api/v1/loyalty/balance/").data["points"], 40)
        self.assertEqual(self.client.get("/api/v1/loyalty/").data["count"], 2)
        self.assertEqual(
            self.client.post("/api/v1/loyalty/", {"points": 999}, format="json").status_code, 405
        )
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.get(f"/api/v1/loyalty/{entry.pk}/").status_code, 404)

    def test_customer_can_redeem_an_active_reward_and_balance_is_debited(self):
        LoyaltyEntry.objects.create(customer=self.user, points=80, reference="loyalty-redeem-credit")
        reward = LoyaltyReward.objects.create(name="Delivery voucher", points_cost=50)

        response = self.client.post("/api/v1/loyalty/redeem/", {"reward_id": reward.pk}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["points_spent"], 50)
        self.assertEqual(response.data["balance"], 30)
        self.assertEqual(LoyaltyRedemption.objects.filter(customer=self.user).count(), 1)
        self.assertEqual(LoyaltyEntry.objects.filter(customer=self.user).aggregate(total=Sum("points"))["total"], 30)

        redemption = LoyaltyRedemption.objects.get(customer=self.user)
        history = self.client.get("/api/v1/loyalty/redemptions/")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data[0]["reward"], reward.name)
        self.assertIsNone(history.data[0]["fulfilled_at"])
        other_client = APIClient()
        other_client.force_authenticate(self.other)
        self.assertEqual(other_client.get("/api/v1/loyalty/redemptions/").data, [])

        self.manager.user_permissions.add(Permission.objects.get(codename="change_loyaltyredemption"))
        redemption_admin = LoyaltyRedemptionAdmin(LoyaltyRedemption, AdminSite())
        request = RequestFactory().post("/admin/engagement/loyaltyredemption/")
        request.user = self.manager
        self.assertTrue(redemption_admin.has_change_permission(request))
        with patch.object(redemption_admin, "message_user"):
            redemption_admin.mark_fulfilled(request, LoyaltyRedemption.objects.filter(pk=redemption.pk))

        redemption.refresh_from_db()
        self.assertIsNotNone(redemption.fulfilled_at)

    def test_loyalty_redemption_rejects_insufficient_points_without_changes(self):
        LoyaltyEntry.objects.create(customer=self.user, points=20, reference="loyalty-small-credit")
        reward = LoyaltyReward.objects.create(name="Delivery voucher", points_cost=50)

        response = self.client.post("/api/v1/loyalty/redeem/", {"reward_id": reward.pk}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(LoyaltyRedemption.objects.filter(customer=self.user).count(), 0)
        self.assertEqual(LoyaltyEntry.objects.filter(customer=self.user).aggregate(total=Sum("points"))["total"], 20)

    def test_reviews_require_own_completed_purchase_and_valid_rating(self):
        order_id = self.order().data["id"]
        payload = {"order": order_id, "rating": 5, "comment": "Good delivery"}
        self.assertEqual(self.client.post("/api/v1/reviews/", payload, format="json").status_code, 400)
        Order.objects.filter(pk=order_id).update(status="delivered")
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.post("/api/v1/reviews/", payload, format="json").status_code, 400)
        for rating in [0, 6]:
            self.assertEqual(
                self.client.post(
                    "/api/v1/reviews/", {**payload, "rating": rating}, format="json"
                ).status_code,
                400,
            )
        response = self.client.post("/api/v1/reviews/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(other.get(f"/api/v1/reviews/{response.data['id']}/").status_code, 404)
        self.assertEqual(self.client.post("/api/v1/reviews/", payload, format="json").status_code, 400)

    def test_customers_cannot_create_notifications(self):
        self.assertEqual(
            self.client.post("/api/v1/notifications/", {"title": "Forged"}, format="json").status_code, 405
        )

    def test_support_reply_permissions_notification_and_reopening(self):
        result = self.client.post(
            "/api/v1/tickets/",
            {"subject": "Delivery help", "message": "Where is my order?", "status": "resolved"},
            format="json",
        )
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.data["status"], "open")
        url = f"/api/v1/tickets/{result.data['id']}/"
        payload = {"status": "resolved", "response": "We have resolved the delivery issue."}
        self.assertEqual(self.client.post(url + "respond/", payload, format="json").status_code, 403)
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.get(url).status_code, 404)
        staff = APIClient()
        staff.force_authenticate(self.manager)
        self.assertEqual(staff.get(url).status_code, 404)
        self.manager.user_permissions.add(
            *Permission.objects.filter(codename__in=["view_supportticket", "change_supportticket"])
        )
        self.manager = get_user_model().objects.get(pk=self.manager.pk)
        staff.force_authenticate(self.manager)
        self.assertEqual(
            staff.post(url + "respond/", {**payload, "response": " "}, format="json").status_code, 400
        )
        self.assertEqual(staff.post(url + "respond/", payload, format="json").status_code, 200)
        self.assertTrue(Notification.objects.filter(user=self.user, title="Support reply received").exists())
        self.assertEqual(staff.post(url + "respond/", payload, format="json").status_code, 400)
        self.assertEqual(staff.post(url + "reopen/", {}, format="json").status_code, 403)
        self.assertEqual(self.client.post(url + "reopen/", {}, format="json").status_code, 200)
        self.assertEqual(self.client.get(url).data["status"], "open")
        self.assertEqual(self.client.post(url + "reopen/", {}, format="json").status_code, 400)

    def test_review_purchase_picker_and_completed_booking(self):
        booking = Booking.objects.create(
            customer=self.user,
            offering=self.service,
            scheduled_at=timezone.now(),
            address=self.address,
            price=800,
            idempotency_key="review-booking",
        )
        endpoint = "/api/v1/reviews/eligible_purchases/?kind=booking"
        self.assertEqual(self.client.get(endpoint).data["count"], 0)
        booking.status = "completed"
        booking.save()
        response = self.client.get(endpoint)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(booking.pk))
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.get(endpoint).data["count"], 0)
        order_id = self.order().data["id"]
        Order.objects.filter(pk=order_id).update(status="delivered")
        self.assertEqual(self.client.get("/api/v1/reviews/eligible_purchases/").data["count"], 1)
        self.assertEqual(self.client.get("/api/v1/reviews/eligible_purchases/?kind=invalid").status_code, 400)
        payload = {"booking": str(booking.pk), "rating": 4, "comment": "Helpful service"}
        self.assertEqual(
            self.client.post("/api/v1/reviews/", {**payload, "order": order_id}, format="json").status_code,
            400,
        )
        self.assertEqual(self.client.post("/api/v1/reviews/", payload, format="json").status_code, 201)
        self.assertEqual(self.client.get(endpoint).data["count"], 0)
        self.assertEqual(self.client.post("/api/v1/reviews/", payload, format="json").status_code, 400)

    def test_support_response_rolls_back_when_notification_fails(self):
        from apps.engagement.models import SupportTicket

        ticket = SupportTicket.objects.create(customer=self.user, subject="Help", message="Delivery issue")
        self.manager.user_permissions.add(
            *Permission.objects.filter(codename__in=["view_supportticket", "change_supportticket"])
        )
        staff = APIClient()
        staff.force_authenticate(self.manager)
        with patch(
            "apps.engagement.api.Notification.objects.create",
            side_effect=RuntimeError("Notification failure"),
        ):
            with self.assertRaises(RuntimeError):
                staff.post(
                    f"/api/v1/tickets/{ticket.pk}/respond/",
                    {"status": "resolved", "response": "Resolved"},
                    format="json",
                )
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "open")
        self.assertEqual(ticket.response, "")
        self.assertEqual(ticket.messages.count(), 0)
        self.assertFalse(AuditLog.objects.filter(entity=str(ticket.pk), action="support.responded").exists())

    def test_support_conversation_preserves_replies_and_protects_customer_follow_up(self):
        from apps.engagement.models import SupportTicket

        ticket = SupportTicket.objects.create(customer=self.user, subject="Help", message="Issue")
        url = f"/api/v1/tickets/{ticket.pk}/"
        self.manager.user_permissions.add(
            *Permission.objects.filter(codename__in=["view_supportticket", "change_supportticket"])
        )
        staff = APIClient()
        staff.force_authenticate(self.manager)
        for response in ["First reply", "Second reply"]:
            self.assertEqual(
                staff.post(
                    url + "respond/", {"status": "in_progress", "response": response}, format="json"
                ).status_code,
                200,
            )
        self.assertEqual(
            self.client.post(
                url + "follow_up/", {"body": "More details", "sender_role": "team"}, format="json"
            ).status_code,
            201,
        )
        history = self.client.get(url + "messages/")
        self.assertEqual(history.data["count"], 3)
        self.assertEqual(history.data["results"][0]["sender_role"], "customer")
        self.assertEqual(
            {row["body"] for row in history.data["results"]}, {"First reply", "Second reply", "More details"}
        )
        self.assertNotIn("author", history.data["results"][0])
        self.assertEqual(
            staff.post(url + "follow_up/", {"body": "Impersonation"}, format="json").status_code, 403
        )
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.get(url + "messages/").status_code, 404)
        self.assertEqual(other.post(url + "follow_up/", {"body": "Private"}, format="json").status_code, 404)
        self.assertEqual(self.client.post(url + "follow_up/", {"body": " "}, format="json").status_code, 400)
        staff.post(url + "respond/", {"status": "resolved", "response": "Done"}, format="json")
        self.assertEqual(
            self.client.post(url + "follow_up/", {"body": "Still an issue"}, format="json").status_code, 400
        )

    def test_catalog_price_filters_sorting_and_stock(self):
        self.rx.stock = 0
        self.rx.save()
        response = self.client.get("/api/v1/offerings/?min_price=200&max_price=800&sort=price_desc")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data["results"]], [self.service.pk, self.item.pk])
        response = self.client.get("/api/v1/offerings/?in_stock=true&sort=price_asc")
        self.assertEqual([row["id"] for row in response.data["results"]], [self.item.pk, self.service.pk])
        response = self.client.get("/api/v1/offerings/?division=shop&min_price=250&max_price=250&q=Cotton")
        self.assertEqual(response.data["count"], 1)
        for query in [
            "min_price=-1",
            "min_price=abc",
            "min_price=NaN",
            "min_price=900&max_price=100",
            "sort=unknown",
            "in_stock=invalid",
        ]:
            self.assertEqual(self.client.get(f"/api/v1/offerings/?{query}").status_code, 400, query)
        self.assertEqual(self.client.get("/api/v1/offerings/?min_price=&max_price=").status_code, 200)
        self.item.active = False
        self.item.save()
        self.assertEqual(self.client.get("/api/v1/offerings/?division=shop&sort=price_asc").data["count"], 0)

    def test_catalog_categories_follow_division_visibility_and_filter_items(self):
        shop = Category.objects.create(division=self.shop, name="Bags", name_bn="ব্যাগ")
        service = Category.objects.create(division=self.services, name="Cleaning", name_bn="পরিষ্কার")
        self.item.category = shop
        self.item.save()
        response = self.client.get("/api/v1/categories/?division=shop")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [shop.pk])
        self.assertEqual(self.client.get(f"/api/v1/offerings/?category={shop.pk}").data["count"], 1)
        self.assertEqual(
            self.client.get(f"/api/v1/offerings/?category={shop.pk}&division=services").data["count"], 0
        )
        self.assertEqual(self.client.get("/api/v1/offerings/?category=abc").status_code, 400)
        self.services.active = False
        self.services.save()
        self.assertEqual(self.client.get(f"/api/v1/categories/{service.pk}/").status_code, 404)
        self.assertNotIn(service.pk, [row["id"] for row in self.client.get("/api/v1/categories/").data])
        self.assertEqual(
            self.client.post("/api/v1/categories/", {"name": "Forged"}, format="json").status_code, 405
        )

    def test_business_directory_search_and_merchant_catalog_visibility(self):
        approved = Organization.objects.create(
            name="Dhaka Store",
            division=self.shop,
            owner=self.manager,
            approved=True,
            area="Dhanmondi",
            address="House 12, Road 7, Dhaka",
        )
        pending = Organization.objects.create(
            name="Pending Store", division=self.shop, owner=self.manager, approved=False, area="Dhanmondi"
        )
        self.item.organization = approved
        self.item.save()
        response = self.client.get("/api/v1/organizations/?q=Dhanmondi&division=shop")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], approved.pk)
        self.assertEqual(response.data["results"][0]["address"], "House 12, Road 7, Dhaka")
        self.assertEqual(response.data["results"][0]["division_name"], self.shop.name)
        self.assertEqual(self.client.get("/api/v1/organizations/?q=Road%207&area=Dhanmondi").data["count"], 1)
        self.assertEqual(self.client.get("/api/v1/organizations/?area=Gulshan").data["count"], 0)
        self.assertNotIn("owner", response.data["results"][0])
        self.assertEqual(self.client.get(f"/api/v1/organizations/{pending.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/offerings/?organization={approved.pk}").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/v1/offerings/?organization={pending.pk}").data["count"], 0)
        self.assertEqual(self.client.get("/api/v1/offerings/?organization=bad").status_code, 400)
        approved.approved = False
        approved.save()
        self.assertEqual(self.client.get(f"/api/v1/offerings/?organization={approved.pk}").data["count"], 0)
        approved.approved = True
        approved.save()
        self.shop.active = False
        self.shop.save()
        self.assertEqual(self.client.get(f"/api/v1/organizations/{approved.pk}/").status_code, 404)

    def parcel_payload(self, **overrides):
        return {
            "pickup": self.address,
            "dropoff": self.address,
            "weight_kg": "2.50",
            "description": "Books",
            **overrides,
        }

    def test_delivery_area_filter_and_cross_area_fee(self):
        pickup_area = ServiceArea.objects.create(name="High Fee", delivery_fee="100")
        pickup_area.divisions.add(self.delivery)
        shop_only = ServiceArea.objects.create(name="Shop Only", delivery_fee="30")
        shop_only.divisions.add(self.shop)
        inactive = ServiceArea.objects.create(name="Closed", delivery_fee="50", active=False)
        inactive.divisions.add(self.delivery)
        available = self.client.get("/api/v1/areas/?division=delivery").data["results"]
        self.assertEqual({area["name"] for area in available}, {"Dhanmondi", "High Fee"})
        response = self.client.post(
            "/api/v1/deliveries/quote/",
            self.parcel_payload(pickup={**self.address, "area": "High Fee"}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Decimal(response.data["fee"]), Decimal("130"))

    def test_parcel_cod_collection_finance_and_earning_snapshot(self):
        from .models import RiderProfile, DeliveryRequest

        self.other.groups.add(Group.objects.create(name="Rider"))
        profile = RiderProfile.objects.create(user=self.other, earning_per_delivery=45)
        payload = self.parcel_payload(cod_amount="500", quantity=2)
        booked = self.client.post(
            "/api/v1/deliveries/", payload, format="json", HTTP_IDEMPOTENCY_KEY="cod-parcel"
        )
        self.assertEqual(booked.status_code, 201, booked.data)
        url = f"/api/v1/deliveries/{booked.data['id']}/"
        self.client.force_authenticate(self.manager)
        self.client.post(url + "transition/", {"status": "confirmed"})
        self.client.post(url + "assign/", {"worker": self.other.pk})
        self.client.post(url + "transition/", {"status": "assigned"})
        profile.earning_per_delivery = 80
        profile.save()
        self.client.force_authenticate(self.other)
        for status in ["pickup_pending", "picked_up", "in_transit", "out_for_delivery"]:
            self.assertEqual(self.client.post(url + "transition/", {"status": status}).status_code, 200)
        self.assertEqual(
            self.client.post(
                url + "transition/",
                {"status": "delivered", "received_by": "Receiver", "cod_collected": "499"},
            ).status_code,
            400,
        )
        complete = self.client.post(
            url + "transition/", {"status": "delivered", "received_by": "Receiver", "cod_collected": "500"}
        )
        self.assertEqual(complete.status_code, 200, complete.data)
        summary = self.client.get("/api/v1/deliveries/rider_profile/").data
        self.assertEqual(Decimal(summary["pending_cod"]), 500)
        self.assertEqual(Decimal(summary["recorded_earnings"]), 45)
        self.assertEqual(
            self.client.post(
                url + "reconcile_cash/", {"amount": "500", "reference": "deposit-1"}
            ).status_code,
            403,
        )
        self.client.force_authenticate(self.manager)
        self.assertEqual(
            self.client.post(
                url + "reconcile_cash/", {"amount": "499", "reference": "deposit-1"}
            ).status_code,
            400,
        )
        reconciled = self.client.post(url + "reconcile_cash/", {"amount": "500", "reference": "deposit-1"})
        self.assertEqual(reconciled.status_code, 200, reconciled.data)
        self.assertIsNotNone(reconciled.data["cash_reconciled_at"])
        self.assertNotIn("cash_reference", reconciled.data)
        self.assertEqual(
            self.client.post(
                url + "reconcile_cash/", {"amount": "500", "reference": "deposit-1"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                url + "reconcile_cash/", {"amount": "500", "reference": "different"}
            ).status_code,
            400,
        )
        other = DeliveryRequest.objects.create(
            customer=self.user,
            pickup=self.address,
            dropoff=self.address,
            description="Other",
            weight_kg=1,
            fee=60,
            status="delivered",
            cod_amount=500,
            cod_collected=500,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/deliveries/{other.pk}/reconcile_cash/", {"amount": "500", "reference": "deposit-1"}
            ).status_code,
            400,
        )
        self.client.force_authenticate(self.other)
        self.assertEqual(Decimal(self.client.get("/api/v1/deliveries/rider_profile/").data["pending_cod"]), 0)

    def test_rider_availability_and_assignment_rejection(self):
        from .models import RiderProfile, DeliveryRequest

        self.assertEqual(self.client.get("/api/v1/deliveries/rider_profile/").status_code, 403)
        self.other.groups.add(Group.objects.create(name="Rider"))
        response = self.client.post(
            "/api/v1/deliveries/", self.parcel_payload(), format="json", HTTP_IDEMPOTENCY_KEY="reject-job"
        )
        url = f"/api/v1/deliveries/{response.data['id']}/"
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.patch(
                "/api/v1/deliveries/rider_profile/",
                {"available": False, "vehicle": "Bicycle", "earning_per_delivery": 1000},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(RiderProfile.objects.get(user=self.other).earning_per_delivery, 0)
        self.client.force_authenticate(self.manager)
        self.client.post(url + "transition/", {"status": "confirmed"})
        self.assertEqual(self.client.get("/api/v1/deliveries/riders/").data["count"], 0)
        self.assertEqual(self.client.post(url + "assign/", {"worker": self.other.pk}).status_code, 400)
        self.client.force_authenticate(self.other)
        self.client.patch("/api/v1/deliveries/rider_profile/", {"available": True}, format="json")
        self.client.force_authenticate(self.manager)
        self.client.post(url + "assign/", {"worker": self.other.pk})
        self.client.post(url + "transition/", {"status": "assigned"})
        self.assertEqual(
            self.client.post(url + "reject_assignment/", {"reason": "Unavailable"}).status_code, 403
        )
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url + "reject_assignment/", {}).status_code, 400)
        self.assertEqual(
            self.client.post(url + "reject_assignment/", {"reason": "Bike repair needed"}).status_code, 200
        )
        self.assertEqual(self.client.get(url).status_code, 404)
        parcel = DeliveryRequest.objects.get(pk=response.data["id"])
        self.assertEqual(parcel.status, "confirmed")
        self.assertIsNone(parcel.rider_id)

    def test_delivery_feedback_requires_own_completed_booking(self):
        from .models import DeliveryRequest

        self.other.groups.add(Group.objects.create(name="Rider"))
        parcel = DeliveryRequest.objects.create(
            customer=self.user,
            rider=self.other,
            pickup=self.address,
            dropoff=self.address,
            description="Completed test parcel",
            weight_kg=1,
            fee=60,
            status="requested",
        )
        url = f"/api/v1/deliveries/{parcel.pk}/feedback/"
        self.assertEqual(self.client.post(url, {"rating": 5}).status_code, 400)
        parcel.status = "delivered"
        parcel.save()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url, {"rating": 5}).status_code, 403)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(url, {"rating": 6}).status_code, 400)
        feedback = self.client.post(url, {"rating": 5, "comment": "Excellent demo handover"})
        self.assertEqual(feedback.status_code, 200, feedback.data)
        self.assertEqual(feedback.data["feedback"]["rating"], 5)
        self.assertFalse(feedback.data["can_review"])
        self.assertEqual(self.client.post(url, {"rating": 1}).status_code, 400)
        self.client.force_authenticate(self.other)
        summary = self.client.get("/api/v1/deliveries/rider_profile/").data
        self.assertEqual(summary["average_rating"], 5)
        self.assertEqual(summary["rating_count"], 1)

    def test_parcel_quote_idempotency_and_stale_price(self):
        from .models import DeliveryRequest

        payload = self.parcel_payload()
        quote = self.client.post("/api/v1/deliveries/quote/", payload, format="json")
        self.assertEqual(quote.status_code, 200, quote.data)
        self.assertEqual(Decimal(quote.data["fee"]), Decimal("90"))
        self.assertEqual(DeliveryRequest.objects.count(), 0)
        url = "/api/v1/deliveries/"
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        self.assertEqual(
            self.client.post(
                url, {**payload, "expected_fee": "1"}, format="json", HTTP_IDEMPOTENCY_KEY="stale"
            ).status_code,
            400,
        )
        first = self.client.post(
            url, {**payload, "expected_fee": "90"}, format="json", HTTP_IDEMPOTENCY_KEY="retry"
        )
        second = self.client.post(url, payload, format="json", HTTP_IDEMPOTENCY_KEY="retry")
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(DeliveryRequest.objects.count(), 1)
        self.assertEqual(
            self.client.post(
                url, self.parcel_payload(description="Different"), format="json", HTTP_IDEMPOTENCY_KEY="retry"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/deliveries/quote/", self.parcel_payload(weight_kg="20.01"), format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/deliveries/quote/",
                self.parcel_payload(pickup_at=(timezone.now() - timedelta(hours=1)).isoformat()),
                format="json",
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/deliveries/quote/",
                self.parcel_payload(dropoff={**self.address, "area": "Unavailable"}),
                format="json",
            ).status_code,
            400,
        )

    def test_parcel_dispatch_handover_privacy_and_receipt(self):
        self.other.groups.add(Group.objects.create(name="Rider"))
        response = self.client.post(
            "/api/v1/deliveries/",
            self.parcel_payload(
                description="<script>alert(1)</script>", fragile=True, instructions="Call before pickup"
            ),
            format="json",
            HTTP_IDEMPOTENCY_KEY="dispatch",
        )
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/v1/deliveries/{response.data['id']}/"
        self.assertNotIn(b"<script>", self.client.get(url + "receipt/").content)
        self.assertEqual(self.client.get("/api/v1/deliveries/riders/").status_code, 403)
        self.assertEqual(self.client.post(url + "transition/", {"status": "confirmed"}).status_code, 403)
        self.client.force_authenticate(self.other)
        for suffix in ["", "history/", "receipt/"]:
            self.assertEqual(self.client.get(url + suffix).status_code, 404)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(url + "transition/", {"status": "confirmed"}).status_code, 200)
        self.assertEqual(self.client.post(url + "transition/", {"status": "assigned"}).status_code, 400)
        self.assertEqual(self.client.post(url + "assign/", {"worker": self.user.pk}).status_code, 404)
        self.assertEqual(self.client.post(url + "assign/", {"worker": self.other.pk}).status_code, 200)
        self.assertEqual(self.client.post(url + "transition/", {"status": "assigned"}).status_code, 200)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(url + "transition/", {"status": "cancelled"}).status_code, 403)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url + "transition/", {"status": "pickup_pending"}).status_code, 200)
        self.assertEqual(self.client.post(url + "transition/", {"status": "picked_up"}).status_code, 200)
        self.assertEqual(self.client.post(url + "transition/", {"status": "in_transit"}).status_code, 200)
        self.assertEqual(
            self.client.post(url + "transition/", {"status": "out_for_delivery"}).status_code, 200
        )
        self.assertEqual(self.client.post(url + "transition/", {"status": "delivered"}).status_code, 400)
        done = self.client.post(
            url + "transition/",
            {"status": "delivered", "received_by": "Receiver", "delivery_note": "Handed over at door"},
        )
        self.assertEqual(done.status_code, 200, done.data)
        self.assertEqual(done.data["received_by"], "Receiver")
        self.assertIsNotNone(done.data["completed_at"])
        self.assertEqual(self.client.post(url + "transition/", {"status": "in_transit"}).status_code, 400)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get("/api/v1/deliveries/?status=delivered").data["count"], 1)
        self.assertEqual(len(self.client.get(url + "history/").data), 8)
        self.assertTrue(Notification.objects.filter(user=self.user, title="Delivery status updated").exists())

    def test_parcel_failure_return_and_customer_cancellation(self):
        response = self.client.post(
            "/api/v1/deliveries/", self.parcel_payload(), format="json", HTTP_IDEMPOTENCY_KEY="failure"
        )
        url = f"/api/v1/deliveries/{response.data['id']}/"
        self.client.force_authenticate(self.manager)
        self.other.groups.add(Group.objects.create(name="Rider"))
        self.client.post(url + "transition/", {"status": "confirmed"})
        self.client.post(url + "assign/", {"worker": self.other.pk})
        self.client.post(url + "transition/", {"status": "assigned"})
        self.client.force_authenticate(self.other)
        self.client.post(url + "transition/", {"status": "pickup_pending"})
        self.client.post(url + "transition/", {"status": "picked_up"})
        self.assertEqual(self.client.post(url + "transition/", {"status": "failed"}).status_code, 400)
        failed = self.client.post(
            url + "transition/", {"status": "failed", "failure_reason": "Recipient unavailable"}
        )
        self.assertEqual(failed.status_code, 200, failed.data)
        self.assertEqual(failed.data["failure_reason"], "Recipient unavailable")
        self.assertEqual(self.client.post(url + "transition/", {"status": "returned"}).status_code, 200)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/v1/deliveries/", self.parcel_payload(), format="json", HTTP_IDEMPOTENCY_KEY="cancel"
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/deliveries/{response.data['id']}/transition/", {"status": "cancelled"}
            ).status_code,
            200,
        )
