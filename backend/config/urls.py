import logging
import mimetypes
from pathlib import Path

from django.contrib import admin
from django.db import connection
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path
from django.utils._os import safe_join
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts.api import AccountDeletionRequestView, AuthView, AddressViewSet, LogoutAllView, PasswordChangeView, PasswordResetRequestView, PasswordResetConfirmView, EmailVerificationRequestView, EmailVerificationConfirmView
from apps.catalog.api import CategoryViewSet, DivisionViewSet, OfferingViewSet, AreaViewSet, OrganizationViewSet, WishlistViewSet
from apps.operations.api import ReturnViewSet, EventRequestViewSet, OrderViewSet, BookingViewSet, DeliveryViewSet
from apps.engagement.api import (
    LeadViewSet,
    TicketViewSet,
    ReviewViewSet,
    NotificationViewSet,
    DashboardView,
    AnalyticsView,
    LoyaltyViewSet,
)
from apps.content.api import PageViewSet, FAQViewSet
from apps.content.api import PageAppearanceView
from apps.automation.api import AssistantView
from apps.catalog.partner_api import PartnerOfferingViewSet, PartnerRestaurantViewSet
from apps.catalog.api import SharedWishlistView
from apps.catalog.api import ShopBrandViewSet, ShopCollectionViewSet
from apps.operations.payments import (
    PaymentMethodsView,
    PaymentGatewayListView,
    PaymentGatewayDetailView,
    PaymentSubmitTrxView,
    PaymentVerifyTrxView,
    PaymentStartView,
    PaymentIPNView,
    PaymentReturnView,
)

from apps.engagement.project_api import ManagedProjectViewSet, ProjectApplicationViewSet
from apps.accounts.api import SecurityHistoryView
from apps.catalog.onboarding_api import PartnerApplicationViewSet
from apps.operations.admin_api import (
    AdminAreaViewSet,
    AdminAuditLogView,
    AdminBroadcastView,
    AdminCategoryViewSet,
    AdminCouponViewSet,
    AdminDivisionViewSet,
    AdminFAQViewSet,
    AdminImageReplacementViewSet,
    AdminLeadViewSet,
    AdminLoyaltyRewardViewSet,
    AdminMediaAssetViewSet,
    AdminOfferingViewSet,
    AdminOrganizationViewSet,
    AdminOverviewView,
    AdminPageAppearanceView,
    AdminPageViewSet,
    AdminProjectViewSet,
    AdminReturnViewSet,
    AdminReviewViewSet,
    AdminShopBrandViewSet,
    AdminShopCollectionViewSet,
    AdminTextReplacementViewSet,
    AdminUserViewSet,
    AdminVideoBlockViewSet,
)
router = DefaultRouter()
router.register("admin-control/media-assets", AdminMediaAssetViewSet, basename="admin-media-asset")
router.register("admin-control/image-replacements", AdminImageReplacementViewSet, basename="admin-image-replacement")
router.register("admin-control/text-replacements", AdminTextReplacementViewSet, basename="admin-text-replacement")
router.register("admin-control/video-blocks", AdminVideoBlockViewSet, basename="admin-video-block")
router.register("admin-control/divisions", AdminDivisionViewSet, basename="admin-division")
router.register("admin-control/categories", AdminCategoryViewSet, basename="admin-category")
router.register("admin-control/brands", AdminShopBrandViewSet, basename="admin-brand")
router.register("admin-control/collections", AdminShopCollectionViewSet, basename="admin-collection")
router.register("admin-control/offerings", AdminOfferingViewSet, basename="admin-offering")
router.register("admin-control/organizations", AdminOrganizationViewSet, basename="admin-organization")
router.register("admin-control/coupons", AdminCouponViewSet, basename="admin-coupon")
router.register("admin-control/loyalty-rewards", AdminLoyaltyRewardViewSet, basename="admin-loyalty-reward")
router.register("admin-control/returns", AdminReturnViewSet, basename="admin-return")
router.register("admin-control/users", AdminUserViewSet, basename="admin-user")
router.register("admin-control/pages", AdminPageViewSet, basename="admin-page")
router.register("admin-control/faqs", AdminFAQViewSet, basename="admin-faq")
router.register("admin-control/areas", AdminAreaViewSet, basename="admin-area")
router.register("admin-control/projects", AdminProjectViewSet, basename="admin-project")
router.register("admin-control/reviews", AdminReviewViewSet, basename="admin-review")
router.register("admin-control/leads", AdminLeadViewSet, basename="admin-lead")
router.register("partner-applications", PartnerApplicationViewSet, basename="partner-application")
router.register("managed-projects", ManagedProjectViewSet, basename="managed-project")
router.register("project-applications", ProjectApplicationViewSet, basename="project-application")
router.register("partner-offerings", PartnerOfferingViewSet, basename="partner-offering")
router.register("partner-restaurants", PartnerRestaurantViewSet, basename="partner-restaurant")
for prefix, view, basename in [
    ("addresses", AddressViewSet, "address"),
    ("divisions", DivisionViewSet, "division"),
    ("categories", CategoryViewSet, "category"),
    ("shop-brands", ShopBrandViewSet, "shop-brand"),
    ("shop-collections", ShopCollectionViewSet, "shop-collection"),
    ("offerings", OfferingViewSet, "offering"),
    ("areas", AreaViewSet, "area"),
    ("wishlist", WishlistViewSet, "wishlist"),
    ("organizations", OrganizationViewSet, "organization"),
    ("orders", OrderViewSet, "order"),
    ("bookings", BookingViewSet, "booking"),
    ("deliveries", DeliveryViewSet, "delivery"),
    ("events", EventRequestViewSet, "event"),
    ("returns", ReturnViewSet, "return"),
    ("leads", LeadViewSet, "lead"),
    ("tickets", TicketViewSet, "ticket"),
    ("reviews", ReviewViewSet, "review"),
    ("notifications", NotificationViewSet, "notification"),
    ("loyalty", LoyaltyViewSet, "loyalty"),
    ("pages", PageViewSet, "page"),
    ("faqs", FAQViewSet, "faq"),
]:
    router.register(prefix, view, basename=basename)


