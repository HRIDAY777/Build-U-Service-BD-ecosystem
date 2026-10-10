"""Appointment windows and leave dates are interpreted in Bangladesh time."""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.core.exceptions import ValidationError


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
