from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from apps.engagement.models import Notification
from .models import Organization, PartnerApplication, PartnerDocument, PartnerExpiryReminder


def check_partner_renewal_alerts(user=None):
    today = timezone.localdate()
    documents = PartnerDocument.objects.filter(active=True, expires_on__lte=today + timedelta(days=30), application__status="approved", application__owner__is_active=True)
    if user is not None:
        documents = documents.filter(application__owner=user)
    created_count = 0
    for document_id, application_id in documents.values_list("pk", "application_id").iterator():
        with transaction.atomic():
            application = PartnerApplication.objects.select_for_update().get(pk=application_id)
            if not application.organization_id or application.status != "approved" or not application.owner.is_active:
                continue
            organization = Organization.objects.select_for_update().get(pk=application.organization_id)
            if not organization.approved or not organization.division.active or organization.owner_id != application.owner_id:
                continue
            latest = PartnerApplication.objects.filter(organization=organization, status="approved").order_by("-created_at", "-pk").values_list("pk", flat=True).first()
            if latest != application.pk:
                continue
            document = PartnerDocument.objects.get(pk=document_id)
            if not document.active or not document.expires_on or document.expires_on > today + timedelta(days=30):
                continue
            reminder, created = PartnerExpiryReminder.objects.get_or_create(document=document, expires_on=document.expires_on)
            if not created:
                continue
            notification = Notification.objects.create(
                user=application.owner,
                title="নথি নবায়ন প্রয়োজন / Document renewal reminder",
                body=f"{application.business_name}: নথির মেয়াদ / document expiry {document.expires_on.isoformat()}. নবায়নের আবেদন দেখুন / Review renewal at /partner-application. এই বিজ্ঞপ্তি ব্যবসা স্থগিত করে না / This reminder does not suspend your business.",
            )
            reminder.notification = notification
            reminder.save(update_fields=["notification"])
            created_count += 1
    return created_count
