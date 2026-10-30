import os
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q, Sum
from django.utils.text import slugify
from rest_framework import serializers, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AccountDeletionRequest
from apps.catalog.models import (
    Category,
    Division,
    Offering,
    Organization,
    PartnerApplication,
    ServiceArea,
    ShopBrand,
    ShopCollection,
    validate_public_media_url,
)
from apps.content.models import (
    ALLOWED_VIDEO_EXTENSIONS,
    FAQ,
    Page,
    PageAppearance,
    PageImageReplacement,
    PageTextReplacement,
    PageVideoBlock,
    SiteMediaAsset,
)
from apps.engagement.models import Lead, LoyaltyReward, Notification, Review, SupportTicket
from apps.engagement.project_models import ManagedProject, ProjectApplication
from apps.operations.models import (
    AuditLog,
    Booking,
    Coupon,
    DeliveryRequest,
    EventRequest,
    Order,
    PaymentGateway,
    ProviderProfile,
    ReturnRequest,
    RiderProfile,
)

User = get_user_model()


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


def record_admin_audit(actor, action: str, entity: str, metadata: dict | None = None):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity=entity,
        metadata=metadata or {},
    )


class AuditedAdminModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsPlatformAdmin]
    throttle_classes = []
    pagination_class = None
    audit_entity = "system"

    def perform_create(self, serializer):
        instance = serializer.save()
        record_admin_audit(
            self.request.user,
            f"admin.{self.audit_entity}.created",
            f"{self.audit_entity}:{instance.pk}",
            {"repr": str(instance)[:160]},
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        record_admin_audit(
            self.request.user,
            f"admin.{self.audit_entity}.updated",
            f"{self.audit_entity}:{instance.pk}",
            {"repr": str(instance)[:160]},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        label = str(instance)[:160]
        instance.delete()
        record_admin_audit(
            self.request.user,
            f"admin.{self.audit_entity}.deleted",
            f"{self.audit_entity}:{pk}",
            {"repr": label},
        )


class AdminOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]
    throttle_classes = []

    def get(self, request):
        paid_revenue = (
            Order.objects.filter(payment_status="paid").aggregate(total=Sum("total"))["total"]
            or Decimal("0.00")
        )
        total_order_value = (
            Order.objects.exclude(status__in=["cancelled", "rejected"]).aggregate(total=Sum("total"))["total"]
            or Decimal("0.00")
        )
        return Response(
            {
                "users_total": User.objects.count(),
                "users_staff": User.objects.filter(is_staff=True).count(),
                "divisions_total": Division.objects.count(),
                "divisions_active": Division.objects.filter(active=True).count(),
                "categories_total": Category.objects.count(),
                "offerings_total": Offering.objects.count(),
                "offerings_active": Offering.objects.filter(active=True).count(),
                "shop_products": Offering.objects.filter(division__slug="shop").count(),
                "organizations_total": Organization.objects.count(),
                "organizations_approved": Organization.objects.filter(approved=True).count(),
                "orders_total": Order.objects.count(),
                "orders_pending": Order.objects.filter(status__in=["placed", "accepted", "preparing"]).count(),
                "paid_revenue": str(paid_revenue),
                "gross_order_value": str(total_order_value),
                "bookings_total": Booking.objects.count(),
                "bookings_active": Booking.objects.exclude(status__in=["completed", "cancelled", "failed"]).count(),
                "deliveries_total": DeliveryRequest.objects.count(),
                "events_total": EventRequest.objects.count(),
                "returns_pending": ReturnRequest.objects.filter(status="requested").count(),
                "gateways_total": PaymentGateway.objects.count(),
                "gateways_active": PaymentGateway.objects.filter(active=True).count(),
                "coupons_active": Coupon.objects.filter(active=True).count(),
                "projects_total": ManagedProject.objects.count(),
                "projects_published": ManagedProject.objects.filter(published=True).count(),
                "project_applications": ProjectApplication.objects.count(),
                "partner_applications_pending": PartnerApplication.objects.filter(status__in=["submitted", "reviewing"]).count(),
                "tickets_open": SupportTicket.objects.exclude(status__in=["resolved", "closed"]).count(),
                "leads_new": Lead.objects.filter(status="new").count(),
                "reviews_total": Review.objects.count(),
                "pages_total": Page.objects.count(),
                "faqs_total": FAQ.objects.count(),
                "areas_total": ServiceArea.objects.count(),
                "deletion_requests_pending": AccountDeletionRequest.objects.filter(status="pending").count(),
            }
        )


# 1. Divisions, Categories, Brands & Collections
class AdminDivisionSerializer(serializers.ModelSerializer):
    offerings_count = serializers.IntegerField(source="offering_set.count", read_only=True)

    class Meta:
        model = Division
        fields = [
            "id",
            "slug",
            "name",
            "name_bn",
            "description",
            "description_bn",
            "kind",
            "active",
            "offerings_count",
        ]


class AdminDivisionViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminDivisionSerializer
    queryset = Division.objects.all().order_by("id")
    audit_entity = "division"


class AdminCategorySerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source="division.name", read_only=True)
    division_slug = serializers.CharField(source="division.slug", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "division", "division_name", "division_slug", "name", "name_bn", "parent"]


class AdminCategoryViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.select_related("division").order_by("division_id", "name", "id")
    audit_entity = "category"


class AdminShopBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopBrand
        fields = ["id", "name", "name_bn", "active"]


class AdminShopBrandViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminShopBrandSerializer
    queryset = ShopBrand.objects.all().order_by("name", "id")
    audit_entity = "shop_brand"


class AdminShopCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopCollection
        fields = ["id", "name", "name_bn", "slug", "active"]


class AdminShopCollectionViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminShopCollectionSerializer
    queryset = ShopCollection.objects.all().order_by("name", "id")
    audit_entity = "shop_collection"


# 2. Products & Services (Offerings)
class AdminOfferingSerializer(serializers.ModelSerializer):
    division_slug = serializers.CharField(source="division.slug", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    organization_name = serializers.CharField(source="organization.name", read_only=True, default="U Service BD")
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Offering
        fields = [
            "id",
            "division",
            "division_slug",
            "division_name",
            "organization",
            "organization_name",
            "category",
            "category_name",
            "brand",
            "name",
            "name_bn",
            "slug",
            "sku",
            "barcode",
            "description",
            "description_bn",
            "price",
            "sale_price",
            "stock",
            "active",
            "prescription_required",
            "duration_minutes",
            "image",
            "updated_at",
        ]

    def validate(self, attrs):
        name = attrs.get("name") or (self.instance.name if self.instance else "")
        slug = attrs.get("slug") or (self.instance.slug if self.instance else "")
        if not slug and name:
            base = slugify(name) or "item"
            candidate = base
            counter = 1
            while Offering.objects.exclude(pk=getattr(self.instance, "pk", None)).filter(slug=candidate).exists():
                counter += 1
                candidate = f"{base}-{counter}"
            attrs["slug"] = candidate
        sale_price = attrs.get("sale_price", getattr(self.instance, "sale_price", None))
        price = attrs.get("price", getattr(self.instance, "price", Decimal("0")))
        if sale_price is not None and price is not None and sale_price > price:
            raise serializers.ValidationError({"sale_price": "Sale price cannot exceed regular price."})
        division = attrs.get("division", getattr(self.instance, "division", None))
        category = attrs.get("category", getattr(self.instance, "category", None))
        if category and division and category.division_id != division.id:
            raise serializers.ValidationError({"category": "Choose a category in the same division."})
        image = attrs.get("image", getattr(self.instance, "image", ""))
        if image:
            try:
                validate_public_media_url(image)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"image": exc.messages}) from exc
        return attrs


class AdminOfferingViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminOfferingSerializer
    audit_entity = "offering"

    def get_queryset(self):
        qs = Offering.objects.select_related("division", "organization", "category", "brand").order_by("-updated_at", "-id")
        if self.action == "list":
            division = self.request.query_params.get("division")
            q = self.request.query_params.get("q", "").strip()
            if division:
                qs = qs.filter(division__slug=division)
            if q:
                qs = qs.filter(Q(name__icontains=q) | Q(name_bn__icontains=q) | Q(sku__icontains=q))
            return qs[:250]
        return qs


