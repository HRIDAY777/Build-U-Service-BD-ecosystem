from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny
from .models import Page, FAQ


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ["slug", "title", "title_bn", "body", "body_bn", "description", "updated_at"]


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = PageSerializer
    lookup_field = "slug"
    queryset = Page.objects.filter(published=True).order_by("slug")


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "question", "question_bn", "answer", "answer_bn"]


class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = FAQSerializer
    queryset = FAQ.objects.filter(published=True)
