from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from .service_schedule import validate_leave_dates
from .restaurant_rules import validate_weekly_hours
from django.db import transaction
from django.db.models import Prefetch
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.operations.models import InventoryMovement
from apps.operations.services import audit
from .models import (
    Category,
    FoodOption,
    FoodOptionGroup,
    Offering,
    OfferingMedia,
    Organization,
    ProductVariant,
    ShopBrand,
    ShopCollection,
)
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


class ShopDetailsEdit(serializers.Serializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.select_related("division"),
        allow_null=True,
        required=False,
    )
    brand = serializers.PrimaryKeyRelatedField(
        queryset=ShopBrand.objects.filter(active=True),
        allow_null=True,
        required=False,
    )
    collections = serializers.PrimaryKeyRelatedField(
        queryset=ShopCollection.objects.filter(active=True),
        many=True,
        required=False,
    )
    barcode = serializers.CharField(max_length=80, allow_blank=True, required=False)
    name = serializers.CharField(max_length=180, required=False)
    name_bn = serializers.CharField(max_length=180, required=False)
    description = serializers.CharField(max_length=5000, required=False)
    description_bn = serializers.CharField(
        max_length=5000, allow_blank=True, required=False
    )
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False
    )
    sale_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
        allow_null=True,
        required=False,
    )
    cost_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
        allow_null=True,
        required=False,
    )
    image = serializers.CharField(max_length=1000, allow_blank=True, required=False)
    active = serializers.BooleanField(required=False)

    def validate(self, data):
        offering = self.context["offering"]
        category = data.get("category")
        if category and category.division_id != offering.division_id:
            raise serializers.ValidationError(
                {"category": "Choose a category from this product division."}
            )
        return data