# 3. Organizations / Stores / Restaurants
class AdminOrganizationSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source="division.name", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "division",
            "division_name",
            "owner",
            "owner_username",
            "approved",
            "accepting_orders",
            "area",
            "address",
            "description",
            "opening_hours",
            "minimum_order",
            "preparation_minutes",
        ]


class AdminOrganizationViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminOrganizationSerializer
    queryset = Organization.objects.select_related("division", "owner").order_by("-id")
    audit_entity = "organization"


# 4. Discount Coupons
class AdminCouponSerializer(serializers.ModelSerializer):
    division_name = serializers.CharField(source="division.name", read_only=True, default="All Divisions")

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "division",
            "division_name",
            "amount",
            "minimum",
            "limit",
            "used",
            "per_user_limit",
            "expires_at",
            "active",
        ]


class AdminCouponViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminCouponSerializer
    queryset = Coupon.objects.select_related("division").order_by("-id")
    audit_entity = "coupon"


# 5. Users & Role Assignment
MANAGED_GROUPS = [
    "Provider",
    "Rider",
    "Support Agent",
    "Operations Manager",
    "Finance",
    "Content Manager",
]


class AdminUserSerializer(serializers.ModelSerializer):
    group_names = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )
    groups_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "is_active",
            "is_staff",
            "is_superuser",
            "email_verified",
            "date_joined",
            "groups_display",
            "group_names",
        ]
        read_only_fields = ["username", "date_joined", "is_superuser"]

    def get_groups_display(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def update(self, instance, validated_data):
        group_names = validated_data.pop("group_names", None)
        # Prevent admin from accidentally locking themselves out
        request = self.context.get("request")
        if request and request.user.pk == instance.pk:
            validated_data.pop("is_active", None)
            validated_data.pop("is_staff", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if group_names is not None:
            valid_names = [g for g in group_names if g in MANAGED_GROUPS]
            groups = []
            for name in valid_names:
                grp, _ = Group.objects.get_or_create(name=name)
                groups.append(grp)
            instance.groups.set(groups)
            if "Provider" in valid_names:
                ProviderProfile.objects.get_or_create(
                    user=instance,
                    defaults={"available": True},
                )
            if "Rider" in valid_names:
                RiderProfile.objects.get_or_create(
                    user=instance,
                    defaults={"vehicle": "motorbike", "available": True},
                )
        return instance


class AdminUserViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminUserSerializer
    http_method_names = ["get", "patch", "head", "options"]
    audit_entity = "user"

    def get_queryset(self):
        qs = User.objects.prefetch_related("groups").order_by("-id")
        if self.action == "list":
            q = self.request.query_params.get("q", "").strip()
            if q:
                qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
            return qs[:200]
        return qs


# 6. CMS Pages, FAQs & Service Areas
class AdminPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ["id", "slug", "title", "title_bn", "body", "body_bn", "description", "published", "updated_at"]


class AdminPageViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminPageSerializer
    queryset = Page.objects.all().order_by("slug")
    audit_entity = "page"


class AdminFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "question", "question_bn", "answer", "answer_bn", "published", "position"]


class AdminFAQViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminFAQSerializer
    queryset = FAQ.objects.all().order_by("position", "id")
    audit_entity = "faq"


class AdminAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ["id", "name", "name_bn", "district", "delivery_fee", "active", "divisions"]


class AdminAreaViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminAreaSerializer
    queryset = ServiceArea.objects.prefetch_related("divisions").order_by("district", "name")
    audit_entity = "service_area"


# 7. Managed Investment Projects
class AdminProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagedProject
        fields = [
            "id",
            "title",
            "title_bn",
            "category",
            "area",
            "description",
            "description_bn",
            "image",
            "published",
            "progress",
            "created_at",
        ]


class AdminProjectViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminProjectSerializer
    queryset = ManagedProject.objects.all().order_by("-created_at", "-id")
    audit_entity = "managed_project"


# 8. Reviews Moderation
class AdminReviewSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source="customer.username", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "customer", "customer_username", "order", "booking", "rating", "comment", "created_at"]
        read_only_fields = ["customer", "order", "booking", "created_at"]


class AdminReviewViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminReviewSerializer
    http_method_names = ["get", "delete", "head", "options"]
    audit_entity = "review"

    def get_queryset(self):
        qs = Review.objects.select_related("customer").order_by("-created_at")
        if self.action == "list":
            return qs[:150]
        return qs


class AdminLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ["id", "name", "email", "phone", "interest", "message", "source", "status", "created_at"]
        read_only_fields = ["name", "email", "phone", "interest", "message", "source", "created_at"]


class AdminLeadViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminLeadSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]
    audit_entity = "lead"

    def get_queryset(self):
        qs = Lead.objects.order_by("-created_at", "-id")
        if self.action == "list":
            return qs[:150]
        return qs


class AdminLoyaltyRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyReward
        fields = ["id", "name", "description", "points_cost", "active", "created_at"]


class AdminLoyaltyRewardViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminLoyaltyRewardSerializer
    queryset = LoyaltyReward.objects.order_by("points_cost", "id")
    audit_entity = "loyalty_reward"


class AdminReturnSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source="order.customer.username", read_only=True)
    order_total = serializers.DecimalField(source="order.total", max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "order",
            "customer_username",
            "order_total",
            "reason",
            "status",
            "review_note",
            "created_at",
        ]
        read_only_fields = ["order", "reason", "created_at"]


class AdminReturnViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminReturnSerializer
    http_method_names = ["get", "patch", "head", "options"]
    queryset = ReturnRequest.objects.select_related("order__customer").order_by("-created_at", "-id")
    audit_entity = "return_request"


# 9. Notification Broadcast & Audit Logs
class AdminBroadcastView(APIView):
    permission_classes = [IsPlatformAdmin]
    throttle_classes = []

    def post(self, request):
        title = str(request.data.get("title", "")).strip()
        body = str(request.data.get("body", "")).strip()
        target_username = str(request.data.get("username", "")).strip()
        if not title or not body:
            return Response({"error": "Title and message body are required."}, status=status.HTTP_400_BAD_REQUEST)
        if target_username:
            user = User.objects.filter(username=target_username).first()
            if not user:
                return Response({"error": f"User '{target_username}' not found."}, status=status.HTTP_404_NOT_FOUND)
            Notification.objects.create(user=user, title=title[:180], body=body[:2000])
            sent_count = 1
        else:
            users = list(User.objects.filter(is_active=True)[:500])
            Notification.objects.bulk_create(
                [Notification(user=u, title=title[:180], body=body[:2000]) for u in users]
            )
            sent_count = len(users)
        record_admin_audit(
            request.user,
            "admin.notification.broadcast",
            f"target:{target_username or 'all'}",
            {"title": title[:120], "sent_count": sent_count},
        )
        return Response({"sent": sent_count})


class AdminAuditLogView(APIView):
    permission_classes = [IsPlatformAdmin]
    throttle_classes = []

    def get(self, request):
        logs = AuditLog.objects.select_related("actor").order_by("-created_at", "-id")[:120]
        return Response(
            [
                {
                    "id": item.id,
                    "actor": item.actor.username if item.actor else "system",
                    "action": item.action,
                    "entity": item.entity,
                    "metadata": item.metadata,
                    "created_at": item.created_at,
                }
                for item in logs
            ]
        )


# 10. All-Website Visual, Background, Image, Text & Video Control APIs
def _validate_target_path(raw_path: str) -> str:
    path = (raw_path or "/").strip()
    if path == "/*":
        return "/*"
    if (
        len(path) > 500
        or not path.startswith("/")
        or path.startswith("//")
        or any(ch in path for ch in "?#\\")
    ):
        raise serializers.ValidationError({"page_path": "Enter a valid page path starting with / (or /* for global)."})
    return path


def _resolve_appearance_for_path(raw_path: str) -> PageAppearance:
    path = _validate_target_path(raw_path)
    appearance, _ = PageAppearance.objects.get_or_create(page_path=path)
    return appearance


class AdminMediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SiteMediaAsset
        fields = ["id", "title", "kind", "file", "url", "created_at"]
        extra_kwargs = {"file": {"write_only": True}}

    def get_url(self, obj) -> str:
        return obj.file.url if obj.file else ""

    def validate(self, attrs):
        file_obj = attrs.get("file")
        if file_obj:
            try:
                from apps.content.models import validate_site_media_file

                validate_site_media_file(file_obj)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"file": exc.messages}) from exc
            ext = os.path.splitext(file_obj.name or "")[1].lower()
            attrs["kind"] = "video" if ext in ALLOWED_VIDEO_EXTENSIONS else "image"
            if not attrs.get("title"):
                attrs["title"] = os.path.basename(file_obj.name or "media")[:180]
        return attrs


class AdminMediaAssetViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminMediaAssetSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "delete", "head", "options"]
    audit_entity = "media_asset"

    def get_queryset(self):
        qs = SiteMediaAsset.objects.order_by("-created_at", "-id")
        if self.action == "list":
            kind = self.request.query_params.get("kind")
            if kind in {"image", "video"}:
                qs = qs.filter(kind=kind)
            return qs[:120]
        return qs

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)
        record_admin_audit(
            self.request.user,
            "admin.media_asset.uploaded",
            f"media_asset:{instance.pk}",
            {"url": instance.file.url if instance.file else "", "kind": instance.kind},
        )


