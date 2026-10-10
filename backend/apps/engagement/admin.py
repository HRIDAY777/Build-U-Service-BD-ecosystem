from django.contrib import admin
from django.utils import timezone
from apps.catalog.admin import AuditedAdmin
from apps.operations.admin import ReadOnlyAdmin
from apps.operations.services import audit
from .models import (
    Lead,
    SupportTicket,
    SupportMessage,
    Review,
    Notification,
    CRMActivity,
    LoyaltyEntry,
    LoyaltyReward,
    LoyaltyRedemption,
)
from .project_models import ManagedProject, ProjectApplication, ProjectEntry, ProjectUpdate


@admin.register(ManagedProject)
class ManagedProjectAdmin(AuditedAdmin):
    list_display = ["title", "category", "area", "progress", "published"]
    list_filter = ["category", "published"]
    search_fields = ["title", "area"]


@admin.register(ProjectUpdate)
class ProjectUpdateAdmin(AuditedAdmin):
    list_display = ["title", "project", "date", "public"]
    list_filter = ["project", "public"]


@admin.register(ProjectApplication)
class ProjectApplicationAdmin(ReadOnlyAdmin):
    list_display = ["id", "name", "kind", "package", "amount", "status", "project"]
    list_filter = ["kind", "status", "package"]
    search_fields = ["name", "phone", "agreement_reference"]


@admin.register(ProjectEntry)
class ProjectEntryAdmin(ReadOnlyAdmin):
    list_display = ["application", "kind", "amount", "reference", "date", "recorded_by"]
    search_fields = ["reference", "application__name"]


@admin.register(Lead)
class LeadAdmin(AuditedAdmin):
    list_display = ["name", "interest", "source", "status", "assigned_to", "follow_up_at"]
    list_filter = ["interest", "source", "status"]
    search_fields = ["name", "email", "phone"]


@admin.register(SupportTicket)
class SupportAdmin(ReadOnlyAdmin):
    list_display = ["id", "customer", "subject", "status", "created_at"]
    readonly_fields = ["customer", "subject", "message", "created_at"]

    def has_add_permission(self, request):
        return False


admin.site.register(Review, ReadOnlyAdmin)
admin.site.register(SupportMessage, ReadOnlyAdmin)
admin.site.register(Notification, ReadOnlyAdmin)
admin.site.register(CRMActivity, AuditedAdmin)
admin.site.register(LoyaltyEntry, ReadOnlyAdmin)
admin.site.register(LoyaltyReward, AuditedAdmin)


@admin.register(LoyaltyRedemption)
class LoyaltyRedemptionAdmin(ReadOnlyAdmin):
    list_display = ["id", "customer", "reward", "points_spent", "created_at", "fulfilled_at"]
    list_filter = ["fulfilled_at", "created_at"]
    search_fields = ["customer__username", "reward__name"]
    actions = ["mark_fulfilled"]

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff and request.user.has_perm("engagement.change_loyaltyredemption")

    @admin.action(description="Mark selected redemptions as fulfilled")
    def mark_fulfilled(self, request, queryset):
        pending = list(queryset.filter(fulfilled_at__isnull=True))
        fulfilled_at = timezone.now()
        for redemption in pending:
            redemption.fulfilled_at = fulfilled_at
        if pending:
            LoyaltyRedemption.objects.bulk_update(pending, ["fulfilled_at"])
            for redemption in pending:
                audit(request.user, "loyalty.fulfilled", redemption.pk, reward=redemption.reward.name)
        self.message_user(request, f"Marked {len(pending)} redemption(s) as fulfilled.")
