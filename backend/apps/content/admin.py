from django.contrib import admin
from apps.catalog.admin import AuditedAdmin
from apps.operations.services import audit
from .models import (
    FAQ,
    Page,
    PageAppearance,
    PageImageReplacement,
    PageTextReplacement,
    PageVideoBlock,
    SiteMediaAsset,
)


@admin.register(Page)
class PageAdmin(AuditedAdmin):
    list_display = ["title", "slug", "published", "updated_at"]
    prepopulated_fields = {"slug": ("title",)}


class PageImageReplacementInline(admin.TabularInline):
    model = PageImageReplacement
    extra = 0


class PageTextReplacementInline(admin.TabularInline):
    model = PageTextReplacement
    extra = 0


class PageVideoBlockInline(admin.TabularInline):
    model = PageVideoBlock
    extra = 0


@admin.register(PageAppearance)
class PageAppearanceAdmin(AuditedAdmin):
    list_display = ["page_path", "background_color", "background_url", "background_image", "updated_at"]
    search_fields = ["page_path"]
    inlines = [PageImageReplacementInline, PageTextReplacementInline, PageVideoBlockInline]

    def save_formset(self, request, form, formset, change):
        super().save_formset(request, form, formset, change)
        if formset.new_objects or formset.changed_objects or formset.deleted_objects:
            audit(
                request.user,
                f"content.{formset.model._meta.model_name}.saved",
                form.instance.pk,
                created=[str(obj.pk) for obj in formset.new_objects],
                updated=[str(obj.pk) for obj, _ in formset.changed_objects],
                deleted=[str(obj.pk) for obj in formset.deleted_objects],
            )


@admin.register(SiteMediaAsset)
class SiteMediaAssetAdmin(AuditedAdmin):
    list_display = ["id", "title", "kind", "file", "uploaded_by", "created_at"]
    list_filter = ["kind"]


admin.site.register(FAQ, AuditedAdmin)
