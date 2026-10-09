from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    language = models.CharField(max_length=2, choices=[("bn", "বাংলা"), ("en", "English")], default="bn")
    marketing_consent = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=60)
    recipient = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    district = models.CharField(max_length=80)
    area = models.CharField(max_length=100)
    line = models.CharField(max_length=500)
    postal_code = models.CharField(max_length=10, blank=True)


class ConsentLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    granted = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)


class AccountDeletionRequest(models.Model):
    STATUS_CHOICES = [("requested", "Requested"), ("reviewing", "Reviewing"), ("completed", "Completed"), ("rejected", "Rejected")]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="deletion_request")
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="requested")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
