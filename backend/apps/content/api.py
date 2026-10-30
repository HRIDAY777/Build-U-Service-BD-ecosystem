from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import FAQ, Page, PageAppearance


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ["slug", "title", "title_bn", "body", "body_bn", "description", "updated_at"]


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    throttle_classes = []
    serializer_class = PageSerializer
    lookup_field = "slug"
    queryset = Page.objects.filter(published=True).order_by("slug")


def _serialize_image_replacements(appearance: PageAppearance | None) -> list[dict]:
    if not appearance:
        return []
    items = []
    for rep in appearance.image_replacements.all():
        if not rep.active:
            continue
        url = rep.effective_image_url
        if not url:
            continue
        items.append(
            {
                "id": rep.id,
                "source_alt": rep.source_alt,
                "source_url": rep.source_url,
                "image": url,
            }
        )
    return items


def _serialize_text_replacements(appearance: PageAppearance | None) -> list[dict]:
    if not appearance:
        return []
    return [
        {
            "id": item.id,
            "source_text": item.source_text,
            "replacement_text": item.replacement_text,
        }
        for item in appearance.text_replacements.all()
        if item.active and item.source_text
    ]


def _serialize_videos(appearance: PageAppearance | None) -> list[dict]:
    if not appearance:
        return []
    return [
        {
            "id": v.id,
            "mode": v.mode,
            "position": v.position,
            "title": v.title,
            "title_bn": v.title_bn,
            "subtitle": v.subtitle,
            "subtitle_bn": v.subtitle_bn,
            "source_video_url": v.source_video_url,
            "video_url": v.video_url,
            "poster_url": v.poster_url,
            "autoplay": v.autoplay,
            "muted": v.muted,
            "loop": v.loop,
            "controls": v.controls,
        }
        for v in appearance.videos.all()
        if v.active and v.video_url
    ]


class PageAppearanceView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        page_path = request.query_params.get("path", "/")
        if page_path != "/*" and (
            len(page_path) > 500
            or not page_path.startswith("/")
            or page_path.startswith("//")
            or any(character in page_path for character in "?#\\")
        ):
            return Response(
                {"error": "Provide a valid page path."},
                status=400,
            )

        rows = list(
            PageAppearance.objects.prefetch_related(
                "image_replacements", "text_replacements", "videos"
            ).filter(page_path__in=["/*", page_path])
        )
        by_path = {row.page_path: row for row in rows}
        global_app = by_path.get("/*")
        page_app = by_path.get(page_path) if page_path != "/*" else None

        def pick_str(attr: str) -> str:
            if page_app and getattr(page_app, attr, "").strip():
                return getattr(page_app, attr).strip()
            if global_app and getattr(global_app, attr, "").strip():
                return getattr(global_app, attr).strip()
            return ""

        bg_image = (
            (page_app.effective_background_image if page_app else None)
            or (global_app.effective_background_image if global_app else None)
        )
        overlay = (
            page_app.background_overlay_opacity
            if (page_app and (page_app.effective_background_image or page_app.background_overlay_opacity))
            else (global_app.background_overlay_opacity if global_app else 0)
        )

        return Response(
            {
                "background_image": bg_image,
                "background_color": pick_str("background_color") or None,
                "background_overlay_opacity": overlay,
                "primary_color": pick_str("primary_color") or None,
                "secondary_color": pick_str("secondary_color") or None,
                "accent_color": pick_str("accent_color") or None,
                "text_color": pick_str("text_color") or None,
                "logo_url": pick_str("logo_url") or None,
                "announcement_text_bn": pick_str("announcement_text_bn") or None,
                "announcement_text_en": pick_str("announcement_text_en") or None,
                "image_replacements": _serialize_image_replacements(page_app)
                + _serialize_image_replacements(global_app),
                "text_replacements": _serialize_text_replacements(page_app)
                + _serialize_text_replacements(global_app),
                "videos": _serialize_videos(page_app) + _serialize_videos(global_app),
            }
        )


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "question", "question_bn", "answer", "answer_bn"]


class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    throttle_classes = []
    serializer_class = FAQSerializer
    queryset = FAQ.objects.filter(published=True)
