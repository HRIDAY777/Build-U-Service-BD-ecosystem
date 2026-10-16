"""Public availability preview; never exposes worker identities or reserves a slot."""
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.db.models import Q
from apps.catalog.service_schedule import appointment_allowed
from .models import Booking, ProviderProfile


def available_slots(offering, area, slots):
    if not slots:
        return []
    workers = get_user_model().objects.filter(is_active=True, groups__name="Provider").exclude(
        providerprofile__available=False,
    ).filter(
        Q(providerprofile__isnull=True) | Q(providerprofile__restrict_service_areas=False)
        | Q(providerprofile__service_areas=area.pk),
    ).distinct()
    if offering.qualified_provider_required:
        workers = workers.filter(providerprofile__approved_services=offering.pk)
    worker_ids = list(workers.values_list("pk", flat=True))
    profiles = {profile.user_id: profile for profile in ProviderProfile.objects.filter(user_id__in=worker_ids)}
    appointments = {worker_id: [] for worker_id in worker_ids}
    latest = max(datetime.fromisoformat(slot["end"]) for slot in slots)
    for job in Booking.objects.filter(provider_id__in=worker_ids, scheduled_at__lt=latest).exclude(
        status__in=["cancelled", "completed", "failed"],
    ).only("provider_id", "scheduled_at", "duration_minutes"):
        appointments[job.provider_id].append((job.scheduled_at, job.scheduled_at + timedelta(minutes=job.duration_minutes)))
    result = []
    for slot in slots:
        start, end = datetime.fromisoformat(slot["start"]), datetime.fromisoformat(slot["end"])
        for worker_id in worker_ids:
            profile = profiles.get(worker_id)
            if profile and not appointment_allowed(profile.weekly_hours, profile.leave_dates, start, offering.duration_minutes):
                continue
            if not any(before < end and after > start for before, after in appointments[worker_id]):
                result.append(slot)
                break
    return result
