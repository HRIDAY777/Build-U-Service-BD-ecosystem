from apps.catalog.service_schedule import appointment_allowed
import hashlib
import json
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.catalog.models import Offering, ProductVariant, ServiceArea, Organization, FoodOptionGroup, FoodOption
from apps.catalog.restaurant_rules import restaurant_status
from apps.automation.models import OutboxEvent
from apps.engagement.models import LoyaltyEntry, Notification
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
    DeliveryRequest,
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
    payment_method = data.get("payment_method", "cod")
    if payment_method == "sslcommerz":
        from .payments import configured, is_gateway_usable

        if not configured() or not is_gateway_usable("sslcommerz"):
            raise ValidationError("Online payments are not configured.")
    else:
        from .payments import is_gateway_usable

        if not is_gateway_usable(payment_method):
            raise ValidationError("This payment method is currently deactivated.")
    quantities = {}
    for item in data["items"]:
        quantities[item["offering"]] = quantities.get(item["offering"], 0) + item["quantity"]
    products = list(
        Offering.objects.select_for_update().filter(id__in=quantities, active=True).order_by("id")
    )
    if not products or len(products) != len(quantities):
        raise ValidationError("One or more items are unavailable.")
    products_by_id = {product.pk: product for product in products}
    variant_ids = {item["variant"] for item in data["items"] if item.get("variant") is not None}
    variants = list(
        ProductVariant.objects.select_for_update()
        .filter(pk__in=variant_ids, active=True)
        .order_by("id")
    )
    if len(variants) != len(variant_ids):
        raise ValidationError("One or more variants are unavailable.")
    variants_by_id = {variant.pk: variant for variant in variants}
    offering_variant_ids = set(
        ProductVariant.objects.filter(offering_id__in=quantities, active=True).values_list(
            "offering_id", flat=True
        )
    )
    resolved_lines = []
    groups = list(FoodOptionGroup.objects.select_for_update().filter(offering_id__in=quantities, offering__division__slug="food", active=True).order_by("id"))
    selected_option_ids = {option for item in data["items"] for option in item.get("food_options", [])}
    options = list(FoodOption.objects.select_for_update().filter(pk__in=selected_option_ids, active=True, group_id__in=[group.pk for group in groups]).order_by("id"))
    options_by_id = {option.pk: option for option in options}
    if len(options) != len(selected_option_ids):
        raise ValidationError("খাবারের একটি অপশন এখন পাওয়া যাচ্ছে না / One or more food options are unavailable.")
    base_quantities = {}
    variant_quantities = {}
    for item in data["items"]:
        product = products_by_id[item["offering"]]
        variant_id = item.get("variant")
        variant = variants_by_id.get(variant_id) if variant_id is not None else None
        if variant_id is not None and (variant is None or variant.offering_id != product.pk):
            raise ValidationError("One or more variants are unavailable.")
        if variant is None and product.pk in offering_variant_ids:
            raise ValidationError(f"Choose an option for {product.name}.")
        if variant:
            variant_quantities[variant.pk] = variant_quantities.get(variant.pk, 0) + item["quantity"]
            price = variant.current_price
        else:
            base_quantities[product.pk] = base_quantities.get(product.pk, 0) + item["quantity"]
            price = product.current_price
        choices = item.get("food_options", [])
        food_groups = [group for group in groups if group.offering_id == product.pk]
        groups_by_id = {group.pk: group for group in food_groups}
        if choices and product.division.slug != "food":
            raise ValidationError("Extra food options apply only to food items.")
        if any(options_by_id[choice].group_id not in groups_by_id for choice in choices):
            raise ValidationError("Choose options belonging to this meal.")
        for group in food_groups:
            count = sum(options_by_id[choice].group_id == group.pk for choice in choices)
            if not group.min_choices <= count <= group.max_choices:
                raise ValidationError(f"{group.name_bn or group.name}: {group.min_choices}–{group.max_choices}টি বাছুন / Choose {group.min_choices}–{group.max_choices} options.")
        price += sum((options_by_id[choice].price for choice in choices), Decimal("0"))
        snapshots = [{"id": choice, "group": groups_by_id[options_by_id[choice].group_id].name,
                      "group_bn": groups_by_id[options_by_id[choice].group_id].name_bn,
                      "name": options_by_id[choice].name, "name_bn": options_by_id[choice].name_bn,
                      "price": str(options_by_id[choice].price)} for choice in choices]
        resolved_lines.append(
            {"product": product, "variant": variant, "quantity": item["quantity"], "price": price, "food_options": snapshots}
        )
    division = products[0].division
    organization_id = products[0].organization_id
    organization = Organization.objects.select_for_update().get(pk=organization_id) if organization_id else None
    if organization and not organization.approved:
        raise ValidationError("This merchant is not approved.")
    if organization and organization.division_id != division.id:
        raise ValidationError("This merchant does not belong to the selected division.")
    if division.kind != "goods" or not division.active:
        raise ValidationError("Use the booking form for services.")
    for product in products:
        if product.division_id != division.id or product.organization_id != organization_id:
            raise ValidationError("Each checkout must contain items from one division and one merchant.")
        if product.pk in base_quantities and product.stock < base_quantities[product.pk]:
            raise ValidationError(f"Insufficient stock for {product.name}.")
    for variant in variants:
        if variant.stock < variant_quantities.get(variant.pk, 0):
            raise ValidationError(f"Insufficient stock for {variant.offering.name} ({variant.label}).")
    area = validate_area(data["address"], division)
    subtotal = sum((line["price"] * line["quantity"] for line in resolved_lines), Decimal("0"))
    if division.slug == "food":
        if not organization:
            raise ValidationError("Choose food from an approved restaurant.")
        status = restaurant_status(organization)
        if status["paused"]:
            raise ValidationError("এই রেস্টুরেন্ট এখন অর্ডার নিচ্ছে না / This restaurant has paused orders.")
        if status["is_open"] is False:
            raise ValidationError("রেস্টুরেন্ট এখন বন্ধ / This restaurant is currently closed.")
        if subtotal < organization.minimum_order:
            raise ValidationError(f"খাবারের ন্যূনতম অর্ডার / Minimum food subtotal: ৳{organization.minimum_order} (ডেলিভারি চার্জের আগে / before delivery fee).")
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
            "preparation_minutes": organization.preparation_minutes if division.slug == "food" else None,
        }
    if "expected_total" in data and data["expected_total"] != total:
        raise ValidationError("The total changed. Review a fresh quote before placing your order.")
    prescription_needed = any(p.prescription_required for p in products)
    order = Order.objects.create(
        customer=user,
        division=division,
        organization_id=organization_id,
        preparation_minutes=organization.preparation_minutes if division.slug == "food" else None,
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
    for line in resolved_lines:
        product = line["product"]
        variant = line["variant"]
        quantity = line["quantity"]
        if variant:
            changed = ProductVariant.objects.filter(pk=variant.pk, active=True, stock__gte=quantity).update(
                stock=F("stock") - quantity
            )
        else:
            changed = Offering.objects.filter(pk=product.pk, stock__gte=quantity).update(
                stock=F("stock") - quantity
            )
        if not changed:
            raise ValidationError("Stock changed. Please try again.")
        OrderItem.objects.create(
            order=order,
            offering=product,
            variant=variant,
            name=f"{product.name} ({variant.label})"[:180] if variant else product.name,
            quantity=quantity,
            unit_price=line["price"],
            food_options=line["food_options"],
        )
        InventoryMovement.objects.create(
            offering=product, variant=variant, order=order, delta=-quantity, reason="order_reserved"
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
    "assigned": {"pickup_pending", "cancelled"},
    "pickup_pending": {"picked_up", "cancelled"},
    "picked_up": {"in_transit", "failed"},
    "in_transit": {"out_for_delivery", "failed"},
    "out_for_delivery": {"delivered", "failed"},
    "failed": {"returned"},
}


@transaction.atomic
def transition(user, model, pk, new_status, details=None):
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
        "pickup_pending",
        "out_for_delivery",
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
    if kind == "delivery":
        details = details or {}
        from rest_framework import serializers

        if new_status == "delivered":
            obj.received_by = serializers.CharField(max_length=120).run_validation(
                details.get("received_by", "")
            )
            obj.delivery_note = serializers.CharField(max_length=1000, allow_blank=True).run_validation(
                details.get("delivery_note", "")
            )
            obj.completed_at = timezone.now()
            amount = serializers.DecimalField(
                max_digits=10, decimal_places=2, min_value=Decimal("0")
            ).run_validation(details.get("cod_collected", "0"))
            if amount != obj.cod_amount:
                raise ValidationError("Confirm the exact parcel COD amount collected before handover.")
            obj.cod_collected = amount
        if new_status == "failed":
            obj.failure_reason = serializers.CharField(max_length=1000).run_validation(
                details.get("failure_reason", "")
            )
        if new_status == "picked_up" and not obj.rider_id:
            raise ValidationError("Assign a rider before pickup.")
    if kind == "order" and new_status == "picked_up" and not obj.rider_id:
        raise ValidationError("Assign a rider before pickup.")
    if (
        kind in {"booking", "delivery"}
        and new_status == "assigned"
        and not (getattr(obj, "provider_id", None) or getattr(obj, "rider_id", None))
    ):
        raise ValidationError("Assign an eligible worker first.")
    if kind == "booking" and new_status == "completed" and obj.offering.division.slug == "mechanic" and obj.service_details and not obj.mechanic_report:
        raise ValidationError("Save the mechanic work report before completing this booking.")
    if kind == "booking" and new_status in {"in_progress", "completed"} and obj.mechanic_quote and obj.mechanic_quote.get("status") != "accepted":
        raise ValidationError("মেরামতের কোটেশনে গ্রাহকের সম্মতি প্রয়োজন। / Customer acceptance of the repair quote is required.")
    before = obj.status
    obj.status = new_status
    obj.save(
        update_fields=[
            "status",
            "received_by",
            "delivery_note",
            "completed_at",
            "failure_reason",
            "cod_collected",
        ]
        if kind == "delivery"
        else ["status"]
    )
    if kind == "order" and new_status in {"cancelled", "rejected", "returned"}:
        items = list(obj.items.order_by("offering_id", "variant_id", "pk"))
        # Match checkout's product-then-variant lock order for mixed-item reversals.
        list(Offering.objects.select_for_update().filter(pk__in=[item.offering_id for item in items]).order_by("pk"))
        list(ProductVariant.objects.select_for_update().filter(pk__in=[item.variant_id for item in items if item.variant_id]).order_by("pk"))
        for item in items:
            if item.variant_id:
                ProductVariant.objects.filter(pk=item.variant_id).update(stock=F("stock") + item.quantity)
            else:
                Offering.objects.filter(pk=item.offering_id).update(stock=F("stock") + item.quantity)
            InventoryMovement.objects.create(
                offering=item.offering, variant=item.variant, order=obj, delta=item.quantity, reason=new_status
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
    if kind in {"delivery", "booking"}:
        Notification.objects.create(
            user=obj.customer,
            title="Delivery status updated" if kind == "delivery" else "Service booking updated",
            body=f"{kind.title()} {obj.pk}: {new_status.replace('_', ' ')}.",
        )
    return obj


def delivery_quote(data):
    from apps.catalog.models import Division

    division = Division.objects.filter(slug="delivery", active=True).first()
    if not division:
        raise ValidationError("Delivery service is currently unavailable.")
    pickup = validate_area(data["pickup"], division)
    dropoff = validate_area(data["dropoff"], division)
    base = max(pickup.delivery_fee, dropoff.delivery_fee)
    extra = (max(Decimal("0"), data["weight_kg"] - 1) * 20).quantize(Decimal("0.01"))
    return {
        "base_fee": str(base),
        "weight_fee": str(extra),
        "fee": str((base + extra).quantize(Decimal("0.01"))),
        "currency": "BDT",
    }


@transaction.atomic
def request_delivery(user, data, key):
    get_user_model().objects.select_for_update().get(pk=user.pk)
    data = dict(data)
    expected = data.pop("expected_fee", None)
    digest = fingerprint(data)
    previous = DeliveryRequest.objects.filter(customer=user, idempotency_key=key).first()
    if previous:
        if previous.request_hash != digest:
            raise ValidationError("This request key was already used with different details.")
        return previous
    quote = delivery_quote(data)
    if expected is not None and expected != Decimal(quote["fee"]):
        raise ValidationError("The delivery fee changed. Review the price again.")
    obj = DeliveryRequest.objects.create(
        customer=user, fee=quote["fee"], idempotency_key=key, request_hash=digest, **data
    )
    StatusEvent.objects.create(
        entity_type="delivery", entity_id=str(obj.pk), actor=user, before="", after="requested"
    )
    audit(user, "delivery.created", obj.pk)
    emit(user, "delivery.created", reference=str(obj.pk))
    Notification.objects.create(
        user=user, title="Delivery request received", body=f"Your parcel reference is {obj.pk}."
    )
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
    offering = Offering.objects.select_for_update().filter(
        pk=data["offering"], active=True, division__active=True, division__kind="service"
    ).first()
    if not offering:
        raise ValidationError("Service not available.")
    if data.get("service_details") and offering.division.slug != "mechanic":
        raise ValidationError("Vehicle details are only supported for mechanic services.")
    if data["scheduled_at"] <= timezone.now():
        raise ValidationError("Choose a future appointment.")
    if not appointment_allowed(offering.service_weekly_hours, offering.service_leave_dates,
                               data["scheduled_at"], offering.duration_minutes):
        raise ValidationError("এই সময়ে সেবা বন্ধ বা পর্যাপ্ত সময় নেই / Service is closed or the appointment exceeds available hours.")
    validate_area(data["address"], offering.division)
    booking = Booking.objects.create(
        customer=user,
        offering=offering,
        scheduled_at=data["scheduled_at"],
        duration_minutes=offering.duration_minutes,
        address=data["address"],
        notes=data.get("notes", ""),
        service_details=data.get("service_details", {}),
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
