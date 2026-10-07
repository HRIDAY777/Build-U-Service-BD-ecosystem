from django.contrib import admin
from apps.catalog.admin import AuditedAdmin
from .models import Page, FAQ


@admin.register(Page)
class PageAdmin(AuditedAdmin):
    list_display = ["title", "slug", "published", "updated_at"]
    prepopulated_fields = {"slug": ("title",)}


admin.site.register(FAQ, AuditedAdmin)
