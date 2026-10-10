import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.core.validators import MinValueValidator, MaxValueValidator
from .restaurant_rules import validate_weekly_hours


class Division(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    name_bn = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    kind = models.CharField(
        max_length=12, choices=[("goods", "Goods"), ("service", "Service"), ("delivery", "Delivery")]
    )
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Organization(models.Model):
    name = models.CharField(max_length=160)
    division = models.ForeignKey(Division, on_delete=models.PROTECT)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    approved = models.BooleanField(default=False)
    area = models.CharField(max_length=100)
    address = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    opening_hours = models.CharField(max_length=180, blank=True)
    accepting_orders = models.BooleanField(default=True)
    weekly_hours = models.JSONField(default=dict, blank=True, validators=[validate_weekly_hours])
    minimum_order = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    preparation_minutes = models.PositiveIntegerField(default=30, validators=[MinValueValidator(1), MaxValueValidator(360)])

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(minimum_order__gte=0), name="organization_minimum_nonnegative"),
            models.CheckConstraint(condition=Q(preparation_minutes__gte=1, preparation_minutes__lte=360), name="organization_preparation_valid"),
        ]

    def __str__(self):
        return self.name


class Category(models.Model):
    division = models.ForeignKey(Division, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    name_bn = models.CharField(max_length=100)


class Offering(models.Model):
    division = models.ForeignKey(Division, on_delete=models.PROTECT)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=180)
    name_bn = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    description_bn = models.TextField(blank=True)
    sku = models.CharField(max_length=80, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    prescription_required = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(default=60)
    image = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=0), name="offering_price_nonnegative"),
            models.CheckConstraint(
                condition=Q(sale_price__isnull=True)
                | Q(sale_price__gte=0, sale_price__lte=models.F("price")),
                name="offering_sale_price_valid",
            ),
            models.CheckConstraint(
                condition=Q(cost_price__isnull=True) | Q(cost_price__gte=0),
                name="offering_cost_price_nonnegative",
            ),
        ]
        indexes = [models.Index(fields=["division", "active"])]

    @property
    def current_price(self):
        return self.sale_price if self.sale_price is not None else self.price

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    offering = models.ForeignKey(Offering, on_delete=models.CASCADE, related_name="variants")
    label = models.CharField(max_length=120)
    attributes = models.JSONField(default=dict, blank=True)
    sku = models.CharField(max_length=80, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=0), name="variant_price_nonnegative"),
            models.CheckConstraint(
                condition=Q(sale_price__isnull=True)
                | Q(sale_price__gte=0, sale_price__lte=models.F("price")),
                name="variant_sale_price_valid",
            ),
            models.CheckConstraint(
                condition=Q(cost_price__isnull=True) | Q(cost_price__gte=0),
                name="variant_cost_price_nonnegative",
            ),
            models.UniqueConstraint(fields=["offering", "label"], name="offering_variant_label_unique"),
        ]

    @property
    def current_price(self):
        return self.sale_price if self.sale_price is not None else self.price

    def __str__(self):
        return f"{self.offering.name} - {self.label}"


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist_items"
    )
    offering = models.ForeignKey(Offering, on_delete=models.CASCADE, related_name="wishlist_items")
    created_at = models.DateTimeField(auto_now_add=True)
    price_alert = models.BooleanField(default=False)
    restock_alert = models.BooleanField(default=False)
    observed_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    observed_stock = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "offering"], name="wishlist_user_offering_unique")
        ]
        ordering = ["-created_at"]


class WishlistShare(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)


class ServiceArea(models.Model):
    name = models.CharField(max_length=100, unique=True)
    name_bn = models.CharField(max_length=100)
    district = models.CharField(max_length=100, default="Dhaka")
    divisions = models.ManyToManyField(Division)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=60)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(delivery_fee__gte=0), name="area_fee_nonnegative")]
