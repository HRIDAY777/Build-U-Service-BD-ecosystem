from django.contrib import admin
from apps.catalog.admin import AuditedAdmin
from apps.operations.admin import ReadOnlyAdmin
from .models import Lead, SupportTicket, Review, Notification, CRMActivity, LoyaltyEntry


@admin.register(Lead)
class LeadAdmin(AuditedAdmin):
    list_display = ["name", "interest", "source", "status", "assigned_to", "follow_up_at"]
    list_filter = ["interest", "source", "status"]
    search_fields = ["name", "email", "phone"]


@admin.register(SupportTicket)
class SupportAdmin(AuditedAdmin):
    list_display = ["id", "customer", "subject", "status", "created_at"]
    readonly_fields = ["customer", "subject", "message", "created_at"]

    def has_add_permission(self, request):
        return False


admin.site.register(Review, ReadOnlyAdmin)
admin.site.register(Notification, ReadOnlyAdmin)
admin.site.register(CRMActivity, AuditedAdmin)
admin.site.register(LoyaltyEntry, ReadOnlyAdmin)
