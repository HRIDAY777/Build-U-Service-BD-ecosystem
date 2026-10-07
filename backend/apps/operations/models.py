import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q


class Coupon(models.Model):
    code = models.CharField(max_length=40, unique=True)
    division = models.ForeignKey("catalog.Division", null=True, blank=True, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    minimum = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    limit = models.PositiveIntegerField(default=100)
    used = models.PositiveIntegerField(default=0)
    per_user_limit = models.PositiveIntegerField(default=1)
    expires_at = models.DateTimeField()
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(amount__gte=0), name="coupon_amount_nonnegative")]


class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    division = models.ForeignKey("catalog.Division", on_delete=models.PROTECT)
    organization = models.ForeignKey("catalog.Organization", null=True, on_delete=models.PROTECT)
    rider = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="deliveries"
    )
    status = models.CharField(max_length=30, default="placed", db_index=True)
    address = models.JSONField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.PROTECT)
    payment_method = models.CharField(max_length=20, default="cod")
    payment_status = models.CharField(max_length=20, default="unpaid")
    idempotency_key = models.CharField(max_length=80)
    request_hash = models.CharField(max_length=64)
    notes = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["customer", "idempotency_key"], name="order_idempotency"),
            models.CheckConstraint(condition=Q(total__gte=0), name="order_total_nonnegative"),
        ]
        indexes = [models.Index(fields=["customer", "-created_at"])]


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    offering = models.ForeignKey("catalog.Offering", on_delete=models.PROTECT)
    name = models.CharField(max_length=180)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)


class InventoryMovement(models.Model):
    offering = models.ForeignKey("catalog.Offering", on_delete=models.PROTECT)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, null=True)
    delta = models.IntegerField()
    reason = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)


class Prescription(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="prescription")
    document = models.FileField(upload_to="prescriptions/%Y/%m/")
    status = models.CharField(max_length=20, default="pending")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT)
    review_note = models.CharField(max_length=1000, blank=True)
    reviewed_at = models.DateTimeField(null=True)


class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings")
    offering = models.ForeignKey("catalog.Offering", on_delete=models.PROTECT)
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="jobs"
    )
    scheduled_at = models.DateTimeField()
    address = models.JSONField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="pending", db_index=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    idempotency_key = models.CharField(max_length=80)
    request_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["customer", "idempotency_key"], name="booking_idempotency")
        ]


class DeliveryRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    rider = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="parcels"
    )
    pickup = models.JSONField()
    dropoff = models.JSONField()
    description = models.CharField(max_length=500)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)
    fee = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=30, default="requested")
    created_at = models.DateTimeField(auto_now_add=True)


class StatusEvent(models.Model):
    entity_type = models.CharField(max_length=30)
    entity_id = models.CharField(max_length=50, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    before = models.CharField(max_length=30)
    after = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)


class Payment(models.Model):
    checkout_url = models.URLField(max_length=1000, blank=True)
    session_key = models.CharField(max_length=100, blank=True)
    validation_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    reference = models.CharField(max_length=100, unique=True)
    provider = models.CharField(max_length=30)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, default="pending")
    verified_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Refund(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="refunds")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, default="requested")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=100)
    entity = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
