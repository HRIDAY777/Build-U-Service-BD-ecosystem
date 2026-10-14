from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.db import connection
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
from apps.automation.api import AssistantView
from apps.catalog.partner_api import PartnerOfferingViewSet, PartnerRestaurantViewSet
from apps.catalog.api import SharedWishlistView
from apps.catalog.api import ShopBrandViewSet, ShopCollectionViewSet
from apps.operations.payments import PaymentMethodsView, PaymentStartView, PaymentIPNView, PaymentReturnView

from apps.engagement.project_api import ManagedProjectViewSet, ProjectApplicationViewSet
from apps.accounts.api import SecurityHistoryView
from apps.catalog.onboarding_api import PartnerApplicationViewSet
router = DefaultRouter()
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
        return JsonResponse({"status": "unavailable"}, status=503)


urlpatterns = [
    path("api/v1/wishlist-shared/<uuid:token>/", SharedWishlistView.as_view()),
    path("api/v1/payment-methods/", PaymentMethodsView.as_view()),
    path("api/v1/payments/<uuid:order_id>/start/", PaymentStartView.as_view()),
    path("api/v1/payments/ipn/", PaymentIPNView.as_view()),
    path("api/v1/payments/return/", PaymentReturnView.as_view()),
    path("admin/", admin.site.urls),
    path("health/", health),
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
admin.site.site_header = "U Service BD · Central administration"
admin.site.site_title = "U Service BD"
admin.site.index_title = "Group operations"
