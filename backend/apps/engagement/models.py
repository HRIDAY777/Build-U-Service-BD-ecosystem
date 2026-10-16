from django.conf import settings
from django.db import models
from django.db.models import Q
from .project_models import ManagedProject, ProjectApplication, ProjectEntry, ProjectUpdate  # noqa: F401


class Lead(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    interest = models.CharField(max_length=80)
    message = models.TextField()
    source = models.CharField(max_length=100, default="website")
    status = models.CharField(max_length=30, default="new")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    follow_up_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class SupportTicket(models.Model):
    category = models.CharField(max_length=20, default="general", choices=[
        ("general", "General"), ("order", "Order"), ("booking", "Booking"),
        ("delivery", "Delivery"), ("payment", "Payment"), ("account", "Account"),
    ])
    priority = models.CharField(max_length=10, default="normal", choices=[
        ("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent"),
    ])
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name="support_assignments")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    subject = models.CharField(max_length=180)
    message = models.TextField()
    status = models.CharField(max_length=20, default="open")
    response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class SupportMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    sender_role = models.CharField(max_length=20, choices=[("customer", "Customer"), ("team", "Team")])
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class Review(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    order = models.OneToOneField("operations.Order", null=True, blank=True, on_delete=models.PROTECT)
    booking = models.OneToOneField("operations.Booking", null=True, blank=True, on_delete=models.PROTECT)
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(rating__gte=1, rating__lte=5), name="review_rating_range"),
            models.CheckConstraint(
                condition=(
                    Q(order__isnull=False, booking__isnull=True)
                    | Q(order__isnull=True, booking__isnull=False)
                ),
                name="review_one_target",
            ),
        ]


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    body = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class CRMActivity(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=50)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class LoyaltyEntry(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    points = models.IntegerField()
    reference = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LoyaltyReward(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    points_cost = models.PositiveIntegerField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LoyaltyRedemption(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reward = models.ForeignKey(LoyaltyReward, on_delete=models.PROTECT)
    points_spent = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
