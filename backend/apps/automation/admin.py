from django.contrib import admin
from django.db.models import F
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from apps.catalog.admin import AuditedAdmin
from apps.operations.admin import ReadOnlyAdmin
from .models import AutomationRule, AutomationRun, OutboxEvent, KnowledgeDocument, AIUsage
from .retry import authorize_retry


class ExhaustedFilter(admin.SimpleListFilter):
    title = "Retry availability / পুনরায় চেষ্টা"
    parameter_name = "exhausted"

    def lookups(self, request, model_admin):
        return [("yes", "Failed: attempts exhausted / চেষ্টা শেষ")]

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(status="failed", attempts__gte=F("attempt_limit"), event__processed_at__isnull=True)
        return queryset


@admin.register(AutomationRule)
class RuleAdmin(AuditedAdmin):
    list_display = ["name", "trigger", "action", "active"]


@admin.register(AutomationRun)
class RunAdmin(ReadOnlyAdmin):
    list_display = ["rule", "event_topic", "status", "attempts", "attempt_limit", "next_attempt_at", "error", "updated_at"]
    list_filter = [ExhaustedFilter, "status", "rule__action"]
    list_select_related = ["rule", "event"]
    search_fields = ["rule__name", "event__topic"]
    ordering = ["-updated_at", "-pk"]
    actions = ["queue_retry"]

    @admin.display(description="Event / ঘটনা")
    def event_topic(self, obj):
        return obj.event.topic

    def has_retry_permission(self, request):
        return request.user.is_active and request.user.is_staff and request.user.has_perms(["automation.view_automationrun", "automation.retry_automationrun"])

    @admin.action(permissions=["retry"], description="Queue one extra attempt / আরও একবার চেষ্টা করুন")
    def queue_retry(self, request, queryset):
        if not self.has_retry_permission(request):
            raise PermissionDenied()
        try:
            result = authorize_retry(request.user, list(queryset.values_list("pk", flat=True)[:51]))
        except ValidationError:
            self.message_user(request, "Select at most 50 runs / সর্বোচ্চ ৫০টি বাছুন", level="error")
            return
        self.message_user(request, f"Queued / অপেক্ষায়: {result['queued']}; skipped / বাদ: {result['skipped']}. Worker required / ওয়ার্কার চালু থাকা প্রয়োজন।")


admin.site.register(OutboxEvent, ReadOnlyAdmin)
admin.site.register(KnowledgeDocument, AuditedAdmin)
admin.site.register(AIUsage, ReadOnlyAdmin)
