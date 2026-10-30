import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import PageAppearance, PageImageReplacement


class PageAppearanceApiTests(TestCase):
    def setUp(self):
        self.temporary_media = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_media.cleanup)
        self.media_override = override_settings(MEDIA_ROOT=Path(self.temporary_media.name))
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.client = APIClient()

    def image(self, name):
        from io import BytesIO

        from PIL import Image

        buffer = BytesIO()
        Image.new("RGB", (1, 1), color="purple").save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_returns_per_page_background_and_image_replacements(self):
        appearance = PageAppearance.objects.create(
            page_path="/catalog",
            background_image=self.image("background.png"),
        )
        PageImageReplacement.objects.create(
            appearance=appearance,
            source_alt="Kacchi biryani|কাচ্চি বিরিয়ানি",
            image=self.image("replacement.png"),
        )

        response = self.client.get(
            "/api/v1/page-appearance/", {"path": "/catalog"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["background_image"],
            appearance.background_image.url,
        )
        self.assertEqual(len(response.data["image_replacements"]), 1)
        self.assertEqual(
            response.data["image_replacements"][0]["source_alt"],
            "Kacchi biryani|কাচ্চি বিরিয়ানি",
        )

    def test_missing_appearance_returns_empty_configuration(self):
        response = self.client.get(
            "/api/v1/page-appearance/", {"path": "/not-configured"}
        )

        self.assertEqual(
            response.data,
            {"background_image": None, "image_replacements": []},
        )

    def test_rejects_invalid_page_paths(self):
        for page_path in ("catalog", "//example.com", "/catalog?query=1"):
            with self.subTest(page_path=page_path):
                self.assertEqual(
                    self.client.get(
                        "/api/v1/page-appearance/", {"path": page_path}
                    ).status_code,
                    400,
                )
