from django.db.models import Prefetch, Q
from rest_framework import serializers, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import WishlistShare
from .wishlist import check_wishlist_alerts, offering_snapshot
from .models import Category, Division, Organization, Offering, ProductVariant, ServiceArea, WishlistItem, FoodOptionGroup, FoodOption, ShopBrand, ShopCollection, OfferingMedia


class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ["id", "slug", "name", "name_bn", "description", "description_bn", "kind"]


class ProductVariantSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "label", "attributes", "sku", "barcode", "price", "sale_price", "current_price", "stock"]
        read_only_fields = fields


class FoodOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodOption
        fields = ["id", "name", "name_bn", "price"]


class FoodOptionGroupSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = FoodOptionGroup
        fields = ["id", "name", "name_bn", "min_choices", "max_choices", "options"]

    def get_options(self, obj):
        choices = getattr(obj, "public_options", None)
        if choices is None:
            choices = obj.options.filter(active=True).order_by("id")
        return FoodOptionSerializer(choices, many=True).data


class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferingMedia
        fields = ["id", "kind", "url", "alt", "alt_bn"]


class OfferingSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True, default="")
    brand_name_bn = serializers.CharField(source="brand.name_bn", read_only=True, default="")
    media = serializers.SerializerMethodField()
    collections = serializers.SerializerMethodField()

    def get_media(self, obj):
        view = self.context.get("view")
        if obj.division.slug != "shop" or getattr(view, "action", None) != "retrieve":
            return []
        media = getattr(obj, "public_media", None)
        if media is None:
            media = obj.media.filter(active=True).filter(
                Q(url__startswith="https://")
                | Q(url__startswith="/images/")
                | Q(url__startswith="/videos/")
            )[:12]
        else:
            media = media[:12]
        return MediaSerializer(media, many=True).data

    def get_collections(self, obj):
        view = self.context.get("view")
        if obj.division.slug != "shop" or getattr(view, "action", None) != "retrieve":
            return []
        collections = getattr(obj, "public_collections", None)
        if collections is None:
            collections = obj.collections.filter(active=True).order_by("name", "pk")
        return [{"id": value.pk, "name": value.name, "name_bn": value.name_bn, "slug": value.slug} for value in collections]

    division_slug = serializers.CharField(source="division.slug", read_only=True)
    merchant = serializers.CharField(source="organization.name", read_only=True, default="U Service BD")
    variants = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    current_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    food_option_groups = serializers.SerializerMethodField()

    def get_food_option_groups(self, obj):
        if obj.division.slug != "food":
            return []
        groups = getattr(obj, "public_food_groups", None)
        if groups is None:
            groups = obj.food_option_groups.filter(active=True).prefetch_related(
                Prefetch("options", queryset=FoodOption.objects.filter(active=True).order_by("id"), to_attr="public_options")
            ).order_by("id")
        return FoodOptionGroupSerializer(groups, many=True).data

    def get_variants(self, obj):
        variants = getattr(obj, "active_variants", None)
        if variants is None:
            variants = obj.variants.filter(active=True).order_by("id")
        return ProductVariantSerializer(variants, many=True).data

    def get_stock(self, obj):
        variants = getattr(obj, "active_variants", None)
        if variants is None:
            variants = list(obj.variants.filter(active=True))
        return sum(variant.stock for variant in variants) if variants else obj.stock

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
            "sku",
            "barcode", "brand", "brand_name", "brand_name_bn", "collections", "media",
            "description",
            "description_bn",
            "price",
            "sale_price",
            "current_price",
            "stock",
            "prescription_required",
            "duration_minutes",
            "service_weekly_hours",
            "service_leave_dates",
            "image",
            "variants",
            "food_option_groups",
        ]


class DivisionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = DivisionSerializer
    queryset = Division.objects.filter(active=True).order_by("id")


class CategorySerializer(serializers.ModelSerializer):
    division_slug = serializers.CharField(source="division.slug", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "division_slug", "name", "name_bn", "parent"]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        qs = Category.objects.filter(division__active=True).select_related("division").order_by("name", "pk")
        if self.request.query_params.get("division"):
            qs = qs.filter(division__slug=self.request.query_params["division"])
        return qs


