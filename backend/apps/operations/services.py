import hashlib
import json
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.catalog.models import Offering, ServiceArea
from apps.automation.models import OutboxEvent
from apps.engagement.models import LoyaltyEntry
from .models import (
    Order,
    OrderItem,
    Coupon,
    InventoryMovement,
    AuditLog,
    StatusEvent,
    Booking,
    Prescription,
    Payment,
)


def fingerprint(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()


def audit(user, action, entity, **metadata):
    AuditLog.objects.create(actor=user, action=action, entity=str(entity), metadata=metadata)


def emit(user, topic, **payload):
    OutboxEvent.objects.create(user=user, topic=topic, payload=payload)


def validate_area(address, division):
    area = ServiceArea.objects.filter(name=address["area"], active=True, divisions=division).first()
    if not area:
        raise ValidationError("This division does not serve the selected area.")
    return area


@transaction.atomic
def checkout(user, data, key, preview=False):
    get_user_model().objects.select_for_update().get(pk=user.pk)
    digest = fingerprint(data)
    previous = Order.objects.filter(customer=user, idempotency_key=key).first()
    if previous:
        if previous.request_hash != digest:
            raise ValidationError("This checkout key was already used with different details.")
        return previous
    if data.get("payment_method", "cod") == "sslcommerz":
        from .payments import configured

        if not configured():
            raise ValidationError("Online payments are not configured.")
    quantities = {}
    for item in data["items"]:
        quantities[item["offering"]] = quantities.get(item["offering"], 0) + item["quantity"]
    products = list(
        Offering.objects.select_for_update().filter(id__in=quantities, active=True).order_by("id")
    )
    if not products or len(products) != len(quantities):
        raise ValidationError("One or more items are unavailable.")
    division = products[0].division
    organization_id = products[0].organization_id
    if division.kind != "goods" or not division.active:
        raise ValidationError("Use the booking form for services.")
    for product in products:
        if product.division_id != division.id or product.organization_id != organization_id:
            raise ValidationError("Each checkout must contain items from one division and one merchant.")
        if product.organization and not product.organization.approved:
            raise ValidationError("This merchant is not approved.")
        if product.stock < quantities[product.id]:
            raise ValidationError(f"Insufficient stock for {product.name}.")
    area = validate_area(data["address"], division)
    subtotal = sum((p.price * quantities[p.id] for p in products), Decimal("0"))
    discount = Decimal("0")
    coupon = None
    if data.get("coupon"):
        coupon = Coupon.objects.select_for_update().filter(code=data["coupon"].upper(), active=True).first()
        if not coupon or coupon.expires_at <= timezone.now() or coupon.used >= coupon.limit:
            raise ValidationError("Coupon is unavailable or expired.")
        if coupon.division_id and coupon.division_id != division.id:
            raise ValidationError("Coupon does not apply to this division.")
        if (
            subtotal < coupon.minimum
            or Order.objects.filter(customer=user, coupon=coupon).count() >= coupon.per_user_limit
        ):
            raise ValidationError("Coupon minimum spend or usage limit not met.")
        discount = min(subtotal, coupon.amount)
        if not preview:
            coupon.used = F("used") + 1
            coupon.save(update_fields=["used"])
    total = subtotal - discount + area.delivery_fee
    if preview:
        return {
            "subtotal": str(subtotal),
            "discount": str(discount),
            "delivery_fee": str(area.delivery_fee),
            "total": str(total),
        }
    if "expected_total" in data and data["expected_total"] != total:
        raise ValidationError("The total changed. Review a fresh quote before placing your order.")
    prescription_needed = any(p.prescription_required for p in products)
    order = Order.objects.create(
        customer=user,
        division=division,
        organization_id=organization_id,
        address=data["address"],
        subtotal=subtotal,
        discount=discount,
        delivery_fee=area.delivery_fee,
        total=subtotal - discount + area.delivery_fee,
        coupon=coupon,
        idempotency_key=key,
        request_hash=digest,
        notes=data.get("notes", ""),
        payment_method=data.get("payment_method", "cod"),
        status="prescription_pending" if prescription_needed else "placed",
    )
    for product in products:
        quantity = quantities[product.id]
        changed = Offering.objects.filter(pk=product.pk, stock__gte=quantity).update(
            stock=F("stock") - quantity
        )
        if not changed:
            raise ValidationError("Stock changed. Please try again.")
        OrderItem.objects.create(
            order=order, offering=product, name=product.name, quantity=quantity, unit_price=product.price
        )
        InventoryMovement.objects.create(
            offering=product, order=order, delta=-quantity, reason="order_reserved"
        )
    StatusEvent.objects.create(
        entity_type="order", entity_id=str(order.pk), actor=user, before="", after=order.status
    )
    audit(user, "order.created", order.pk, total=str(order.total))
    emit(
        user,
        "order.created",
        reference=str(order.pk),
        total=str(order.total),
        payment_method=order.payment_method,
    )
    return order


ORDER_TRANSITIONS = {
    "prescription_pending": {"cancelled"},
    "placed": {"accepted", "cancelled", "rejected"},
    "accepted": {"preparing", "ready", "cancelled"},
    "preparing": {"ready", "cancelled"},
    "ready": {"picked_up", "cancelled"},
    "picked_up": {"in_transit", "failed"},
    "in_transit": {"delivered", "failed"},
    "failed": {"returned"},
}
BOOKING_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"assigned", "cancelled"},
    "assigned": {"on_the_way", "cancelled"},
    "on_the_way": {"arrived", "cancelled"},
    "arrived": {"in_progress", "cancelled"},
    "in_progress": {"waiting_for_parts", "completed", "failed"},
    "waiting_for_parts": {"in_progress", "cancelled"},
}
DELIVERY_TRANSITIONS = {
    "requested": {"confirmed", "cancelled"},
    "confirmed": {"assigned", "cancelled"},
    "assigned": {"picked_up", "cancelled"},
    "picked_up": {"in_transit", "failed"},
    "in_transit": {"delivered", "failed"},
    "failed": {"returned"},
}


