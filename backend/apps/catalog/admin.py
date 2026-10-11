from django.contrib import admin
from apps.operations.admin import ReadOnlyAdmin
from .models import PartnerApplication, PartnerDocument
from apps.operations.services import audit
from .models import Division, Organization, Offering, ProductVariant, Category, ServiceArea, FoodOptionGroup, FoodOption


@admin.register(PartnerApplication)
class PartnerApplicationAdmin(ReadOnlyAdmin):
    list_display = ["business_name", "division", "status", "created_at"]
    list_filter = ["status", "division"]
    search_fields = ["business_name", "verification_reference"]


@admin.register(PartnerDocument)
class PartnerDocumentAdmin(ReadOnlyAdmin):
    list_display = ["title", "application", "review_status", "reviewed_at", "expires_on", "active"]
    # Storage paths are not usable public links; downloads use the scoped API.
    exclude = ["file"]


class AuditedAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        audit(request.user, f"{obj._meta.label_lower}.saved", obj.pk, fields=form.changed_data)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    fields = ["label", "attributes", "sku", "price", "sale_price", "cost_price", "stock", "active"]


class FoodOptionGroupInline(admin.TabularInline):
    model = FoodOptionGroup
    extra = 0
    show_change_link = True


class FoodOptionInline(admin.TabularInline):
    model = FoodOption
    extra = 0


@admin.register(FoodOptionGroup)
class FoodOptionGroupAdmin(AuditedAdmin):
    list_display = ["name", "offering", "min_choices", "max_choices", "active"]
    inlines = [FoodOptionInline]


@admin.register(Offering)
class OfferingAdmin(AuditedAdmin):
    list_display = ["name", "division", "organization", "price", "stock", "active", "prescription_required"]
    list_filter = ["division", "active", "prescription_required"]
    search_fields = ["name", "name_bn", "sku"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline, FoodOptionGroupInline]
    fields = [
        "division",
        "organization",
        "category",
        "name",
        "name_bn",
        "slug",
        "description",
        "description_bn",
        "sku",
        "price",
        "sale_price",
        "cost_price",
        "stock",
        "active",
        "prescription_required",
        "duration_minutes",
        "image",
    ]

    def get_readonly_fields(self, request, obj=None):
        return ["stock"] if obj else []


@admin.register(Organization)
class OrganizationAdmin(AuditedAdmin):
    list_display = ["name", "division", "owner", "approved", "area", "address"]
    list_filter = ["division", "approved"]
    search_fields = ["name", "area", "address"]

    class Media:
        js = ["catalog/location-picker.js"]


admin.site.register(Division, AuditedAdmin)
admin.site.register(Category, AuditedAdmin)
@admin.register(ServiceArea)
class ServiceAreaAdmin(AuditedAdmin):
    class Media:
        js = ["catalog/location-picker.js"]
