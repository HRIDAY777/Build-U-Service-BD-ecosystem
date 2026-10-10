from decimal import Decimal
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.operations.models import InventoryMovement
from apps.operations.services import audit
from .models import Offering, Organization
from .api import OfferingSerializer, OrganizationSerializer


class RestaurantSettingsSerializer(OrganizationSerializer):
    class Meta(OrganizationSerializer.Meta):
        read_only_fields = [field for field in OrganizationSerializer.Meta.fields if field not in {
            "accepting_orders", "weekly_hours", "minimum_order", "preparation_minutes",
        }]


class PartnerRestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RestaurantSettingsSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = Organization.objects.filter(approved=True, division__slug="food", division__active=True).select_related("division").order_by("name", "pk")
        return qs if self.request.user.has_perm("catalog.change_organization") else qs.filter(owner=self.request.user)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        restaurant = self.get_object()
        restaurant = Organization.objects.select_for_update().get(pk=restaurant.pk)
        if not restaurant.approved or not restaurant.division.active or restaurant.division.slug != "food":
            raise PermissionDenied()
        if restaurant.owner_id != request.user.pk and not request.user.has_perm("catalog.change_organization"):
            raise PermissionDenied()
        serializer = self.get_serializer(restaurant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        before = {key: str(getattr(restaurant, key)) for key in serializer.validated_data}
        serializer.save()
        audit(request.user, "restaurant.settings_updated", restaurant.pk, before=before,
              after={key: str(value) for key, value in serializer.validated_data.items()})
        return Response(serializer.data)


class OfferingEdit(serializers.Serializer):
    name = serializers.CharField(max_length=180, required=False)
    name_bn = serializers.CharField(max_length=180, required=False)
    description = serializers.CharField(max_length=5000, required=False)
    description_bn = serializers.CharField(max_length=5000, required=False)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False)
    active = serializers.BooleanField(required=False)


class StockInput(serializers.Serializer):
    delta = serializers.IntegerField(min_value=-100000, max_value=100000)
    reason = serializers.CharField(max_length=100)


class PartnerOfferingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OfferingSerializer

    def get_queryset(self):
        qs = Offering.objects.select_related("division", "organization").order_by("id")
        if self.request.user.has_perm("catalog.change_offering"):
            return qs
        return qs.filter(organization__owner=self.request.user, organization__approved=True)

    def partial_update(self, request, pk=None):
        offering = self.get_object()
        serializer = OfferingEdit(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            offering = Offering.objects.select_for_update().get(pk=offering.pk)
            before = {key:str(getattr(offering,key)) for key in serializer.validated_data}
            for key,value in serializer.validated_data.items():
                setattr(offering,key,value)
            offering.save()
            audit(request.user,"offering.updated",offering.pk,before=before,after={key:str(value) for key,value in serializer.validated_data.items()})
        return Response(self.get_serializer(offering).data)

    @action(detail=True,methods=["post"])
    def stock(self,request,pk=None):
        offering = self.get_object()
        serializer = StockInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            offering = Offering.objects.select_for_update().get(pk=offering.pk)
            delta=serializer.validated_data["delta"]
            if offering.stock+delta<0:
                raise ValidationError("Stock cannot be negative.")
            offering.stock+=delta
            offering.save(update_fields=["stock"])
            InventoryMovement.objects.create(offering=offering,delta=delta,reason=serializer.validated_data["reason"])
            audit(request.user,"inventory.adjusted",offering.pk,delta=delta,reason=serializer.validated_data["reason"])
        return Response(self.get_serializer(offering).data)
