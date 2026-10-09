from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.engagement.models import Notification
from .models import Division, Offering, WishlistItem, WishlistShare, ProductVariant
from .wishlist import check_wishlist_alerts


@override_settings(SECURE_SSL_REDIRECT=False)
class WishlistFeaturesTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="wishlist_owner", email="owner@example.invalid"
        )
        self.other = get_user_model().objects.create_user(
            username="wishlist_other", email="other@example.invalid"
        )
        self.division = Division.objects.create(slug="shop", name="Shop", kind="goods")
        self.offering = Offering.objects.create(
            division=self.division, name="Demo bag", slug="demo-bag", sku="QA-BAG", price=100, stock=0
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def save_item(self, **extra):
        response = self.client.post(
            "/api/v1/wishlist/", {"offering": self.offering.pk, **extra}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        return WishlistItem.objects.get(pk=response.data["id"])

    def test_price_and_restock_alerts_send_once_and_off_switch_stops_them(self):
        item = self.save_item(price_alert=True, restock_alert=True)
        Offering.objects.filter(pk=self.offering.pk).update(sale_price=80, stock=4)
        self.assertEqual(check_wishlist_alerts(), 2)
        self.assertEqual(check_wishlist_alerts(), 0)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 2)
        self.client.patch(
            f"/api/v1/wishlist/{item.pk}/", {"price_alert": False, "restock_alert": False}, format="json"
        )
        Offering.objects.filter(pk=self.offering.pk).update(sale_price=60)
        self.assertEqual(check_wishlist_alerts(), 0)

    def test_later_opt_in_sets_baseline_and_private_settings_are_owner_only(self):
        item = self.save_item()
        Offering.objects.filter(pk=self.offering.pk).update(price=70)
        response = self.client.patch(f"/api/v1/wishlist/{item.pk}/", {"price_alert": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(check_wishlist_alerts(), 0)
        Offering.objects.filter(pk=self.offering.pk).update(price=60)
        self.assertEqual(check_wishlist_alerts(self.user), 1)
        item.refresh_from_db()
        self.assertEqual(item.observed_price, Decimal("60"))
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.patch(
                f"/api/v1/wishlist/{item.pk}/", {"price_alert": False}, format="json"
            ).status_code,
            404,
        )

    def test_shared_list_public_and_revocable_without_personal_data(self):
        self.save_item(price_alert=True)
        result = self.client.post("/api/v1/wishlist/share/", {}, format="json")
        self.assertEqual(result.status_code, 200)
        share = WishlistShare.objects.get(user=self.user)
        public = APIClient()
        url = f"/api/v1/wishlist-shared/{share.token}/"
        result = public.get(url)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["count"], 1)
        self.assertNotIn("price_alert", result.data["results"][0])
        self.assertNotIn(self.user.email, str(result.data))
        self.assertEqual(result["Cache-Control"], "no-store")
        self.assertEqual(self.client.delete("/api/v1/wishlist/share/").status_code, 204)
        self.assertEqual(public.get(url).status_code, 404)
        self.client.post("/api/v1/wishlist/share/", {}, format="json")
        self.assertNotEqual(WishlistShare.objects.get(user=self.user).token, share.token)

    def test_inactive_offerings_hidden_and_no_alerts_sent(self):
        self.save_item(price_alert=True, restock_alert=True)
        share = WishlistShare.objects.create(user=self.user)
        Offering.objects.filter(pk=self.offering.pk).update(active=False, price=50, stock=3)
        self.assertEqual(check_wishlist_alerts(), 0)
        result = APIClient().get(f"/api/v1/wishlist-shared/{share.token}/")
        self.assertEqual(result.data["count"], 0)

    def test_variant_stock_and_list_refresh_trigger_real_notification(self):
        variant = ProductVariant.objects.create(
            offering=self.offering, label="Blue", sku="QA-BLUE", price=100, stock=0
        )
        self.save_item(restock_alert=True)
        ProductVariant.objects.filter(pk=variant.pk).update(stock=2)
        self.assertEqual(self.client.get("/api/v1/wishlist/").status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        self.client.get("/api/v1/wishlist/")
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
