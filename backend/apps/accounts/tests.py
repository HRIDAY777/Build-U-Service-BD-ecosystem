from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


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