class ShopVariantEdit(serializers.Serializer):
    id = serializers.IntegerField(min_value=1, required=False)
    label = serializers.CharField(max_length=120)
    attributes = serializers.JSONField(default=dict)
    sku = serializers.CharField(max_length=80)
    barcode = serializers.CharField(max_length=80, allow_blank=True, default="")
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    sale_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, allow_null=True, default=None
    )
    cost_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, allow_null=True, default=None
    )
    stock = serializers.IntegerField(min_value=0, max_value=1000000)
    active = serializers.BooleanField(default=True)

    def validate_attributes(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Attributes must be an object.")
        if len(value) > 20:
            raise serializers.ValidationError("Use up to 20 variant attributes.")
        return value


class ShopMediaEdit(serializers.Serializer):
    id = serializers.IntegerField(min_value=1, required=False)
    kind = serializers.ChoiceField(choices=["image", "video"])
    url = serializers.CharField(max_length=1000)
    alt = serializers.CharField(max_length=180, allow_blank=True, default="")
    alt_bn = serializers.CharField(max_length=180, allow_blank=True, default="")
    position = serializers.IntegerField(min_value=0, max_value=32767, default=0)
    active = serializers.BooleanField(default=True)


class StockInput(serializers.Serializer):
    delta = serializers.IntegerField(min_value=-100000, max_value=100000)
    reason = serializers.CharField(max_length=100)
    variant_id = serializers.IntegerField(min_value=1, allow_null=True, required=False)


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


def ensure_shop_product(offering):
    if offering.division.slug != "shop":
        raise ValidationError("U Shop product management is only available for U Shop.")


def validate_model(instance):
    try:
        instance.full_clean()
    except DjangoValidationError as error:
        detail = getattr(error, "message_dict", None) or error.messages
        raise ValidationError(detail) from error


def shop_details_data(offering):
    return {
        "id": offering.pk,
        "category": offering.category_id,
        "brand": offering.brand_id,
        "collections": list(
            offering.collections.filter(active=True)
            .order_by("name", "pk")
            .values_list("pk", flat=True)
        ),
        "barcode": offering.barcode,
        "name": offering.name,
        "name_bn": offering.name_bn,
        "description": offering.description,
        "description_bn": offering.description_bn,
        "price": str(offering.price),
        "sale_price": str(offering.sale_price) if offering.sale_price is not None else None,
        "cost_price": str(offering.cost_price) if offering.cost_price is not None else None,
        "image": offering.image,
        "active": offering.active,
    }


def shop_variants_data(offering):
    return [
        {
            "id": variant.pk,
            "label": variant.label,
            "attributes": variant.attributes,
            "sku": variant.sku,
            "barcode": variant.barcode,
            "price": str(variant.price),
            "sale_price": str(variant.sale_price)
            if variant.sale_price is not None
            else None,
            "cost_price": str(variant.cost_price)
            if variant.cost_price is not None
            else None,
            "stock": variant.stock,
            "active": variant.active,
        }
        for variant in offering.variants.all().order_by("id")
    ]


def shop_media_data(offering):
    return [
        {
            "id": media.pk,
            "kind": media.kind,
            "url": media.url,
            "alt": media.alt,
            "alt_bn": media.alt_bn,
            "position": media.position,
            "active": media.active,
        }
        for media in offering.media.all().order_by("position", "pk")
    ]


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
        qs = (
            Offering.objects.select_related("division", "organization", "brand")
            .prefetch_related(
                Prefetch(
                    "variants",
                    queryset=ProductVariant.objects.filter(active=True).order_by("id"),
                    to_attr="active_variants",
                )
            )
            .order_by("id")
        )
        if self.request.user.has_perm("catalog.change_offering"):
            return qs
        return qs.filter(organization__owner=self.request.user, organization__approved=True)

    @action(detail=True, methods=["get", "patch"], url_path="shop-details")
    @transaction.atomic
    def shop_details(self, request, pk=None):
        scoped = self.get_object()
        ensure_shop_product(scoped)
        offering = (
            Offering.objects.select_for_update(of=("self",))
            .select_related("division", "brand", "category")
            .get(pk=scoped.pk)
        )
        if request.method == "GET":
            return Response(shop_details_data(offering))
        serializer = ShopDetailsEdit(
            data=request.data,
            partial=True,
            context={"offering": offering},
        )
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        collections = values.pop("collections", None)
        before = {
            key: str(getattr(offering, key))
            for key in values
        }
        for key, value in values.items():
            setattr(offering, key, value)
        validate_model(offering)
        if values:
            offering.save(update_fields=[*values.keys(), "updated_at"])
        if collections is not None:
            offering.collections.set(collections)
        audit(
            request.user,
            "shop.product_updated",
            offering.pk,
            before=before,
            fields=[*values.keys(), *(["collections"] if collections is not None else [])],
        )
        return Response(shop_details_data(offering))

    @action(detail=True, methods=["get", "put"], url_path="shop-variants")
    @transaction.atomic
    def shop_variants(self, request, pk=None):
        scoped = self.get_object()
        ensure_shop_product(scoped)
        offering = Offering.objects.select_for_update().select_related("division").get(
            pk=scoped.pk
        )
        if request.method == "GET":
            return Response(shop_variants_data(offering))
        payload = serializers.ListSerializer(
            child=ShopVariantEdit(), max_length=50, data=request.data
        )
        payload.is_valid(raise_exception=True)
        rows = payload.validated_data
        for field in ("label", "sku", "barcode"):
            values = [row[field] for row in rows if row.get(field)]
            if len(values) != len(set(values)):
                raise ValidationError({field: f"Duplicate {field} values are not allowed."})
        existing = {
            variant.pk: variant
            for variant in ProductVariant.objects.select_for_update()
            .filter(offering=offering)
            .order_by("id")
        }
        kept = set()
        changed_stock = 0
        for row in rows:
            variant_id = row.get("id")
            if variant_id and (variant_id not in existing or variant_id in kept):
                raise ValidationError("Unsupported or duplicated product variant.")
            variant = existing[variant_id] if variant_id else ProductVariant(offering=offering)
            old_stock = variant.stock if variant.pk else 0
            for field in (
                "label",
                "attributes",
                "sku",
                "barcode",
                "price",
                "sale_price",
                "cost_price",
                "stock",
                "active",
            ):
                setattr(variant, field, row[field])
            validate_model(variant)
            variant.save()
            kept.add(variant.pk)
            delta = variant.stock - old_stock
            if delta:
                InventoryMovement.objects.create(
                    offering=offering,
                    variant=variant,
                    delta=delta,
                    reason="partner_variant_sync",
                )
                changed_stock += 1
        ProductVariant.objects.filter(offering=offering).exclude(pk__in=kept).update(
            active=False
        )
        audit(
            request.user,
            "shop.variants_updated",
            offering.pk,
            variants=len(kept),
            stock_movements=changed_stock,
        )
        return Response(shop_variants_data(offering))

    @action(detail=True, methods=["get", "put"], url_path="shop-media")
    @transaction.atomic
    def shop_media(self, request, pk=None):
        scoped = self.get_object()
        ensure_shop_product(scoped)
        offering = Offering.objects.select_for_update().select_related("division").get(
            pk=scoped.pk
        )
        if request.method == "GET":
            return Response(shop_media_data(offering))
        payload = serializers.ListSerializer(
            child=ShopMediaEdit(), max_length=12, data=request.data
        )
        payload.is_valid(raise_exception=True)
        existing = {
            media.pk: media
            for media in OfferingMedia.objects.select_for_update()
            .filter(offering=offering)
            .order_by("id")
        }
        kept = set()
        for row in payload.validated_data:
            media_id = row.get("id")
            if media_id and (media_id not in existing or media_id in kept):
                raise ValidationError("Unsupported or duplicated product media.")
            media = existing[media_id] if media_id else OfferingMedia(offering=offering)
            for field in ("kind", "url", "alt", "alt_bn", "position", "active"):
                setattr(media, field, row[field])
            validate_model(media)
            media.save()
            kept.add(media.pk)
        OfferingMedia.objects.filter(offering=offering).exclude(pk__in=kept).update(
            active=False
        )
        audit(
            request.user,
            "shop.media_updated",
            offering.pk,
            media=len(kept),
        )
        return Response(shop_media_data(offering))

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
            variant_id = serializer.validated_data.get("variant_id")
            variants = ProductVariant.objects.select_for_update().filter(
                offering=offering, active=True
            )
            if variants.exists():
                if not variant_id:
                    raise ValidationError(
                        {"variant_id": "Choose a variant for this product."}
                    )
                variant = variants.filter(pk=variant_id).first()
                if not variant:
                    raise ValidationError(
                        {"variant_id": "Choose an active variant from this product."}
                    )
                if variant.stock + delta < 0:
                    raise ValidationError("Stock cannot be negative.")
                variant.stock += delta
                variant.save(update_fields=["stock"])
                InventoryMovement.objects.create(
                    offering=offering,
                    variant=variant,
                    delta=delta,
                    reason=serializer.validated_data["reason"],
                )
            else:
                if variant_id:
                    raise ValidationError(
                        {"variant_id": "This product does not use active variants."}
                    )
                if offering.stock+delta<0:
                    raise ValidationError("Stock cannot be negative.")
                offering.stock+=delta
                offering.save(update_fields=["stock"])
                variant = None
                InventoryMovement.objects.create(
                    offering=offering,
                    delta=delta,
                    reason=serializer.validated_data["reason"],
                )
            audit(
                request.user,
                "inventory.adjusted",
                offering.pk,
                delta=delta,
                variant_id=variant.pk if variant else None,
                reason=serializer.validated_data["reason"],
            )
        return Response(self.get_serializer(offering).data)