class CatalogFilters(serializers.Serializer):
    brand = serializers.IntegerField(min_value=1, required=False)
    collection = serializers.IntegerField(min_value=1, required=False)
    category = serializers.IntegerField(min_value=1, required=False)
    organization = serializers.IntegerField(min_value=1, required=False)
    min_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    max_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    in_stock = serializers.BooleanField(required=False)
    sort = serializers.ChoiceField(
        choices=["default", "price_asc", "price_desc", "name", "updated"], default="default"
    )

    def validate(self, data):
        if "min_price" in data and "max_price" in data and data["min_price"] > data["max_price"]:
            raise ValidationError("Minimum price cannot exceed maximum price.")
        return data


class OfferingViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = OfferingSerializer

    @action(detail=True, methods=["get"])
    def discovery(self, request, pk=None):
        from django.db.models import Count
        from apps.operations.models import OrderItem
        item = self.get_object()
        if item.division.slug != "shop":
            raise ValidationError("Product discovery is only available for U Shop.")
        raw = request.query_params.get("recent", "")
        pieces = raw.split(",") if raw else []
        if len(pieces) > 12 or any(not piece.isdigit() or len(piece) > 10 for piece in pieces):
            raise ValidationError("Choose up to 12 valid recently viewed product IDs.")
        recent_ids = list(dict.fromkeys(int(piece) for piece in pieces if int(piece) != item.pk))
        public = self.get_queryset().filter(division=item.division).exclude(pk=item.pk)
        recent_map = {product.pk: product for product in public.filter(pk__in=recent_ids)}
        recent = [recent_map[product_id] for product_id in recent_ids if product_id in recent_map]
        # Rank only fulfilled orders. Never return customer/order identities.
        available = public.filter(Q(variants__active=True, variants__stock__gt=0) | Q(variants__isnull=True, stock__gt=0)).distinct()
        popular_ids = list(OrderItem.objects.filter(
                               order__status="delivered",
                               offering_id__in=available.values("pk"),
                           )
                           .exclude(offering=item).values("offering_id").annotate(count=Count("order_id", distinct=True))
                           .order_by("-count", "offering_id").values_list("offering_id", flat=True)[:40])
        related = available.filter(category_id=item.category_id) if item.category_id else available.none()
        popular_map = {product.pk: product for product in available.filter(pk__in=popular_ids)}
        recommended = [popular_map[product_id] for product_id in popular_ids if product_id in popular_map][:4]
        if len(recommended) < 4:
            recommended += list(available.exclude(pk__in=[product.pk for product in recommended]).order_by("-updated_at", "id")[:4-len(recommended)])
        order_ids = OrderItem.objects.filter(offering=item, order__status="delivered").values("order_id")
        together_ids = list(OrderItem.objects.filter(
                                order_id__in=order_ids,
                                offering_id__in=available.values("pk"),
                            ).exclude(offering=item)
                            .values("offering_id").annotate(count=Count("order_id", distinct=True)).filter(count__gte=2)
                            .order_by("-count", "offering_id").values_list("offering_id", flat=True)[:20])
        together_map = {product.pk: product for product in available.filter(pk__in=together_ids)}
        together = [together_map[product_id] for product_id in together_ids if product_id in together_map][:4]
        return Response({
            "related": self.get_serializer(related[:4], many=True).data,
            "recommended": self.get_serializer(recommended, many=True).data,
            "bought_together": self.get_serializer(together, many=True).data,
            "recent": self.get_serializer(recent, many=True).data,
        }, headers={"Cache-Control": "no-store"})

    @action(detail=True, methods=["get"])
    def booking_times(self, request, pk=None):
        from datetime import timedelta
        from zoneinfo import ZoneInfo
        from django.utils import timezone
        from .service_schedule import suggested_appointments
        offering = self.get_object()
        if offering.division.kind != "service":
            raise ValidationError("Choose a service offering.")
        day = serializers.DateField().run_validation(request.query_params.get("date"))
        today = timezone.now().astimezone(ZoneInfo("Asia/Dhaka")).date()
        if not today <= day <= today + timedelta(days=90):
            raise ValidationError("Choose a date within the next 90 days.")
        result = suggested_appointments(offering, day)
        result.update({"date": day.isoformat(), "timezone": "Asia/Dhaka",
                       "duration_minutes": offering.duration_minutes, "requires_confirmation": True})
        return Response(result, headers={"Cache-Control": "no-store"})

    def get_queryset(self):
        qs = (
            Offering.objects.filter(active=True, division__active=True)
            .filter(Q(organization__isnull=True) | Q(organization__approved=True))
            .select_related("division", "organization", "brand")
            .prefetch_related(
                Prefetch("food_option_groups", queryset=FoodOptionGroup.objects.filter(active=True).prefetch_related(
                    Prefetch("options", queryset=FoodOption.objects.filter(active=True).order_by("id"), to_attr="public_options")
                ).order_by("id"), to_attr="public_food_groups"),
                Prefetch(
                    "variants",
                    queryset=ProductVariant.objects.filter(active=True).order_by("id"),
                    to_attr="active_variants",
                ),
            )
            .order_by("id")
        )
        if getattr(self, "action", None) == "retrieve":
            qs = qs.prefetch_related(
                Prefetch(
                    "media",
                    queryset=OfferingMedia.objects.filter(active=True)
                    .filter(
                        Q(url__startswith="https://")
                        | Q(url__startswith="/images/")
                        | Q(url__startswith="/videos/")
                    )
                    .order_by("position", "pk"),
                    to_attr="public_media",
                ),
                Prefetch(
                    "collections",
                    queryset=ShopCollection.objects.filter(active=True).order_by(
                        "name", "pk"
                    ),
                    to_attr="public_collections",
                ),
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
                | Q(sku__icontains=term)
                | Q(barcode=term)
                | Q(variants__active=True, variants__barcode=term)
            ).distinct()
        filters = CatalogFilters(
            data={key: value for key, value in self.request.query_params.items() if value != ""}
        )
        filters.is_valid(raise_exception=True)
        values = filters.validated_data
        if "organization" in values:
            qs = qs.filter(organization_id=values["organization"])
        if "category" in values:
            qs = qs.filter(Q(category_id=values["category"]) | Q(category__parent_id=values["category"]), category__division__active=True)
        if "brand" in values:
            qs = qs.filter(brand_id=values["brand"], brand__active=True)
        if "collection" in values:
            qs = qs.filter(collections__pk=values["collection"], collections__active=True)
        if "min_price" in values:
            qs = qs.filter(price__gte=values["min_price"])
        if "max_price" in values:
            qs = qs.filter(price__lte=values["max_price"])
        if values.get("in_stock"):
            qs = qs.filter(
                Q(division__kind="service")
                | Q(variants__active=True, variants__stock__gt=0)
                | Q(variants__isnull=True, stock__gt=0)
            ).distinct()
        ordering = {
            "default": "id",
            "price_asc": "price",
            "price_desc": "-price",
            "name": "name",
            "updated": "-updated_at",
        }
        return qs.order_by(ordering[values["sort"]], "pk")


