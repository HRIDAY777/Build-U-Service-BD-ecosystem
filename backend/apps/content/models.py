import os
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator
from django.db import models


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}


def validate_site_image_size(image):
    if image.size > 10 * 1024 * 1024:
        raise ValidationError("Site images must be no larger than 10 MB.")
    ext = os.path.splitext(image.name or "")[1].lower()
    if ext and ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError("Supported image formats: JPG, PNG, WEBP, GIF.")


def validate_site_media_file(file_obj):
    ext = os.path.splitext(file_obj.name or "")[1].lower()
    if ext in ALLOWED_IMAGE_EXTENSIONS:
        if file_obj.size > 10 * 1024 * 1024:
            raise ValidationError("Images must be no larger than 10 MB.")
        return
    if ext in ALLOWED_VIDEO_EXTENSIONS:
        if file_obj.size > 60 * 1024 * 1024:
            raise ValidationError("Videos must be no larger than 60 MB.")
        return
    raise ValidationError(
        "Unsupported file format. Upload JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV."
    )


class SiteMediaAsset(models.Model):
    KINDS = [
        ("image", "Image"),
        ("video", "Video"),
    ]
    title = models.CharField(max_length=180, blank=True)
    kind = models.CharField(max_length=16, choices=KINDS, default="image")
    file = models.FileField(
        upload_to="site-appearance/library/%Y/%m/",
        validators=[validate_site_media_file],
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title or self.file.name


class PageAppearance(models.Model):
    page_path = models.CharField(
        max_length=500,
        unique=True,
        help_text="Exact page path starting with /. Use /* for global website settings and / for homepage.",
    )
    background_image = models.ImageField(
        upload_to="site-appearance/backgrounds/",
        blank=True,
        validators=[validate_site_image_size],
    )
    background_url = models.CharField(
        max_length=1000,
        blank=True,
        help_text="Optional URL or /media/ path for the page background image.",
    )
    background_color = models.CharField(
        max_length=120,
        blank=True,
        help_text="Solid hex color (e.g. #ffffff) or CSS gradient.",
    )
    background_overlay_opacity = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(95)],
        help_text="White readability tint (0-95%) over background image.",
    )
    primary_color = models.CharField(max_length=40, blank=True)
    secondary_color = models.CharField(max_length=40, blank=True)
    accent_color = models.CharField(max_length=40, blank=True)
    text_color = models.CharField(max_length=40, blank=True)
    logo_url = models.CharField(max_length=1000, blank=True)
    announcement_text_bn = models.CharField(max_length=300, blank=True)
    announcement_text_en = models.CharField(max_length=300, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["page_path"]
        verbose_name = "Page appearance"
        verbose_name_plural = "Page appearances"

    def clean(self):
        super().clean()
        if self.page_path == "/*":
            return
        if (
            not self.page_path.startswith("/")
            or self.page_path.startswith("//")
            or any(character in self.page_path for character in "?#\\")
        ):
            raise ValidationError(
                {"page_path": "Enter a page path starting with /, without a query or fragment (or /* for global)."}
            )

    @property
    def effective_background_image(self) -> str | None:
        if self.background_url.strip():
            return self.background_url.strip()
        if self.background_image:
            return self.background_image.url
        return None

    def __str__(self):
        return self.page_path


class PageImageReplacement(models.Model):
    appearance = models.ForeignKey(
        PageAppearance,
        on_delete=models.CASCADE,
        related_name="image_replacements",
    )
    source_alt = models.CharField(
        max_length=300,
        blank=True,
        help_text="Match the existing image's alt text. Use | between language variants.",
    )
    source_url = models.CharField(
        max_length=1000,
        blank=True,
        help_text="Optional: also match the existing image URL or path.",
    )
    image = models.ImageField(
        upload_to="site-appearance/replacements/",
        blank=True,
        validators=[validate_site_image_size],
    )
    replacement_url = models.CharField(
        max_length=1000,
        blank=True,
        help_text="Optional URL or /media/ path for the replacement image.",
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

    @property
    def effective_image_url(self) -> str:
        if self.replacement_url.strip():
            return self.replacement_url.strip()
        if self.image:
            return self.image.url
        return ""

    def clean(self):
        super().clean()
        if not self.source_alt.strip() and not self.source_url.strip():
            raise ValidationError(
                "Enter the existing image's alt text, URL, or both."
            )
        if not self.replacement_url.strip() and not self.image:
            raise ValidationError(
                "Upload a replacement image or provide a replacement image URL."
            )

    def __str__(self):
        return self.source_alt or self.source_url


class PageTextReplacement(models.Model):
    appearance = models.ForeignKey(
        PageAppearance,
        on_delete=models.CASCADE,
        related_name="text_replacements",
    )
    source_text = models.TextField(help_text="Original text currently shown on the website.")
    replacement_text = models.TextField(help_text="New text to display instead.")
    note = models.CharField(max_length=160, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.source_text[:40]} -> {self.replacement_text[:40]}"


class PageVideoBlock(models.Model):
    MODES = [
        ("banner", "Page Video Showcase"),
        ("replace", "Replace Existing Video"),
    ]
    POSITIONS = [
        ("top", "Top of Page (Hero)"),
        ("bottom", "Bottom of Page"),
    ]
    appearance = models.ForeignKey(
        PageAppearance,
        on_delete=models.CASCADE,
        related_name="videos",
    )
    mode = models.CharField(max_length=20, choices=MODES, default="banner")
    position = models.CharField(max_length=20, choices=POSITIONS, default="top")
    title = models.CharField(max_length=200, blank=True)
    title_bn = models.CharField(max_length=200, blank=True)
    subtitle = models.CharField(max_length=400, blank=True)
    subtitle_bn = models.CharField(max_length=400, blank=True)
    source_video_url = models.CharField(max_length=1000, blank=True)
    video_url = models.CharField(max_length=1000)
    poster_url = models.CharField(max_length=1000, blank=True)
    autoplay = models.BooleanField(default=False)
    muted = models.BooleanField(default=True)
    loop = models.BooleanField(default=False)
    controls = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.title_bn or self.title or self.video_url


class Page(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=180)
    title_bn = models.CharField(max_length=180)
    body = models.TextField()
    body_bn = models.TextField(blank=True)
    description = models.CharField(max_length=300)
    published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class FAQ(models.Model):
    question = models.CharField(max_length=250)
    question_bn = models.CharField(max_length=250)
    answer = models.TextField()
    answer_bn = models.TextField()
    published = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
