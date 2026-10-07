from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.db import connection
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts.api import AuthView, AddressViewSet
from apps.catalog.api import DivisionViewSet, OfferingViewSet, AreaViewSet, OrganizationViewSet
from apps.operations.api import OrderViewSet, BookingViewSet, DeliveryViewSet
from apps.engagement.api import (
    LeadViewSet,
    TicketViewSet,
    ReviewViewSet,
    NotificationViewSet,
    DashboardView,
    AnalyticsView,
)
from apps.content.api import PageViewSet, FAQViewSet
from apps.automation.api import AssistantView
from apps.catalog.partner_api import PartnerOfferingViewSet
from apps.operations.payments import PaymentMethodsView, PaymentStartView, PaymentIPNView, PaymentReturnView

router = DefaultRouter()
router.register("partner-offerings", PartnerOfferingViewSet, basename="partner-offering")
for prefix, view, basename in [
    ("addresses", AddressViewSet, "address"),
    ("divisions", DivisionViewSet, "division"),
    ("offerings", OfferingViewSet, "offering"),
    ("areas", AreaViewSet, "area"),
    ("organizations", OrganizationViewSet, "organization"),
    ("orders", OrderViewSet, "order"),
    ("bookings", BookingViewSet, "booking"),
    ("deliveries", DeliveryViewSet, "delivery"),
    ("leads", LeadViewSet, "lead"),
    ("tickets", TicketViewSet, "ticket"),
    ("reviews", ReviewViewSet, "review"),
    ("notifications", NotificationViewSet, "notification"),
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
    path("api/v1/payment-methods/", PaymentMethodsView.as_view()),
    path("api/v1/payments/<uuid:order_id>/start/", PaymentStartView.as_view()),
    path("api/v1/payments/ipn/", PaymentIPNView.as_view()),
    path("api/v1/payments/return/", PaymentReturnView.as_view()),
    path("admin/", admin.site.urls),
    path("health/", health),
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
