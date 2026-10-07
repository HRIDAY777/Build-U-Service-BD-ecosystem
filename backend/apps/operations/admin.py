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


@admin.register(AuditLog)
class AuditAdmin(ReadOnlyAdmin):
    list_display = ["actor", "action", "entity", "created_at"]
    list_filter = ["action"]
    search_fields = ["entity", "actor__username"]


for model in [OrderItem, DeliveryRequest, Prescription, Payment, Refund, StatusEvent, InventoryMovement]:
    admin.site.register(model, ReadOnlyAdmin)


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "division", "amount", "used", "limit", "expires_at", "active"]
    readonly_fields = ["used"]
