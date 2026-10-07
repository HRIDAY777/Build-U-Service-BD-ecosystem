from django.contrib import admin
from apps.catalog.admin import AuditedAdmin
from apps.operations.admin import ReadOnlyAdmin
from .models import AutomationRule, AutomationRun, OutboxEvent, KnowledgeDocument, AIUsage


@admin.register(AutomationRule)
class RuleAdmin(AuditedAdmin):
    list_display = ["name", "trigger", "action", "active"]


@admin.register(AutomationRun)
class RunAdmin(ReadOnlyAdmin):
    list_display = ["rule", "status", "attempts", "error", "updated_at"]
    list_filter = ["status"]


admin.site.register(OutboxEvent, ReadOnlyAdmin)
admin.site.register(KnowledgeDocument, AuditedAdmin)
admin.site.register(AIUsage, ReadOnlyAdmin)