class WishlistSerializer(serializers.ModelSerializer):
    offering_detail = OfferingSerializer(source="offering", read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "offering", "offering_detail", "created_at", "price_alert", "restock_alert"]
        read_only_fields = ["id", "created_at", "offering_detail"]

    def validate_offering(self, value):
        if self.instance and value.pk != self.instance.offering_id:
            raise serializers.ValidationError("Remove this item and save the new offering separately.")
        if (
            not value.active
            or not value.division.active
            or (value.organization_id and not value.organization.approved)
        ):
            raise serializers.ValidationError("This offering is unavailable.")
        return value


class WishlistViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related(
            "offering", "offering__division"
        )

    def perform_create(self, serializer):
        price, stock = offering_snapshot(serializer.validated_data["offering"])
        item, created = WishlistItem.objects.get_or_create(
            user=self.request.user,
            offering=serializer.validated_data["offering"],
            defaults={
                "observed_price": price,
                "observed_stock": stock,
                "price_alert": serializer.validated_data.get("price_alert", False),
                "restock_alert": serializer.validated_data.get("restock_alert", False),
            },
        )
        if not created:
            raise ValidationError({"offering": "This item is already in your wishlist."})
        serializer.instance = item

    def list(self, request, *args, **kwargs):
        check_wishlist_alerts(request.user)
        return super().list(request, *args, **kwargs)

    @transaction.atomic
    def perform_update(self, serializer):
        item = WishlistItem.objects.select_for_update().get(pk=serializer.instance.pk)
        serializer.instance = item
        price, stock = offering_snapshot(item.offering)
        if serializer.validated_data.get("price_alert") and not item.price_alert:
            item.observed_price = price
        if serializer.validated_data.get("restock_alert") and not item.restock_alert:
            item.observed_stock = stock
        serializer.save()

    @action(detail=False, methods=["post", "delete"])
    def share(self, request):
        if request.method == "DELETE":
            WishlistShare.objects.filter(user=request.user).delete()
            return Response(status=204)
        share, _ = WishlistShare.objects.get_or_create(user=request.user)
        return Response({"path": f"/wishlist/shared/{share.token}"})


