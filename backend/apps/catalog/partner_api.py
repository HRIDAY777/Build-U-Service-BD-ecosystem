from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from .service_schedule import validate_leave_dates
from .restaurant_rules import validate_weekly_hours
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.operations.models import InventoryMovement
from apps.operations.services import audit
from .models import Offering, Organization, FoodOptionGroup, FoodOption
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


class FoodChoiceEdit(serializers.Serializer):
    id = serializers.IntegerField(min_value=1, required=False)
    name = serializers.CharField(max_length=100)
    name_bn = serializers.CharField(max_length=100, allow_blank=True, default="")
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    active = serializers.BooleanField(default=True)


class FoodGroupEdit(serializers.Serializer):
    id = serializers.IntegerField(min_value=1, required=False)
    name = serializers.CharField(max_length=100)
    name_bn = serializers.CharField(max_length=100, allow_blank=True, default="")
    min_choices = serializers.IntegerField(min_value=0, max_value=20)
    max_choices = serializers.IntegerField(min_value=1, max_value=20)
    active = serializers.BooleanField(default=True)
    options = FoodChoiceEdit(many=True, max_length=40)

    def validate(self, data):
        if data["min_choices"] > data["max_choices"]:
            raise serializers.ValidationError("Minimum choices cannot exceed maximum choices.")
        if data["active"] and sum(option["active"] for option in data["options"]) < data["min_choices"]:
            raise serializers.ValidationError("Add enough active options for the required selection.")
        return data


def food_settings(offering):
    return [{"id": group.pk, "name": group.name, "name_bn": group.name_bn,
             "min_choices": group.min_choices, "max_choices": group.max_choices, "active": group.active,
             "options": [{"id": option.pk, "name": option.name, "name_bn": option.name_bn,
                          "price": str(option.price), "active": option.active} for option in group.options.all().order_by("id")]}
            for group in offering.food_option_groups.all().order_by("id")]


class ServiceScheduleInput(serializers.Serializer):
    weekly_hours = serializers.JSONField()
    leave_dates = serializers.JSONField()
    duration_minutes = serializers.IntegerField(min_value=1, max_value=1440)

    def validate_weekly_hours(self, value):
        try:
            validate_weekly_hours(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value

    def validate_leave_dates(self, value):
        try:
            validate_leave_dates(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value


class PartnerOfferingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OfferingSerializer

    def get_queryset(self):
        qs = Offering.objects.select_related("division", "organization").order_by("id")
        if self.request.user.has_perm("catalog.change_offering"):
            return qs
        return qs.filter(organization__owner=self.request.user, organization__approved=True)

    @action(detail=True, methods=["get", "put"])
    @transaction.atomic
    def service_schedule(self, request, pk=None):
        offering = self.get_object()
        offering = Offering.objects.select_for_update(of=("self",)).select_related("organization", "division").get(pk=offering.pk)
        if offering.division.kind != "service":
            raise ValidationError("Choose a service offering.")
        if not request.user.has_perm("catalog.change_offering") and (
            not offering.organization or not offering.organization.approved
            or offering.organization.owner_id != request.user.pk
        ):
            raise PermissionDenied()
        if request.method == "PUT":
            data = ServiceScheduleInput(data=request.data)
            data.is_valid(raise_exception=True)
            offering.service_weekly_hours = data.validated_data["weekly_hours"]
            offering.service_leave_dates = data.validated_data["leave_dates"]
            offering.duration_minutes = data.validated_data["duration_minutes"]
            offering.save(update_fields=["service_weekly_hours", "service_leave_dates", "duration_minutes", "updated_at"])
            audit(request.user, "service.schedule_updated", offering.pk)
        return Response({"weekly_hours": offering.service_weekly_hours,
                         "leave_dates": offering.service_leave_dates,
                         "duration_minutes": offering.duration_minutes, "timezone": "Asia/Dhaka"})

    @action(detail=True, methods=["get", "put"])
    @transaction.atomic
    def food_options(self, request, pk=None):
        offering = self.get_object()
        offering = Offering.objects.select_for_update().get(pk=offering.pk)
        if offering.division.slug != "food":
            raise ValidationError("Food options can only be configured for food items.")
        if not request.user.has_perm("catalog.change_offering") and (
            not offering.organization or not offering.organization.approved
            or offering.organization.owner_id != request.user.pk
        ):
            raise PermissionDenied()
        if request.method == "GET":
            return Response(food_settings(offering))
        payload = serializers.ListSerializer(child=FoodGroupEdit(), max_length=20, data=request.data)
        payload.is_valid(raise_exception=True)
        existing_groups = {group.pk: group for group in FoodOptionGroup.objects.select_for_update().filter(offering=offering).order_by("id")}
        existing_options = {option.pk: option for option in FoodOption.objects.select_for_update().filter(group_id__in=existing_groups).order_by("id")}
        group_ids, option_ids = set(), set()
        for data in payload.validated_data:
            group_id = data.get("id")
            if group_id and (group_id not in existing_groups or group_id in group_ids):
                raise ValidationError("Unsupported or duplicated food group.")
            group = existing_groups[group_id] if group_id else FoodOptionGroup(offering=offering)
            for field in ("name", "name_bn", "min_choices", "max_choices", "active"):
                setattr(group, field, data[field])
            group.save()
            group_ids.add(group.pk)
            for choice in data["options"]:
                choice_id = choice.get("id")
                if choice_id and (choice_id not in existing_options or choice_id in option_ids
                                  or existing_options[choice_id].group_id != group.pk):
                    raise ValidationError("Unsupported or duplicated food option.")
                option = existing_options[choice_id] if choice_id else FoodOption(group=group)
                for field in ("name", "name_bn", "price", "active"):
                    setattr(option, field, choice[field])
                option.save()
                option_ids.add(option.pk)
        FoodOptionGroup.objects.filter(offering=offering).exclude(pk__in=group_ids).update(active=False)
        FoodOption.objects.filter(group__offering=offering).exclude(pk__in=option_ids).update(active=False)
        audit(request.user, "food.options_updated", offering.pk, groups=len(group_ids), options=len(option_ids))
        return Response(food_settings(offering))

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
