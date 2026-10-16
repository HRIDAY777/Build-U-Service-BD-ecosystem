"""Versioned extra-cost quotations. Acceptance records consent, never payment."""
from decimal import Decimal
from uuid import uuid4
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.engagement.models import Notification
from .models import Booking
from .services import audit


class QuoteLine(serializers.Serializer):
    description = serializers.CharField(max_length=180)
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"))


class QuoteInput(serializers.Serializer):
    revision = serializers.CharField(max_length=36, allow_blank=True)
    items = QuoteLine(many=True, allow_empty=False, max_length=20)
    note = serializers.CharField(max_length=1000, allow_blank=True, default="")


class QuoteDecision(serializers.Serializer):
    revision = serializers.CharField(max_length=36)
    decision = serializers.ChoiceField(choices=["accepted", "rejected"])


def public_quote(snapshot):
    """Expose quote facts only, never the surrounding audit metadata or actor."""
    if not isinstance(snapshot, dict):
        return {}
    result = {key: snapshot[key] for key in (
        "revision", "status", "note", "extra_total", "created_at", "decided_at",
    ) if key in snapshot}
    result["items"] = [
        {key: item[key] for key in ("description", "quantity", "unit_price", "total") if key in item}
        for item in snapshot.get("items", []) if isinstance(item, dict)
    ]
    return result


@transaction.atomic
def update_quote(user, booking_id, method, data):
    booking = Booking.objects.select_for_update().select_related("offering__division").get(pk=booking_id)
    if method == "PUT":
        if booking.provider_id != user.pk and not user.has_perm("operations.change_booking"):
            raise PermissionDenied()
    elif booking.customer_id != user.pk:
        raise PermissionDenied()
    if booking.offering.division.slug != "mechanic" or booking.status not in {
        "confirmed", "assigned", "on_the_way", "arrived", "in_progress", "waiting_for_parts",
    }:
        raise ValidationError("এই অবস্থায় কোটেশন পরিবর্তন করা যাবে না। / Quotation is unavailable at this stage.")
    form = (QuoteInput if method == "PUT" else QuoteDecision)(data=data)
    form.is_valid(raise_exception=True)
    values = form.validated_data
    previous = booking.mechanic_quote
    if values["revision"] != previous.get("revision", ""):
        raise ValidationError("কোটেশন বদলেছে। রিফ্রেশ করুন। / Quote changed. Refresh and review the latest version.")
    if method == "PUT":
        items = [{"description": item["description"], "quantity": item["quantity"],
                  "unit_price": str(item["unit_price"]),
                  "total": str(item["unit_price"] * item["quantity"])} for item in values["items"]]
        quote = {"revision": str(uuid4()), "status": "pending", "items": items,
                 "note": values["note"], "extra_total": str(sum((Decimal(item["total"]) for item in items), Decimal("0.00"))),
                 "created_at": timezone.now().isoformat()}
        target = booking.customer_id
        title = "Repair quotation ready"
    else:
        if not previous:
            raise ValidationError("No quotation is available.")
        if previous.get("status") == values["decision"]:
            return booking
        if previous.get("status") != "pending":
            raise ValidationError("এই কোটেশনের সিদ্ধান্ত দেওয়া হয়েছে। / This quotation already has a decision.")
        quote = {**previous, "status": values["decision"], "decided_at": timezone.now().isoformat()}
        target = booking.provider_id
        title = "Repair quotation reviewed"
    booking.mechanic_quote = quote
    booking.save(update_fields=["mechanic_quote"])
    audit(user, "booking.mechanic_quote_updated", booking.pk, previous=previous, quote=quote)
    if target:
        Notification.objects.create(user_id=target, title=title, body=f"Booking {booking.pk}")
    return booking
