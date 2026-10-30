from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.catalog.models import Division, Offering
from apps.engagement.models import Notification
from apps.operations.models import AuditLog, ProviderProfile


@override_settings(
    SECURE_SSL_REDIRECT=False,
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class MasterAdminAPITests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.customer = User.objects.create_user(
            username="regular_user",
            email="regular@example.invalid",
            password="Strong-test-pass-42",
        )
        self.admin = User.objects.create_user(
            username="master_admin",
            email="admin@example.invalid",
            password="Strong-test-pass-42",
            is_staff=True,
        )
        self.shop = Division.objects.create(
            slug="shop", name="U Shop", name_bn="ইউ শপ", kind="goods", active=True
        )
        self.services = Division.objects.create(
            slug="services", name="Services", name_bn="হোম সার্ভিস", kind="service", active=True
        )

    def test_non_staff_forbidden(self):
        client = APIClient()
        client.force_authenticate(user=self.customer)
        res = client.get("/api/v1/admin-control/overview/")
        self.assertEqual(res.status_code, 403)
        res_offerings = client.get("/api/v1/admin-control/offerings/")
        self.assertEqual(res_offerings.status_code, 403)

    def test_staff_full_control_and_audit(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)

        overview = client.get("/api/v1/admin-control/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertIn("offerings_total", overview.data)

        created = client.post(
            "/api/v1/admin-control/offerings/",
            {
                "division": self.shop.id,
                "name": "Organic Mustard Oil 1L",
                "name_bn": "খাঁটি সরিষার তেল ১ লিটার",
                "sku": "SHOP-OIL-1L",
                "price": "320.00",
                "sale_price": "290.00",
                "stock": 40,
                "image": "/images/photos/shop.jpg",
                "description": "Cold pressed mustard oil.",
                "active": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        offering_id = created.data["id"]

        patched = client.patch(
            f"/api/v1/admin-control/offerings/{offering_id}/",
            {"active": False, "stock": 25},
            format="json",
        )
        self.assertEqual(patched.status_code, 200)
        self.assertFalse(Offering.objects.get(id=offering_id).active)

        role_patch = client.patch(
            f"/api/v1/admin-control/users/{self.customer.id}/",
            {"group_names": ["Provider"]},
            format="json",
        )
        self.assertEqual(role_patch.status_code, 200)
        self.assertIn("Provider", role_patch.data["groups_display"])
        self.assertTrue(ProviderProfile.objects.filter(user=self.customer).exists())

        broadcast = client.post(
            "/api/v1/admin-control/broadcast/",
            {"username": "regular_user", "title": "System Notice", "body": "Welcome!"},
            format="json",
        )
        self.assertEqual(broadcast.status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.customer).count(), 1)

        deleted = client.delete(f"/api/v1/admin-control/offerings/{offering_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertTrue(
            AuditLog.objects.filter(action="admin.offering.deleted").exists()
        )

    def test_website_appearance_text_image_video_control(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)

        # 1. Global background & colors
        bg_res = client.patch(
            "/api/v1/admin-control/appearance/",
            {
                "page_path": "/*",
                "background_color": "#fbf9ff",
                "primary_color": "#6b1199",
                "announcement_text_bn": "বিশেষ ঈদ অফার চলছে!",
            },
            format="json",
        )
        self.assertEqual(bg_res.status_code, 200)

        # 2. Homepage text replacement
        txt_res = client.post(
            "/api/v1/admin-control/text-replacements/",
            {
                "page_path": "/",
                "source_text": "পুরাতন শিরোনাম",
                "replacement_text": "নতুন সুপার শিরোনাম",
                "active": True,
            },
            format="json",
        )
        self.assertEqual(txt_res.status_code, 201)

        # 3. Homepage image replacement via URL
        img_res = client.post(
            "/api/v1/admin-control/image-replacements/",
            {
                "page_path": "/",
                "source_url": "/images/photos/shop.jpg",
                "replacement_url": "/images/photos/food.jpg",
                "active": True,
            },
            format="json",
        )
        self.assertEqual(img_res.status_code, 201)

        # 4. Homepage video banner
        vid_res = client.post(
            "/api/v1/admin-control/video-blocks/",
            {
                "page_path": "/",
                "mode": "banner",
                "position": "top",
                "title_bn": "আমাদের পরিচিতি ভিডিও",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "active": True,
            },
            format="json",
        )
        self.assertEqual(vid_res.status_code, 201)

        # 5. Public merged GET /api/v1/page-appearance/?path=/
        public_res = APIClient().get("/api/v1/page-appearance/?path=/")
        self.assertEqual(public_res.status_code, 200)
        self.assertEqual(public_res.data["background_color"], "#fbf9ff")
        self.assertEqual(public_res.data["announcement_text_bn"], "বিশেষ ঈদ অফার চলছে!")
        self.assertEqual(len(public_res.data["text_replacements"]), 1)
        self.assertEqual(len(public_res.data["image_replacements"]), 1)
        self.assertEqual(len(public_res.data["videos"]), 1)

