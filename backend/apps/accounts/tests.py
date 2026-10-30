from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.operations.models import AuditLog


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class EmailLoginTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="login-owner", email="owner@example.invalid", password="test-password")

    def sign_in(self, identifier, password="test-password"):
        return self.client.post("/api/v1/auth/login/", {"username": identifier, "password": password}, format="json")

    def test_username_and_case_insensitive_email_create_authenticated_session(self):
        for identifier in ["login-owner", " OWNER@EXAMPLE.INVALID "]:
            response = self.sign_in(identifier)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(self.client.get("/api/v1/auth/me/").data["id"], self.user.pk)
            self.client.post("/api/v1/auth/logout/", {}, format="json")

    def test_inactive_wrong_password_and_unknown_are_generic(self):
        self.user.is_active = False
        self.user.save()
        for identifier, password in [(self.user.email, "test-password"), (self.user.username, "wrong"), ("missing@example.invalid", "wrong")]:
            response = self.sign_in(identifier, password)
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data, {"error": "Invalid login details."})

    def test_username_email_collision_cannot_select_another_identity(self):
        get_user_model().objects.create_user(username=self.user.email, email="other@example.invalid", password="other-password")
        for password in ["test-password", "other-password"]:
            self.assertEqual(self.sign_in(self.user.email, password).status_code, 400)
        self.assertEqual(self.sign_in(self.user.username).status_code, 200)

    def test_legacy_case_duplicate_email_and_invalid_input_are_rejected(self):
        get_user_model().objects.create_user(username="legacy", email="OWNER@example.invalid", password="test-password")
        for identifier in [self.user.email, {}, "x" * 255]:
            self.assertEqual(self.sign_in(identifier).status_code, 400)


class SecurityHistoryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username="history-owner", email="history-owner@example.invalid")
        self.other = get_user_model().objects.create_superuser(username="history-admin", email="history-admin@example.invalid", password="test-only")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/auth/security-history/"

    def test_owner_scope_whitelist_and_secret_redaction(self):
        AuditLog.objects.create(actor=self.user, action="account.login", entity=str(self.user.pk), metadata={"password": "SECRET", "session": "TOKEN"})
        AuditLog.objects.create(actor=self.user, action="internal.action", entity=str(self.user.pk))
        AuditLog.objects.create(actor=self.other, action="account.login", entity=str(self.other.pk))
        response = self.client.get(self.url, {"user_id": self.other.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(set(response.data["results"][0]), {"id", "action", "created_at"})
        self.assertNotIn("SECRET", str(response.data))
        self.assertNotIn("TOKEN", str(response.data))
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).data["count"], 1)

    def test_pagination_has_stable_newest_first_order(self):
        events = [AuditLog.objects.create(actor=self.user, action="account.logout", entity=str(self.user.pk)) for _ in range(35)]
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 35)
        self.assertEqual(response.data["results"][0]["id"], events[-1].pk)
        self.assertIsNotNone(response.data["next"])
        second = self.client.get(self.url, {"page": 2})
        self.assertTrue(second.data["results"])
        self.assertIsNone(second.data["next"])

    def test_anonymous_access_is_denied(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, [401, 403])


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ProfileAndRoleDashboardTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="profile-owner",
            email="profile@example.invalid",
            password="old-password-123",
            first_name="Initial",
            phone="+8801711000000",
        )
        self.client.force_authenticate(self.user)

    def test_profile_patch_updates_details_validates_phone_and_audits(self):
        bad = self.client.patch("/api/v1/auth/me/", {"phone": "invalid-phone"}, format="json")
        self.assertEqual(bad.status_code, 400)

        res = self.client.patch(
            "/api/v1/auth/me/",
            {
                "first_name": "Rahim",
                "last_name": "Uddin",
                "phone": "+8801712345678",
                "language": "en",
                "marketing_consent": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["first_name"], "Rahim")
        self.assertEqual(res.data["last_name"], "Uddin")
        self.assertEqual(res.data["phone"], "+8801712345678")
        self.assertEqual(res.data["language"], "en")
        self.assertTrue(res.data["marketing_consent"])
        self.assertTrue(
            AuditLog.objects.filter(entity=str(self.user.pk), action="account.profile_updated").exists()
        )

    def test_roles_include_admin_and_partner_organization_owner(self):
        from apps.catalog.models import Division, Organization

        div = Division.objects.create(slug="food-role-test", name="Food", name_bn="খাবার", kind="goods")
        Organization.objects.create(
            owner=self.user,
            division=div,
            name="Partner Kitchen",
            area="Dhaka",
        )
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertIn("Partner", me.data["roles"])

        admin = get_user_model().objects.create_superuser(
            username="super-role-test", email="super@example.invalid", password="old-password-123"
        )
        self.client.force_authenticate(admin)
        admin_me = self.client.get("/api/v1/auth/me/")
        self.assertIn("Admin", admin_me.data["roles"])
        self.assertTrue(admin_me.data["is_superuser"])

