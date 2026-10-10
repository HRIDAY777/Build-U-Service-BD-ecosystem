import uuid
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class ManagedProject(models.Model):
    title = models.CharField(max_length=180)
    title_bn = models.CharField(max_length=180, blank=True)
    category = models.CharField(max_length=40, choices=[(v, v.title()) for v in ["construction", "electrical", "solar", "finishing"]])
    area = models.CharField(max_length=180)
    description = models.TextField()
    description_bn = models.TextField(blank=True)
    image = models.URLField(blank=True)
    published = models.BooleanField(default=False)
    progress = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(100)])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class ProjectApplication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=20, choices=[("investor", "Investor"), ("client", "Client")])
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    address = models.TextField(max_length=2000)
    details = models.TextField(max_length=5000)
    package = models.CharField(max_length=30, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(1)])
    months = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(40)])
    expected_total = models.DecimalField(max_digits=12, decimal_places=2)
    terms_version = models.CharField(max_length=40, default="proposal-2026-10-v1")
    status = models.CharField(max_length=20, default="submitted", choices=[(v, v.title()) for v in ["submitted", "reviewing", "approved", "active", "completed", "rejected", "cancelled"]])
    project = models.ForeignKey(ManagedProject, on_delete=models.PROTECT, null=True, blank=True)
    agreement_reference = models.CharField(max_length=180, blank=True)
    review_note = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    agreement_file = models.FileField(upload_to="private/project-agreements/", blank=True)
    agreement_sha256 = models.CharField(max_length=64, blank=True)
    signed_name = models.CharField(max_length=120, blank=True)
    acceptance_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    request_key = models.UUIDField(unique=True)

    def __str__(self):
        return f"{self.kind}: {self.name} ({self.id})"


class ProjectEntry(models.Model):
    application = models.ForeignKey(ProjectApplication, on_delete=models.PROTECT, related_name="entries")
    kind = models.CharField(max_length=20, choices=[("receipt", "Receipt"), ("distribution", "Distribution"), ("refund", "Refund")])
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    reference = models.CharField(max_length=180, unique=True)
    date = models.DateField()
    note = models.CharField(max_length=1000, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)


class ProjectUpdate(models.Model):
    project = models.ForeignKey(ManagedProject, on_delete=models.CASCADE, related_name="updates")
    title = models.CharField(max_length=180)
    title_bn = models.CharField(max_length=180, blank=True)
    description = models.TextField()
    description_bn = models.TextField(blank=True)
    date = models.DateField()
    public = models.BooleanField(default=False)
