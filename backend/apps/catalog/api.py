from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny
from .models import Division, Organization, Offering, ServiceArea


class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ["id", "slug", "name", "name_bn", "description", "description_bn", "kind"]


class OfferingSerializer(serializers.ModelSerializer):
    division_slug = serializers.CharField(source="division.slug", read_only=True)
    merchant = serializers.CharField(source="organization.name", read_only=True, default="U Service BD")

    class Meta:
        model = Offering
        fields = [
            "id",
            "division",
            "division_slug",
            "organization",
            "merchant",
            "name",
            "name_bn",
            "slug",
            "description",
            "description_bn",
            "price",
            "stock",
            "prescription_required",
            "duration_minutes",
            "image",
        ]


class DivisionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = DivisionSerializer
    queryset = Division.objects.filter(active=True).order_by("id")


class OfferingViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = OfferingSerializer

    def get_queryset(self):
        qs = (
            Offering.objects.filter(active=True, division__active=True)
            .filter(Q(organization__isnull=True) | Q(organization__approved=True))
            .select_related("division", "organization")
            .order_by("id")
        )
        if self.request.query_params.get("division"):
            qs = qs.filter(division__slug=self.request.query_params["division"])
        if self.request.query_params.get("q"):
            term = self.request.query_params["q"][:150]
            qs = qs.filter(
                Q(name__icontains=term)
                | Q(name_bn__icontains=term)
                | Q(description__icontains=term)
                | Q(description_bn__icontains=term)
            )
        return qs


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ["id", "name", "name_bn", "district", "delivery_fee", "divisions"]


class AreaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = AreaSerializer
    queryset = ServiceArea.objects.filter(active=True).prefetch_related("divisions").order_by("id")


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "division", "area", "description", "opening_hours"]


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.filter(approved=True).order_by("id")
