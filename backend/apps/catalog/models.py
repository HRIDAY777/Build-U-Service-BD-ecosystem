from django.conf import settings
from django.db import models
from django.db.models import Q


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
    description = models.TextField(blank=True)
    opening_hours = models.CharField(max_length=180, blank=True)

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
    stock = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    prescription_required = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(default=60)
    image = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(price__gte=0), name="offering_price_nonnegative")]
        indexes = [models.Index(fields=["division", "active"])]

    def __str__(self):
        return self.name


class ServiceArea(models.Model):
    name = models.CharField(max_length=100, unique=True)
    name_bn = models.CharField(max_length=100)
    district = models.CharField(max_length=100, default="Dhaka")
    divisions = models.ManyToManyField(Division)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=60)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(delivery_fee__gte=0), name="area_fee_nonnegative")]