@transaction.atomic
def transition(user, model, pk, new_status):
    obj = model.objects.select_for_update().get(pk=pk)
    kind = "order" if model == Order else "booking" if model == Booking else "delivery"
    transitions = {
        "order": ORDER_TRANSITIONS,
        "booking": BOOKING_TRANSITIONS,
        "delivery": DELIVERY_TRANSITIONS,
    }[kind]
    if new_status not in transitions.get(obj.status, set()):
        raise ValidationError(f"Cannot change {obj.status} to {new_status}.")
    if (
        kind == "order"
        and obj.payment_method == "sslcommerz"
        and obj.payment_status != "paid"
        and new_status not in {"cancelled", "rejected"}
    ):
        raise ValidationError("Verified online payment is required before fulfillment.")
    manager = user.has_perm(f"operations.change_{model._meta.model_name}")
    partner = kind == "order" and obj.organization_id and obj.organization.owner_id == user.id
    assigned = getattr(obj, "rider_id", None) == user.id or getattr(obj, "provider_id", None) == user.id
    customer_cancel = (
        obj.customer_id == user.id
        and new_status == "cancelled"
        and obj.status in {"placed", "prescription_pending", "pending", "requested"}
    )
    partner_allowed = partner and new_status in {"accepted", "preparing", "ready", "rejected"}
    worker_allowed = assigned and new_status in {
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
        "returned",
        "on_the_way",
        "arrived",
        "in_progress",
        "waiting_for_parts",
        "completed",
    }
    if not (manager or customer_cancel or partner_allowed or worker_allowed):
        raise PermissionDenied("You cannot perform this transition.")
    if kind == "order" and new_status == "picked_up" and not obj.rider_id:
        raise ValidationError("Assign a rider before pickup.")
    if (
        kind in {"booking", "delivery"}
        and new_status == "assigned"
        and not (getattr(obj, "provider_id", None) or getattr(obj, "rider_id", None))
    ):
        raise ValidationError("Assign an eligible worker first.")
    before = obj.status
    obj.status = new_status
    obj.save(update_fields=["status"])
    if kind == "order" and new_status in {"cancelled", "rejected", "returned"}:
        for item in obj.items.all():
            Offering.objects.filter(pk=item.offering_id).update(stock=F("stock") + item.quantity)
            InventoryMovement.objects.create(
                offering=item.offering, order=obj, delta=item.quantity, reason=new_status
            )
    if kind == "order" and new_status == "delivered":
        LoyaltyEntry.objects.get_or_create(
            reference=f"order:{obj.pk}", defaults={"customer": obj.customer, "points": int(obj.total // 100)}
        )
    StatusEvent.objects.create(
        entity_type=kind, entity_id=str(obj.pk), actor=user, before=before, after=new_status
    )
    audit(user, f"{kind}.status", obj.pk, before=before, after=new_status)
    emit(obj.customer, f"{kind}.{new_status}", reference=str(obj.pk))
    return obj


@transaction.atomic
def book(user, data, key):
    get_user_model().objects.select_for_update().get(pk=user.pk)
    digest = fingerprint(data)
    previous = Booking.objects.filter(customer=user, idempotency_key=key).first()
    if previous:
        if previous.request_hash != digest:
            raise ValidationError("This booking key was already used with different details.")
        return previous
    offering = Offering.objects.filter(
        pk=data["offering"], active=True, division__active=True, division__kind="service"
    ).first()
    if not offering:
        raise ValidationError("Service not available.")
    if data["scheduled_at"] <= timezone.now():
        raise ValidationError("Choose a future appointment.")
    validate_area(data["address"], offering.division)
    booking = Booking.objects.create(
        customer=user,
        offering=offering,
        scheduled_at=data["scheduled_at"],
        address=data["address"],
        notes=data.get("notes", ""),
        price=offering.price,
        idempotency_key=key,
        request_hash=digest,
    )
    audit(user, "booking.created", booking.pk)
    emit(user, "booking.created", reference=str(booking.pk))
    return booking


@transaction.atomic
def review_prescription(user, pk, decision, note):
    if not user.has_perm("operations.change_prescription"):
        raise PermissionDenied("An authorized pharmacist must review prescriptions.")
    order = Order.objects.select_for_update().get(pk=pk)
    prescription = Prescription.objects.select_for_update().filter(order=order).first()
    if not prescription or prescription.status != "pending" or order.status != "prescription_pending":
        raise ValidationError("No pending prescription to review.")
    prescription.status = decision
    prescription.reviewer = user
    prescription.review_note = note
    prescription.reviewed_at = timezone.now()
    prescription.save()
    if decision == "approved":
        order.status = "placed"
        order.save(update_fields=["status"])
        StatusEvent.objects.create(
            entity_type="order", entity_id=str(pk), actor=user, before="prescription_pending", after="placed"
        )
    audit(user, f"prescription.{decision}", pk)
    emit(order.customer, f"prescription.{decision}", reference=str(pk))
    return prescription


@transaction.atomic
def reconcile_cod(user, pk, reference):
    if not user.has_perm("operations.add_payment"):
        raise PermissionDenied("Finance permission required.")
    order = Order.objects.select_for_update().get(pk=pk)
    if order.status != "delivered" or order.payment_method != "cod":
        raise ValidationError("Only delivered COD orders can be reconciled.")
    if order.payment_status == "paid":
        return order
    if Payment.objects.filter(reference=reference).exists():
        raise ValidationError("Reference already used.")
    Payment.objects.create(
        order=order,
        reference=reference,
        provider="cod",
        amount=order.total,
        status="verified",
        verified_at=timezone.now(),
    )
    order.payment_status = "paid"
    order.save(update_fields=["payment_status"])
    audit(user, "cod.reconciled", pk, reference=reference, amount=str(order.total))
    emit(order.customer, "order.paid", reference=str(pk), total=str(order.total))
    return order


@transaction.atomic
def request_refund(user, order, data):
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.payment_status != "paid":
        raise ValidationError("Refunds require a verified payment.")
    reserved = order.refunds.exclude(status="rejected").aggregate(total=Sum("amount"))["total"] or Decimal(
        "0"
    )
    if data["amount"] > order.total - reserved:
        raise ValidationError("Refund exceeds remaining paid amount.")
    refund = order.refunds.create(**data)
    audit(user, "refund.requested", order.pk, amount=str(refund.amount))
    return refund
