from django.conf import settings
from django.db import models
from django.db.models import Q


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
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    subject = models.CharField(max_length=180)
    message = models.TextField()
    status = models.CharField(max_length=20, default="open")
    response = models.TextField(blank=True)
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
