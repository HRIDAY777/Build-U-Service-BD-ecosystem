"""Appointment windows and leave dates are interpreted in Bangladesh time."""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.core.exceptions import ValidationError
from django.utils import timezone


def validate_leave_dates(value):
    if not isinstance(value, list) or len(value) > 366:
        raise ValidationError("Choose up to 366 leave dates.")
    for day in value:
        try:
            if not isinstance(day, str) or date.fromisoformat(day).isoformat() != day:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValidationError("Use dates in YYYY-MM-DD format.") from None
    if len(set(value)) != len(value):
        raise ValidationError("Leave dates must be unique.")


def appointment_allowed(hours, leave_dates, start, duration):
    if duration < 1:
        return False
    zone = ZoneInfo("Asia/Dhaka")
    start = start.astimezone(zone)
    end = start + timedelta(minutes=duration)
    day = start.date()
    last = (end - timedelta(microseconds=1)).date()
    while day <= last:
        if day.isoformat() in leave_dates:
            return False
        day += timedelta(days=1)
    if not hours:
        return True  # Unconfigured schedule: manual confirmation remains necessary.
    for offset in (-1, 0):
        day = start.date() + timedelta(days=offset)
        for slot in hours.get(str(day.weekday()), []):
            opening = datetime.combine(day, time.fromisoformat(slot["open"]), zone)
            if slot["close"] == "24:00":
                closing = datetime.combine(day + timedelta(days=1), time(), zone)
            else:
                closing = datetime.combine(day, time.fromisoformat(slot["close"]), zone)
                if closing <= opening:
                    closing += timedelta(days=1)
            if opening <= start and end <= closing:
                return True
    return False


def suggested_appointments(offering, day, now=None):
    """Public service-hour suggestions, not reserved provider capacity."""
    if day.isoformat() in offering.service_leave_dates:
        return {"mode": "closed", "slots": []}
    if not offering.service_weekly_hours:
        return {"mode": "manual", "slots": []}
    zone = ZoneInfo("Asia/Dhaka")
    now = now or timezone.now()
    start = datetime.combine(day, time(), zone)
    slots = []
    for minute in range(0, 1440, 15):
        candidate = start + timedelta(minutes=minute)
        if candidate <= now:
            continue
        if appointment_allowed(offering.service_weekly_hours, offering.service_leave_dates,
                               candidate, offering.duration_minutes):
            slots.append({"start": candidate.isoformat(),
                          "end": (candidate + timedelta(minutes=offering.duration_minutes)).isoformat()})
    return {"mode": "hours" if slots else "closed", "slots": slots}