class SharedWishlistView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        share = get_object_or_404(WishlistShare, token=token, user__is_active=True)
        offerings = (
            Offering.objects.filter(wishlist_items__user=share.user, active=True, division__active=True)
            .filter(Q(organization__isnull=True) | Q(organization__approved=True))
            .select_related("division", "organization")
            .order_by("id")
        )
        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(offerings, request)
        response = paginator.get_paginated_response(OfferingSerializer(page, many=True).data)
        response["Cache-Control"] = "no-store"
        return response


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ["id", "name", "name_bn", "district", "delivery_fee", "divisions"]


class AreaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = AreaSerializer
    queryset = ServiceArea.objects.filter(active=True).prefetch_related("divisions").order_by("id")

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("division"):
            qs = qs.filter(divisions__slug=self.request.query_params["division"], divisions__active=True)
        return qs.distinct()


class OrganizationSerializer(serializers.ModelSerializer):
    ordering_status = serializers.SerializerMethodField()
    division_name = serializers.CharField(source="division.name", read_only=True)
    division_name_bn = serializers.CharField(source="division.name_bn", read_only=True)
    division_slug = serializers.CharField(source="division.slug", read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "division",
            "division_name",
            "division_name_bn",
            "division_slug",
            "area",
            "address",
            "description",
            "opening_hours",
            "accepting_orders", "weekly_hours", "minimum_order", "preparation_minutes", "ordering_status",
        ]

    def get_ordering_status(self, obj):
        from .restaurant_rules import restaurant_status
        return restaurant_status(obj)


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        qs = (
            Organization.objects.filter(approved=True, division__active=True)
            .select_related("division")
            .order_by("name", "pk")
        )
        if self.request.query_params.get("division"):
            qs = qs.filter(division__slug=self.request.query_params["division"])
        if self.request.query_params.get("q"):
            term = self.request.query_params["q"][:150]
            qs = qs.filter(Q(name__icontains=term) | Q(area__icontains=term) | Q(address__icontains=term))
        if self.request.query_params.get("area"):
            qs = qs.filter(area__icontains=self.request.query_params["area"][:100])
        return qs

class ShopBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopBrand
        fields = ["id", "name", "name_bn"]


class ShopBrandViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = ShopBrandSerializer
    pagination_class = None
    queryset = ShopBrand.objects.filter(active=True).order_by("name", "pk")


class ShopCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopCollection
        fields = ["id", "name", "name_bn", "slug"]


class ShopCollectionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = ShopCollectionSerializer
    pagination_class = None
    queryset = ShopCollection.objects.filter(active=True).order_by("name", "pk")
