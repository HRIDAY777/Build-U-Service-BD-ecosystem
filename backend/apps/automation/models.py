import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class OutboxEvent(models.Model):
    next_attempt_at = models.DateTimeField(default=timezone.now, null=True, db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.CharField(max_length=80)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    payload = models.JSONField(default=dict)
    processed_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AutomationRule(models.Model):
    name = models.CharField(max_length=140)
    trigger = models.CharField(max_length=80)
    active = models.BooleanField(default=True)
    conditions = models.JSONField(
        default=dict, help_text='Exact matches on event fields, e.g. {"payment_method": "cod"}'
    )
    action = models.CharField(
        max_length=30,
        choices=[
            ("notify", "In-app notification"),
            ("crm", "CRM activity"),
            ("email", "Transactional email"),
        ],
    )
    template = models.TextField(help_text="Plain text. Event reference appended automatically.")


class AutomationRun(models.Model):
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    event = models.ForeignKey(OutboxEvent, on_delete=models.CASCADE)
    rule = models.ForeignKey(AutomationRule, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, default="pending")
    attempts = models.PositiveIntegerField(default=0)
    attempt_limit = models.PositiveIntegerField(default=5)
    error = models.CharField(max_length=500, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        permissions = [("retry_automationrun", "Can authorize one extra automation attempt")]
        constraints = [models.UniqueConstraint(fields=["event", "rule"], name="automation_deduplication")]


class KnowledgeDocument(models.Model):
    title = models.CharField(max_length=160)
    text = models.TextField()
    public = models.BooleanField(default=False)
    approved = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class AIUsage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    model = models.CharField(max_length=100)
    tokens = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default="reserved")
    created_at = models.DateTimeField(auto_now_add=True)
