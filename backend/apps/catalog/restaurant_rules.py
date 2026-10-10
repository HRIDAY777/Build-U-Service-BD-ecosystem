"""Restaurant hours use Asia/Dhaka, independent of browser/server timezone."""

import re
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.utils import timezone


def validate_weekly_hours(value):
    if not isinstance(value, dict) or set(value) - {str(day) for day in range(7)}:
        raise ValidationError("Hours must use weekdays 0 (Monday) through 6 (Sunday).")
    for slots in value.values():
        if not isinstance(slots, list) or len(slots) > 8:
            raise ValidationError("Choose up to eight opening periods per weekday.")
        for slot in slots:
            if not isinstance(slot, dict) or set(slot) != {"open", "close"}:
                raise ValidationError("Each opening period needs open and close times.")
            if any(
                not isinstance(t, str)
                or not (
                    re.fullmatch(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]", t) or (key == "close" and t == "24:00")
                )
                for key, t in slot.items()
            ):
                raise ValidationError("Use valid 24-hour times, for example 09:30.")
            if slot["open"] == slot["close"]:
                raise ValidationError("Opening and closing times must differ.")


def restaurant_status(organization, now=None):
    local = (now or timezone.now()).astimezone(ZoneInfo("Asia/Dhaka"))
    schedule = organization.weekly_hours
    is_open = None
    if schedule:
        minute = local.hour * 60 + local.minute
        day = local.weekday()
        is_open = False
        for offset in (0, -1):
            for slot in schedule.get(str((day + offset) % 7), []):
                opening = sum(int(v) * factor for v, factor in zip(slot["open"].split(":"), (60, 1)))
                closing = sum(int(v) * factor for v, factor in zip(slot["close"].split(":"), (60, 1)))
                if offset == 0:
                    is_open |= opening <= minute < closing if opening < closing else minute >= opening
                elif opening > closing:
                    is_open |= minute < closing
    return {
        "is_open": is_open,
        "hours_configured": bool(schedule),
        "can_order": organization.accepting_orders and is_open is not False,
        "paused": not organization.accepting_orders,
        "timezone": "Asia/Dhaka",
    }
