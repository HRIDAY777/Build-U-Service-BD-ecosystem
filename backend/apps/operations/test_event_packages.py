from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient


@override_settings(SECURE_SSL_REDIRECT=False)
class EventPackageTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="package-customer", email="package-customer@example.invalid")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.payload = {
            "title": "Demo wedding", "event_date": str(timezone.localdate() + timedelta(days=30)),
            "guest_count": 50, "venue": "Demo venue", "area": "Dhaka",
            "services": ["Catering"],
            "package_selection": {"bundle": "essential", "tiers": {"Catering": "silver"}},
        }

    def test_selection_persists_and_is_private(self):
        response = self.client.post("/api/v1/events/", self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        event_url = f"/api/v1/events/{response.data['id']}/"
        self.assertEqual(self.client.get(event_url).data["package_selection"], self.payload["package_selection"])
        other = get_user_model().objects.create_user(username="package-other", email="package-other@example.invalid")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(event_url).status_code, 404)

    def test_invalid_selections_and_unselected_services_are_rejected(self):
        for selection in [[], {"price": 1}, {"bundle": []}, {"tiers": {"Catering": {}}},
                          {"tiers": {"Unknown": "silver"}}, {"tiers": {"Catering": "platinum"}},
                          {"tiers": {"Transport": "silver"}}]:
            with self.subTest(selection=selection):
                response = self.client.post("/api/v1/events/", {**self.payload, "package_selection": selection}, format="json")
                self.assertEqual(response.status_code, 400, response.data)

    def test_service_cannot_be_removed_without_clearing_its_tier(self):
        response = self.client.post("/api/v1/events/", self.payload, format="json")
        url = f"/api/v1/events/{response.data['id']}/"
        self.assertEqual(self.client.patch(url, {"services": []}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(url, {"services": [], "package_selection": {}}, format="json").status_code, 200)
