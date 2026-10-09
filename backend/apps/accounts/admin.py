from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AccountDeletionRequest, User, Address, ConsentLog


@admin.register(User)
class AccountAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("U Service profile", {"fields": ("phone", "language", "marketing_consent")}),
    )


admin.site.register(Address)


@admin.register(AccountDeletionRequest)
class DeletionRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "status", "created_at", "updated_at"]
    list_filter = ["status"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["user", "reason", "created_at", "updated_at"]


@admin.register(ConsentLog)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ["user", "granted", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
