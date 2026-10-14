import re
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.core.validators import MaxValueValidator, MinValueValidator, URLValidator
from .restaurant_rules import validate_weekly_hours
from .service_schedule import validate_leave_dates


def validate_public_media_url(value):
    if value.startswith("https://"):
        try:
            URLValidator(schemes=["https"])(value)
        except ValidationError as error:
            raise ValidationError("Enter a valid HTTPS URL.") from error
        return
    if value.startswith(("/images/", "/videos/")):
        valid_local_path = re.fullmatch(
            r"/(?:images|videos)/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+",
            value,
        ) and not any(part in {".", ".."} for part in value.split("/"))
        if valid_local_path:
            return
        raise ValidationError("Enter a valid bundled media path.")
    raise ValidationError(
        "Use an HTTPS URL or a bundled /images/ or /videos/ path."
    )


class PartnerApplication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    division = models.ForeignKey("Division", on_delete=models.PROTECT)
    business_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=20)
    area = models.CharField(max_length=100)
    address = models.CharField(max_length=500)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=20, default="submitted", choices=[
        (value, value) for value in ["submitted", "reviewing", "needs_changes", "approved", "rejected", "cancelled"]
    ])
    review_note = models.CharField(max_length=2000, blank=True)
    verification_reference = models.CharField(max_length=160, blank=True)
    organization = models.ForeignKey("Organization", null=True, blank=True, on_delete=models.PROTECT)
    renewal_of = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="renewals")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


def partner_document_path(instance, filename):
    return f"private/partners/{instance.application_id}/{uuid.uuid4()}.pdf"


class PartnerDocument(models.Model):
    application = models.ForeignKey(PartnerApplication, on_delete=models.PROTECT, related_name="documents")
    title = models.CharField(max_length=160)
    file = models.FileField(upload_to=partner_document_path)
    sha256 = models.CharField(max_length=64)
    expires_on = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    review_status = models.CharField(max_length=12, default="pending", choices=[("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected")])
    review_note = models.CharField(max_length=2000, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PartnerExpiryReminder(models.Model):
    document = models.ForeignKey(PartnerDocument, on_delete=models.PROTECT)
    expires_on = models.DateField()
    notification = models.OneToOneField("engagement.Notification", null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["document", "expires_on"], name="unique_partner_expiry_reminder")]


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
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="subcategories")

    def clean(self):
        super().clean()
        if self.parent_id:
            if self.parent_id == self.pk or self.parent.division_id != self.division_id or self.parent.parent_id:
                raise ValidationError({"parent": "Choose a top-level category in the same division."})
            if self.pk and self.subcategories.exists():
                raise ValidationError({"parent": "A category with children must remain top-level."})

    def __str__(self):
        return self.name


class ShopBrand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    name_bn = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ShopCollection(models.Model):
    name = models.CharField(max_length=100)
    name_bn = models.CharField(max_length=100, blank=True)
    slug = models.SlugField(unique=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Offering(models.Model):
    brand = models.ForeignKey(ShopBrand, null=True, blank=True, on_delete=models.SET_NULL)
    collections = models.ManyToManyField(ShopCollection, blank=True, related_name="products")
    barcode = models.CharField(max_length=80, blank=True, db_index=True)
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
    service_weekly_hours = models.JSONField(default=dict, blank=True, validators=[validate_weekly_hours])
    service_leave_dates = models.JSONField(default=list, blank=True, validators=[validate_leave_dates])
    image = models.CharField(max_length=1000, blank=True)
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
            models.UniqueConstraint(fields=["barcode"], condition=~Q(barcode=""), name="offering_barcode_unique"),
        ]
        indexes = [models.Index(fields=["division", "active"])]

    @property
    def current_price(self):
        return self.sale_price if self.sale_price is not None else self.price

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.category_id and self.category.division_id != self.division_id:
            raise ValidationError({"category": "Choose a category in the same division."})
        if self.brand_id and self.division.slug != "shop":
            raise ValidationError({"brand": "Brands apply only to U Shop products."})
        if self.image:
            try:
                validate_public_media_url(self.image)
            except ValidationError as error:
                raise ValidationError({"image": error.messages}) from error
        if self.barcode and ProductVariant.objects.filter(barcode=self.barcode).exists():
            raise ValidationError(
                {"barcode": "This barcode is already used by a product variant."}
            )
        if self.pk and self.division.slug != "shop" and self.collections.exists():
            raise ValidationError(
                {"collections": "Collections apply only to U Shop products."}
            )


class ProductVariant(models.Model):
    barcode = models.CharField(max_length=80, blank=True, db_index=True)
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
            models.UniqueConstraint(fields=["barcode"], condition=~Q(barcode=""), name="variant_barcode_unique"),
        ]

    @property
    def current_price(self):
        return self.sale_price if self.sale_price is not None else self.price

    def __str__(self):
        return f"{self.offering.name} - {self.label}"

    def clean(self):
        super().clean()
        if self.barcode and Offering.objects.filter(barcode=self.barcode).exists():
            raise ValidationError(
                {"barcode": "This barcode is already used by a product."}
            )


class OfferingMedia(models.Model):
    offering = models.ForeignKey(Offering, on_delete=models.CASCADE, related_name="media")
    kind = models.CharField(max_length=8, choices=[("image", "Image"), ("video", "Video")])
    url = models.CharField(max_length=1000)
    alt = models.CharField(max_length=180, blank=True)
    alt_bn = models.CharField(max_length=180, blank=True)
    position = models.PositiveSmallIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["position", "pk"]

    def clean(self):
        super().clean()
        try:
            validate_public_media_url(self.url)
        except ValidationError as error:
            raise ValidationError({"url": error.messages}) from error
        if self.offering_id and self.offering.division.slug != "shop":
            raise ValidationError({"offering": "Choose a U Shop product."})


@receiver(m2m_changed, sender=Offering.collections.through)
def validate_shop_collection_assignment(sender, instance, action, reverse, pk_set, **kwargs):
    if action != "pre_add" or not pk_set:
        return
    if reverse:
        invalid = Offering.objects.filter(pk__in=pk_set).exclude(
            division__slug="shop"
        )
        if invalid.exists():
            raise ValidationError("Collections apply only to U Shop products.")
    elif instance.division.slug != "shop":
        raise ValidationError("Collections apply only to U Shop products.")


class FoodOptionGroup(models.Model):
    offering = models.ForeignKey(Offering, on_delete=models.CASCADE, related_name="food_option_groups")
    name = models.CharField(max_length=100)
    name_bn = models.CharField(max_length=100, blank=True)
    min_choices = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(20)])
    max_choices = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(20)])
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(min_choices__lte=models.F("max_choices"), max_choices__gte=1, max_choices__lte=20), name="food_group_choice_limits")]

    def clean(self):
        super().clean()
        if self.offering_id and self.offering.division.slug != "food":
            raise ValidationError({"offering": "Choose a food offering."})

    def __str__(self):
        return f"{self.offering.name} · {self.name}"


class FoodOption(models.Model):
    group = models.ForeignKey(FoodOptionGroup, on_delete=models.CASCADE, related_name="options")
    name = models.CharField(max_length=100)
    name_bn = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(price__gte=0), name="food_option_price_nonnegative")]

    def __str__(self):
        return self.name


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
