from django.contrib import admin
from .models import (
    Order,
    OrderItem,
    Booking,
    DeliveryRequest,
    Prescription,
    Payment,
    Refund,
    AuditLog,
    StatusEvent,
    InventoryMovement,
    Coupon,
    EventRequest,
    ReturnRequest,
    RiderProfile,
    DeliveryFeedback,
    ProviderProfile,
)


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(ReadOnlyAdmin):
    list_display = ["id", "customer", "division", "status", "total", "payment_status", "created_at"]
    list_filter = ["division", "status", "payment_status"]
    search_fields = ["id", "customer__username"]


@admin.register(Booking)
class BookingAdmin(ReadOnlyAdmin):
    list_display = ["id", "customer", "offering", "provider", "scheduled_at", "status"]
    list_filter = ["status", "offering__division"]


@admin.register(EventRequest)
class EventRequestAdmin(ReadOnlyAdmin):
    list_display = ["title", "event_type", "customer", "event_date", "guest_count", "status", "quoted_budget"]
    list_filter = ["event_type", "status", "area"]
    search_fields = ["title", "venue", "customer__username", "customer__email"]


@admin.register(AuditLog)
class AuditAdmin(ReadOnlyAdmin):
    list_display = ["actor", "action", "entity", "created_at"]
    list_filter = ["action"]
    search_fields = ["entity", "actor__username"]


@admin.register(DeliveryRequest)
class DeliveryAdmin(ReadOnlyAdmin):
    list_display = ["id", "customer", "rider", "status", "fee", "weight_kg", "pickup_at", "created_at"]
    list_filter = ["status", "package_type", "fragile"]
    search_fields = ["id", "description", "customer__username", "rider__username"]


@admin.register(RiderProfile)
class RiderAdmin(admin.ModelAdmin):
    list_display = ["user", "available", "vehicle", "earning_per_delivery"]
    list_filter = ["available"]
    search_fields = ["user__username", "user__first_name"]


@admin.register(ProviderProfile)
class ProviderAdmin(admin.ModelAdmin):
    filter_horizontal = ["approved_services"]

    def save_related(self, request, form, formsets, change):
        from django.contrib.auth import get_user_model
        from django.db import transaction
        from .services import audit
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk=form.instance.user_id)
            super().save_related(request, form, formsets, change)
            if "approved_services" in form.changed_data:
                audit(request.user, "provider.skills_updated", form.instance.pk,
                      services=list(form.instance.approved_services.values_list("pk", flat=True)))

    list_display = ["user", "available", "updated_at"]
    list_filter = ["available"]
    search_fields = ["user__username", "user__first_name"]


for model in [
    OrderItem,
    Prescription,
    Payment,
    Refund,
    StatusEvent,
    InventoryMovement,
    ReturnRequest,
    DeliveryFeedback,
]:
    admin.site.register(model, ReadOnlyAdmin)


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "division", "amount", "used", "limit", "expires_at", "active"]
    readonly_fields = ["used"]