class AdminImageReplacementSerializer(serializers.ModelSerializer):
    page_path = serializers.CharField(write_only=True, required=False, default="/")
    page_path_display = serializers.CharField(source="appearance.page_path", read_only=True)
    effective_image = serializers.CharField(source="effective_image_url", read_only=True)

    class Meta:
        model = PageImageReplacement
        fields = [
            "id",
            "page_path",
            "page_path_display",
            "source_alt",
            "source_url",
            "image",
            "replacement_url",
            "effective_image",
            "active",
        ]

    def validate(self, attrs):
        source_alt = attrs.get("source_alt", getattr(self.instance, "source_alt", "")).strip()
        source_url = attrs.get("source_url", getattr(self.instance, "source_url", "")).strip()
        image = attrs.get("image", getattr(self.instance, "image", None))
        replacement_url = attrs.get("replacement_url", getattr(self.instance, "replacement_url", "")).strip()
        if not source_alt and not source_url:
            raise serializers.ValidationError("Provide either source image URL or source alt text.")
        if not image and not replacement_url:
            raise serializers.ValidationError("Upload a replacement image or enter a replacement image URL.")
        return attrs

    def create(self, validated_data):
        raw_path = validated_data.pop("page_path", "/")
        appearance = _resolve_appearance_for_path(raw_path)
        return PageImageReplacement.objects.create(appearance=appearance, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("page_path", None)
        return super().update(instance, validated_data)


class AdminImageReplacementViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminImageReplacementSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    audit_entity = "image_replacement"

    def get_queryset(self):
        qs = PageImageReplacement.objects.select_related("appearance").order_by("-id")
        if self.action == "list":
            path = self.request.query_params.get("path")
            if path:
                qs = qs.filter(appearance__page_path=path)
        return qs


class AdminTextReplacementSerializer(serializers.ModelSerializer):
    page_path = serializers.CharField(write_only=True, required=False, default="/")
    page_path_display = serializers.CharField(source="appearance.page_path", read_only=True)

    class Meta:
        model = PageTextReplacement
        fields = [
            "id",
            "page_path",
            "page_path_display",
            "source_text",
            "replacement_text",
            "note",
            "active",
            "created_at",
        ]

    def create(self, validated_data):
        raw_path = validated_data.pop("page_path", "/")
        appearance = _resolve_appearance_for_path(raw_path)
        return PageTextReplacement.objects.create(appearance=appearance, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("page_path", None)
        return super().update(instance, validated_data)


class AdminTextReplacementViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminTextReplacementSerializer
    audit_entity = "text_replacement"

    def get_queryset(self):
        qs = PageTextReplacement.objects.select_related("appearance").order_by("-id")
        if self.action == "list":
            path = self.request.query_params.get("path")
            if path:
                qs = qs.filter(appearance__page_path=path)
        return qs


class AdminVideoBlockSerializer(serializers.ModelSerializer):
    page_path = serializers.CharField(write_only=True, required=False, default="/")
    page_path_display = serializers.CharField(source="appearance.page_path", read_only=True)

    class Meta:
        model = PageVideoBlock
        fields = [
            "id",
            "page_path",
            "page_path_display",
            "mode",
            "position",
            "title",
            "title_bn",
            "subtitle",
            "subtitle_bn",
            "source_video_url",
            "video_url",
            "poster_url",
            "autoplay",
            "muted",
            "loop",
            "controls",
            "active",
            "display_order",
        ]

    def create(self, validated_data):
        raw_path = validated_data.pop("page_path", "/")
        appearance = _resolve_appearance_for_path(raw_path)
        return PageVideoBlock.objects.create(appearance=appearance, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("page_path", None)
        return super().update(instance, validated_data)


class AdminVideoBlockViewSet(AuditedAdminModelViewSet):
    serializer_class = AdminVideoBlockSerializer
    audit_entity = "video_block"

    def get_queryset(self):
        qs = PageVideoBlock.objects.select_related("appearance").order_by("display_order", "-id")
        if self.action == "list":
            path = self.request.query_params.get("path")
            if path:
                qs = qs.filter(appearance__page_path=path)
        return qs


class AdminPageAppearanceView(APIView):
    permission_classes = [IsPlatformAdmin]
    throttle_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _serialize(self, appearance: PageAppearance | None, path: str) -> dict:
        if not appearance:
            return {
                "page_path": path,
                "background_image_url": "",
                "background_url": "",
                "background_color": "",
                "background_overlay_opacity": 0,
                "primary_color": "",
                "secondary_color": "",
                "accent_color": "",
                "text_color": "",
                "logo_url": "",
                "announcement_text_bn": "",
                "announcement_text_en": "",
                "configured_paths": list(PageAppearance.objects.values_list("page_path", flat=True)),
            }
        return {
            "id": appearance.id,
            "page_path": appearance.page_path,
            "background_image_url": appearance.effective_background_image or "",
            "background_url": appearance.background_url,
            "background_color": appearance.background_color,
            "background_overlay_opacity": appearance.background_overlay_opacity,
            "primary_color": appearance.primary_color,
            "secondary_color": appearance.secondary_color,
            "accent_color": appearance.accent_color,
            "text_color": appearance.text_color,
            "logo_url": appearance.logo_url,
            "announcement_text_bn": appearance.announcement_text_bn,
            "announcement_text_en": appearance.announcement_text_en,
            "configured_paths": list(PageAppearance.objects.values_list("page_path", flat=True)),
        }

    def get(self, request):
        path = _validate_target_path(request.query_params.get("path", "/*"))
        appearance = PageAppearance.objects.filter(page_path=path).first()
        return Response(self._serialize(appearance, path))

    def patch(self, request):
        raw_path = request.data.get("page_path") or request.query_params.get("path") or "/*"
        appearance = _resolve_appearance_for_path(str(raw_path))

        if str(request.data.get("clear_background", "")).lower() in {"true", "1", "yes"}:
            if appearance.background_image:
                appearance.background_image.delete(save=False)
            appearance.background_image = None
            appearance.background_url = ""
            appearance.background_color = ""
            appearance.background_overlay_opacity = 0

        if "background_image" in request.FILES:
            uploaded = request.FILES["background_image"]
            from apps.content.models import validate_site_image_size

            try:
                validate_site_image_size(uploaded)
            except DjangoValidationError as exc:
                return Response({"error": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
            appearance.background_image = uploaded
            appearance.background_url = ""

        str_fields = [
            "background_url",
            "background_color",
            "primary_color",
            "secondary_color",
            "accent_color",
            "text_color",
            "logo_url",
            "announcement_text_bn",
            "announcement_text_en",
        ]
        for field in str_fields:
            if field in request.data:
                setattr(appearance, field, str(request.data.get(field) or "").strip())

        if "background_overlay_opacity" in request.data:
            try:
                val = max(0, min(95, int(request.data.get("background_overlay_opacity") or 0)))
                appearance.background_overlay_opacity = val
            except (TypeError, ValueError):
                pass

        appearance.save()
        record_admin_audit(
            request.user,
            "admin.page_appearance.updated",
            f"page:{appearance.page_path}",
            {"background": appearance.effective_background_image or appearance.background_color},
        )
        return Response(self._serialize(appearance, appearance.page_path))