def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok", "database": "ok"})
    except Exception:
        logger.exception("Backend liveness database check failed.")
        return JsonResponse({"status": "unavailable"}, status=503)


def readiness(request):
    checks = {"database": "ok", "broker": "ok"}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        logger.exception("Backend readiness database check failed.")
        checks["database"] = "unavailable"

    try:
        from config.celery import app as celery_app

        with celery_app.connection_for_read(connect_timeout=2) as broker:
            broker.ensure_connection(max_retries=0)
    except Exception:
        logger.exception("Backend readiness message-broker check failed.")
        checks["broker"] = "unavailable"

    ready = all(status == "ok" for status in checks.values())
    return JsonResponse(
        {"status": "ok" if ready else "unavailable", "checks": checks},
        status=200 if ready else 503,
    )


SAFE_PUBLIC_MEDIA_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}


def serve_site_appearance_media(request, rel_path: str):
    cleaned = (rel_path or "").strip("/")
    if not cleaned:
        raise Http404
    base_dir = Path(settings.MEDIA_ROOT) / "site-appearance"
    try:
        target = Path(safe_join(str(base_dir), cleaned))
    except Exception as exc:
        raise Http404 from exc
    if not target.is_file() or target.suffix.lower() not in SAFE_PUBLIC_MEDIA_EXTS:
        raise Http404
    content_type, _ = mimetypes.guess_type(str(target))
    response = FileResponse(target.open("rb"), content_type=content_type or "application/octet-stream")
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "public, max-age=3600"
    return response


urlpatterns = [
    re_path(r"^media/site-appearance/(?P<rel_path>.+?)/?$", serve_site_appearance_media),
    path("api/v1/admin-control/overview/", AdminOverviewView.as_view()),
    path("api/v1/admin-control/appearance/", AdminPageAppearanceView.as_view()),
    path("api/v1/admin-control/broadcast/", AdminBroadcastView.as_view()),
    path("api/v1/admin-control/audit-logs/", AdminAuditLogView.as_view()),
    path("api/v1/page-appearance/", PageAppearanceView.as_view()),
    path("api/v1/wishlist-shared/<uuid:token>/", SharedWishlistView.as_view()),
    path("api/v1/payment-methods/", PaymentMethodsView.as_view()),
    path("api/v1/payment-gateways/", PaymentGatewayListView.as_view()),
    path("api/v1/payment-gateways/<str:code>/", PaymentGatewayDetailView.as_view()),
    path("api/v1/payments/<uuid:order_id>/submit-trx/", PaymentSubmitTrxView.as_view()),
    path("api/v1/payments/<uuid:order_id>/verify-trx/", PaymentVerifyTrxView.as_view()),
    path("api/v1/payments/<uuid:order_id>/start/", PaymentStartView.as_view()),
    path("api/v1/payments/ipn/", PaymentIPNView.as_view()),
    path("api/v1/payments/return/", PaymentReturnView.as_view()),
    path("admin/", admin.site.urls),
    path("health/", health),
    path("ready/", readiness),
    path("api/v1/auth/password/", PasswordChangeView.as_view()),
    path("api/v1/auth/security-history/", SecurityHistoryView.as_view()),
    path("api/v1/auth/logout-all/", LogoutAllView.as_view()),
    path("api/v1/auth/delete-request/", AccountDeletionRequestView.as_view()),
    path("api/v1/auth/password-reset/", PasswordResetRequestView.as_view()),
    path("api/v1/auth/password-reset/confirm/", PasswordResetConfirmView.as_view()),
    path("api/v1/auth/email-verification/", EmailVerificationRequestView.as_view()),
    path("api/v1/auth/email-verification/confirm/", EmailVerificationConfirmView.as_view()),
    path("api/v1/auth/<str:operation>/", AuthView.as_view()),
    path("api/v1/dashboard/", DashboardView.as_view()),
    path("api/v1/analytics/", AnalyticsView.as_view()),
    path("api/v1/assistant/", AssistantView.as_view()),
    path("api/v1/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
admin.site.site_header = "U Service BD · Central administration"
admin.site.site_title = "U Service BD"
admin.site.index_title = "Group operations"

logger = logging.getLogger(__name__)
