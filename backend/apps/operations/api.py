from apps.catalog.service_schedule import appointment_allowed, validate_leave_dates
from apps.catalog.restaurant_rules import validate_weekly_hours
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.html import escape
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.engagement.models import Notification
from .models import (
    AuditLog,
    EventRequest,
    Order,
    Booking,
    DeliveryRequest,
    Prescription,
    StatusEvent,
    ReturnRequest,
    RiderProfile,
    DeliveryFeedback,
    ProviderProfile,
)
from .services import (
    checkout,
    book,
    transition,
    review_prescription,
    reconcile_cod,
    request_refund,
    audit,
    delivery_quote,
    request_delivery,
    BOOKING_TRANSITIONS,
)


class AddressInput(serializers.Serializer):
    recipient = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^\+?[0-9]{10,15}$")
    area = serializers.CharField(max_length=100)
    line = serializers.CharField(max_length=500)


class ReturnSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = ["id", "order", "reason", "status", "review_note", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "review_note", "created_at", "updated_at"]

    def validate_order(self, order):
        if order.customer_id != self.context["request"].user.pk:
            raise PermissionDenied()
        if order.status != "delivered":
            raise ValidationError("Only delivered orders can be submitted for return review.")
        if order.division.slug != "shop":
            raise ValidationError(
                "Online returns currently support shop orders. Contact support for other divisions."
            )
        return order


class ReturnViewSet(viewsets.ModelViewSet):
    serializer_class = ReturnSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = ReturnRequest.objects.select_related("order").order_by("-created_at")
        if self.request.user.has_perm("operations.view_returnrequest"):
            return qs
        return qs.filter(order__customer=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        order = Order.objects.select_for_update().get(pk=serializer.validated_data["order"].pk)
        if ReturnRequest.objects.filter(order=order).exists():
            raise ValidationError("This order already has a return request.")
        result = serializer.save()
        audit(self.request.user, "return.requested", result.pk)

    @action(detail=False, methods=["get"])
    def eligible_orders(self, request):
        orders = Order.objects.filter(
            customer=request.user,
            status="delivered",
            division__slug="shop",
            return_request__isnull=True,
        ).order_by("-created_at", "-pk")
        page = self.paginate_queryset(orders)
        data = [
            {"id": str(order.pk), "created_at": order.created_at, "total": str(order.total)} for order in page
        ]
        return self.get_paginated_response(data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def transition(self, request, pk=None):
        if not request.user.has_perm("operations.change_returnrequest"):
            raise PermissionDenied()
        result = self.get_object()
        result = ReturnRequest.objects.select_for_update().get(pk=result.pk)
        allowed = {"requested": {"approved", "rejected"}, "approved": {"received"}, "received": {"closed"}}
        status = request.data.get("status")
        if status not in allowed.get(result.status, set()):
            raise ValidationError("Invalid return status transition.")
        note = serializers.CharField(max_length=2000, allow_blank=True).run_validation(
            request.data.get("review_note", "")
        )
        before = result.status
        result.status = status
        result.review_note = note
        result.save(update_fields=["status", "review_note", "updated_at"])
        audit(request.user, "return.status_changed", result.pk, before=before, after=status)
        Notification.objects.create(
            user=result.order.customer,
            title="Return request updated",
            body=f"Your return request is now {status}.",
        )
        return Response(self.get_serializer(result).data)


class ItemInput(serializers.Serializer):
    offering = serializers.IntegerField(min_value=1)
    variant = serializers.IntegerField(min_value=1, required=False)
    quantity = serializers.IntegerField(min_value=1, max_value=99)
    food_options = serializers.ListField(child=serializers.IntegerField(min_value=1), max_length=40, default=list)

    def validate_food_options(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Choose each food option only once per meal.")
        return sorted(value)


class CheckoutInput(serializers.Serializer):
    expected_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    payment_method = serializers.ChoiceField(choices=["cod", "sslcommerz"], default="cod")
    items = ItemInput(many=True, allow_empty=False, max_length=100)
    address = AddressInput()
    coupon = serializers.CharField(max_length=40, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)


class OrderSerializer(serializers.ModelSerializer):
    division_slug = serializers.CharField(source="division.slug")
    items = serializers.SerializerMethodField()
    prescription_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "division_slug",
            "status",
            "address",
            "subtotal",
            "discount",
            "delivery_fee",
            "total",
            "payment_method",
            "payment_status",
            "notes",
            "items",
            "rider",
            "prescription_status",
            "preparation_minutes",
            "created_at",
        ]
        read_only_fields = fields

    def get_items(self, obj):
        return [
            {
                "offering": i.offering_id,
                "variant": i.variant_id,
                "name": i.name,
                "quantity": i.quantity,
                "unit_price": str(i.unit_price),
                "food_options": i.food_options,
            }
            for i in obj.items.all()
        ]

    def get_prescription_status(self, obj):
        try:
            return obj.prescription.status
        except Prescription.DoesNotExist:
            return None


class EventRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventRequest
        fields = [
            "id",
            "event_type",
            "title",
            "event_date",
            "guest_count",
            "venue",
            "area",
            "budget",
            "quoted_budget",
            "services",
            "package_selection",
            "notes",
            "staff_notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "quoted_budget", "staff_notes", "status", "created_at", "updated_at"]

    def validate_guest_count(self, value):
        if value < 1 or value > 100000:
            raise serializers.ValidationError("Guest count must be between 1 and 100,000.")
        return value

    def validate_event_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Event date must be today or later.")
        return value

    def validate_budget(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Budget cannot be negative.")
        return value

    def validate_services(self, value):
        if not isinstance(value, list) or len(value) > 30:
            raise serializers.ValidationError("Choose up to 30 event services.")
        if not all(isinstance(item, str) and 1 <= len(item) <= 80 for item in value):
            raise serializers.ValidationError("Each event service must be a short text label.")
        return value

    def validate_package_selection(self, value):
        services = {
            "Venue setup", "Catering", "Decoration", "Photography",
            "Music and sound", "Staff and coordination", "Transport",
        }
        if not isinstance(value, dict) or set(value) - {"bundle", "tiers"}:
            raise serializers.ValidationError("Choose a supported event package.")
        bundle = value.get("bundle", "")
        if not isinstance(bundle, str) or bundle not in {"", "essential", "celebration", "wedding"}:
            raise serializers.ValidationError("Unsupported package bundle.")
        tiers = value.get("tiers", {})
        if not isinstance(tiers, dict) or set(tiers) - services:
            raise serializers.ValidationError("Unsupported package service.")
        if any(not isinstance(tier, str) or tier not in {"general", "silver", "gold", "ultra_gold"} for tier in tiers.values()):
            raise serializers.ValidationError("Unsupported service tier.")
        return {"bundle": bundle, "tiers": tiers} if value else {}

    def validate(self, attrs):
        selection = attrs.get("package_selection", getattr(self.instance, "package_selection", {}))
        services = attrs.get("services", getattr(self.instance, "services", []))
        if set(selection.get("tiers", {})) - set(services):
            raise serializers.ValidationError({"package_selection": "Selected tiers must belong to requested services."})
        return attrs


class EventRequestViewSet(viewsets.ModelViewSet):
    serializer_class = EventRequestSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if self.request.user.is_staff and self.request.user.has_perm("operations.view_eventrequest"):
            return EventRequest.objects.all().order_by("-created_at")
        return EventRequest.objects.filter(customer=self.request.user).order_by("-created_at")

    def get_object(self):
        event = super().get_object()
        if self.request.method in {"POST", "PATCH"}:
            event = EventRequest.objects.select_for_update().get(pk=event.pk)
        return event

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        event = self.get_object()
        entries = AuditLog.objects.filter(entity=str(event.pk), action__startswith="event.").order_by(
            "created_at", "pk"
        )
        return Response(
            [
                {
                    "action": entry.action,
                    "created_at": entry.created_at,
                    "status": entry.metadata.get("after"),
                    "quoted_budget": entry.metadata.get("quoted_budget"),
                }
                for entry in entries
            ]
        )

    @transaction.atomic
    def perform_create(self, serializer):
        event = serializer.save(customer=self.request.user)
        audit(self.request.user, "event.requested", event.pk)
        Notification.objects.create(
            user=event.customer,
            title="Event request received",
            body=f"We received your {event.event_type} planning request: {event.title}.",
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        event = self.get_object()
        if event.customer_id != request.user.pk:
            raise PermissionDenied()
        if event.status not in {"requested", "reviewing"}:
            raise ValidationError("Only requested or reviewing events can be edited.")
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def transition(self, request, pk=None):
        if not request.user.is_staff or not request.user.has_perm("operations.change_eventrequest"):
            raise PermissionDenied()
        event = self.get_object()
        status = str(request.data.get("status", ""))
        allowed = {choice[0] for choice in EventRequest.STATUSES}
        if status not in allowed:
            raise ValidationError({"status": "Unsupported event status."})
        transitions = {
            "requested": {"reviewing", "cancelled"},
            "reviewing": {"cancelled"},
            "quoted": {"cancelled"},
            "confirmed": {"completed"},
            "completed": set(),
            "cancelled": set(),
        }
        if status not in transitions.get(event.status, set()):
            raise ValidationError({"status": f"Cannot move an event from {event.status} to {status}."})
        before = event.status
        event.status = status
        event.save(update_fields=["status", "updated_at"])
        audit(request.user, "event.status_changed", event.pk, before=before, after=status)
        Notification.objects.create(
            user=event.customer,
            title="Event request updated",
            body=f"Your event request is now {status.replace('_', ' ')}.",
        )
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def quote(self, request, pk=None):
        if not request.user.is_staff or not request.user.has_perm("operations.change_eventrequest"):
            raise PermissionDenied()
        event = self.get_object()
        serializer = serializers.Serializer(data=request.data)
        if event.status not in {"reviewing", "quoted"}:
            raise ValidationError("Only reviewing or quoted events can receive a quote.")
        serializer.fields["quoted_budget"] = serializers.DecimalField(
            max_digits=12, decimal_places=2, min_value=0
        )
        serializer.fields["staff_notes"] = serializers.CharField(
            max_length=2000, required=False, allow_blank=True
        )
        serializer.is_valid(raise_exception=True)
        event.quoted_budget = serializer.validated_data["quoted_budget"]
        event.staff_notes = serializer.validated_data.get("staff_notes", "")
        event.status = "quoted"
        event.save(update_fields=["quoted_budget", "staff_notes", "status", "updated_at"])
        audit(request.user, "event.quoted", event.pk, quoted_budget=str(event.quoted_budget))
        Notification.objects.create(
            user=event.customer,
            title="Your event quote is ready",
            body=f"The estimated quote for {event.title} is ৳{event.quoted_budget}.",
        )
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        event = self.get_object()
        if event.customer_id != request.user.pk:
            raise PermissionDenied()
        if event.status not in {"requested", "reviewing", "quoted"}:
            raise ValidationError("This event can no longer be cancelled.")
        event.status = "cancelled"
        event.save(update_fields=["status", "updated_at"])
        audit(request.user, "event.cancelled", event.pk)
        Notification.objects.create(
            user=event.customer,
            title="Event request cancelled",
            body=f"Your event request {event.title} has been cancelled.",
        )
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept_quote(self, request, pk=None):
        event = self.get_object()
        if event.customer_id != request.user.pk:
            raise PermissionDenied()
        if event.status != "quoted" or event.quoted_budget is None:
            raise ValidationError("A quoted event is required before acceptance.")
        event.status = "confirmed"
        event.save(update_fields=["status", "updated_at"])
        audit(request.user, "event.quote_accepted", event.pk, quoted_budget=str(event.quoted_budget))
        Notification.objects.create(
            user=event.customer,
            title="Event confirmed",
            body=f"Your event {event.title} is confirmed.",
        )
        return Response(self.get_serializer(event).data)


def key_from(request):
    key = request.headers.get("Idempotency-Key", "")
    if not key or len(key) > 80:
        raise ValidationError("A unique Idempotency-Key header (1–80 characters) is required.")
    return key


class WorkflowMixin:
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        obj = self.get_object()
        obj = transition(request.user, type(obj), obj.pk, request.data.get("status"), request.data)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        obj = self.get_object()
        kind = "order" if isinstance(obj, Order) else "booking" if isinstance(obj, Booking) else "delivery"
        return Response(
            list(
                StatusEvent.objects.filter(entity_type=kind, entity_id=str(obj.pk))
                .order_by("created_at")
                .values("before", "after", "created_at")
            )
        )

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        obj = self.get_object()
        if not request.user.has_perm(f"operations.change_{obj._meta.model_name}"):
            raise PermissionDenied()
        role = "Provider" if isinstance(obj, Booking) else "Rider"
        worker = get_object_or_404(
            get_user_model(), pk=request.data.get("worker"), groups__name=role, is_active=True
        )
        if (
            isinstance(obj, DeliveryRequest)
            and RiderProfile.objects.filter(user=worker, available=False).exists()
        ):
            raise ValidationError("This rider is currently unavailable.")
        field = "provider" if isinstance(obj, Booking) else "rider"
        with transaction.atomic():
            obj = type(obj).objects.select_for_update().get(pk=obj.pk)
            if obj.status not in {"accepted", "preparing", "ready", "confirmed", "assigned"}:
                raise ValidationError("Assignment is not allowed at this stage.")
            if isinstance(obj, Booking):
                get_user_model().objects.select_for_update().get(pk=worker.pk)
                if ProviderProfile.objects.filter(user=worker, available=False).exists():
                    raise ValidationError("This provider is currently unavailable.")
                profile = ProviderProfile.objects.filter(user=worker).first()
                if profile and not profile.covers_booking(obj):
                    raise ValidationError("কর্মী এই এলাকায় সেবা দেন না। / Provider does not serve this area.")
                if obj.offering.qualified_provider_required and (
                    not profile or not profile.approved_services.filter(pk=obj.offering_id).exists()
                ):
                    raise ValidationError("এই সেবার জন্য কর্মী অনুমোদিত নন। / Provider is not approved for this service.")
                if profile and not appointment_allowed(profile.weekly_hours, profile.leave_dates,
                                                       obj.scheduled_at, obj.duration_minutes):
                    raise ValidationError("প্রোভাইডারের কাজের সময় বা ছুটির সাথে মিলছে না / Provider is outside working hours or on leave.")
                from datetime import timedelta

                conflicts = (
                    Booking.objects.filter(provider=worker)
                    .exclude(pk=obj.pk)
                    .exclude(status__in=["cancelled", "completed", "failed"])
                )
                end = obj.scheduled_at + timedelta(minutes=obj.duration_minutes)
                if any(
                    b.scheduled_at < end
                    and b.scheduled_at + timedelta(minutes=b.duration_minutes) > obj.scheduled_at
                    for b in conflicts.select_related("offering")
                ):
                    raise ValidationError("Provider already has an overlapping appointment.")
            setattr(obj, field, worker)
            if isinstance(obj, DeliveryRequest):
                profile, _ = RiderProfile.objects.get_or_create(user=worker)
                if not profile.available:
                    raise ValidationError("This rider is currently unavailable.")
                obj.rider_earning = profile.earning_per_delivery
            obj.save(update_fields=[field, "rider_earning"] if isinstance(obj, DeliveryRequest) else [field])
            audit(request.user, f"{obj._meta.model_name}.assigned", obj.pk, worker=worker.pk)
            if isinstance(obj, DeliveryRequest):
                Notification.objects.create(
                    user=worker, title="Parcel assigned", body=f"Parcel {obj.pk} is assigned to you."
                )
            if isinstance(obj, Booking):
                Notification.objects.create(
                    user=worker, title="Service job assigned", body=f"Booking {obj.pk} at {obj.scheduled_at}."
                )
        return Response(self.get_serializer(obj).data)


class OrderViewSet(WorkflowMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer

    @action(detail=False, methods=["post"])
    def quote(self, request):
        serializer = CheckoutInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(checkout(request.user, serializer.validated_data, "", preview=True))

    def get_queryset(self):
        qs = (
            Order.objects.select_related("division", "organization", "prescription")
            .prefetch_related("items")
            .order_by("-created_at")
        )
        user = self.request.user
        if user.has_perm("operations.view_order"):
            return qs
        return qs.filter(Q(customer=user) | Q(organization__owner=user) | Q(rider=user)).distinct()

    def create(self, request):
        serializer = CheckoutInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = checkout(request.user, serializer.validated_data, key_from(request))
        return Response(self.get_serializer(order).data, status=201)

    @action(detail=True, methods=["post"])
    def prescription(self, request, pk=None):
        obj = self.get_object()
        if obj.customer_id != request.user.id:
            raise PermissionDenied()
        file = request.FILES.get("document")
        if not file or file.size > 5 * 1024 * 1024:
            raise ValidationError("Upload a PDF, PNG or JPEG up to 5 MB.")
        header = file.read(12)
        file.seek(0)
        suffix = (
            ".pdf"
            if header.startswith(b"%PDF-")
            else ".png"
            if header.startswith(b"\x89PNG\r\n\x1a\n")
            else ".jpg"
            if header.startswith(b"\xff\xd8\xff")
            else None
        )
        if not suffix:
            raise ValidationError("Unsupported file content.")
        import uuid

        file.name = f"{uuid.uuid4()}{suffix}"
        with transaction.atomic():
            obj = Order.objects.select_for_update().get(pk=obj.pk)
            if (
                obj.status != "prescription_pending"
                or Prescription.objects.filter(order=obj, status="pending").exists()
            ):
                raise ValidationError("Order must await a prescription and have no review already pending.")
            Prescription.objects.update_or_create(
                order=obj,
                defaults={
                    "document": file,
                    "status": "pending",
                    "reviewer": None,
                    "review_note": "",
                    "reviewed_at": None,
                },
            )
            audit(request.user, "prescription.uploaded", obj.pk)
        return Response({"status": "pending"}, status=201)

    @action(detail=True, methods=["get"], url_path="prescription-file")
    def prescription_file(self, request, pk=None):
        order = self.get_object()
        if order.customer_id != request.user.id and not request.user.has_perm(
            "operations.change_prescription"
        ):
            raise PermissionDenied()
        prescription = get_object_or_404(Prescription, order=order)
        return FileResponse(
            prescription.document.open("rb"),
            as_attachment=True,
            filename="prescription" + prescription.document.name[prescription.document.name.rfind(".") :],
        )

    @action(detail=True, methods=["post"], url_path="review-prescription")
    def review_rx(self, request, pk=None):
        order = self.get_object()
        decision = request.data.get("decision")
        if decision not in {"approved", "rejected"} or not request.data.get("note"):
            raise ValidationError("An approval/rejection decision and review note are required.")
        review_prescription(request.user, order.pk, decision, str(request.data["note"])[:1000])
        return Response({"status": decision})

    @action(detail=True, methods=["post"], url_path="reconcile-cod")
    def cod(self, request, pk=None):
        order = self.get_object()
        reference = str(request.data.get("reference", "")).strip()
        if not reference or len(reference) > 100:
            raise ValidationError("A valid cash deposit reference is required.")
        order = reconcile_cod(request.user, order.pk, reference)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        order = self.get_object()
        if order.customer_id != request.user.id:
            raise PermissionDenied()
        serializer = RefundInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = request_refund(request.user, order, serializer.validated_data)
        return Response({"id": refund.id, "status": refund.status, "amount": str(refund.amount)}, status=201)

    @action(detail=True, methods=["get"])
    def invoice(self, request, pk=None):
        order = self.get_object()
        if order.customer_id != request.user.id and not request.user.has_perm("operations.view_payment"):
            raise PermissionDenied()
        rows = "".join(
            f"<tr><td>{escape(i.name)}<small>{escape(', '.join(option.get('name', '') for option in i.food_options))}</small></td><td>{i.quantity}</td><td>BDT {i.unit_price}</td><td>BDT {i.unit_price * i.quantity}</td></tr>"
            for i in order.items.all()
        )
        return HttpResponse(
            f"""<!doctype html><html lang='en'><meta charset='utf-8'><title>Invoice {order.pk}</title><style>body{{font:16px system-ui;max-width:850px;margin:60px auto;padding:24px}}h1{{color:#76269c}}table{{width:100%;border-collapse:collapse}}td,th{{padding:14px;border-bottom:1px solid #ddd;text-align:left}}footer{{margin-top:60px;color:#555}}</style><h1>U Service BD Limited</h1><h2>Invoice</h2><p>{order.pk}<br>{order.created_at:%d %B %Y}</p><p>{escape(order.address["recipient"])}<br>{escape(order.address["line"])}, {escape(order.address["area"])}</p><table><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>{rows}</table><p>Subtotal: BDT {order.subtotal}<br>Discount: BDT {order.discount}<br>Delivery: BDT {order.delivery_fee}</p><h2>Total: BDT {order.total}</h2><p>{escape(order.payment_method.upper())} · {escape(order.payment_status)}</p><footer>Generated from the order record. Tax configuration requires business approval before launch.</footer></html>"""
        )


class RefundInput(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    reason = serializers.CharField(max_length=2000)


class MechanicDetailsInput(serializers.Serializer):
    vehicle_type = serializers.ChoiceField(choices=["bicycle", "motorbike", "scooter", "car", "other"])
    vehicle_model = serializers.CharField(max_length=120)
    registration = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    problem_type = serializers.ChoiceField(choices=["inspection", "engine", "brakes", "tyres", "battery", "chain", "electrical", "other"])
    mobility = serializers.ChoiceField(choices=["running", "not_running", "unsafe"])
    odometer_km = serializers.IntegerField(min_value=0, max_value=2000000, required=False, allow_null=True, default=None)


class BookingInput(serializers.Serializer):
    offering = serializers.IntegerField(min_value=1)
    scheduled_at = serializers.DateTimeField()
    address = AddressInput()
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    service_details = MechanicDetailsInput(required=False)


class RescheduleInput(serializers.Serializer):
    scheduled_at = serializers.DateTimeField()


class MechanicReportInput(serializers.Serializer):
    diagnosis = serializers.CharField(max_length=2000)
    work_performed = serializers.CharField(max_length=2000)
    parts_used = serializers.CharField(max_length=1000, allow_blank=True, default="")
    follow_up = serializers.CharField(max_length=1000, allow_blank=True, default="")


class BookingSerializer(serializers.ModelSerializer):
    can_quote = serializers.SerializerMethodField()
    can_decide_quote = serializers.SerializerMethodField()
    can_report = serializers.SerializerMethodField()

    def get_can_quote(self, obj):
        user = self.context["request"].user
        return obj.offering.division.slug == "mechanic" and obj.status in {
            "confirmed", "assigned", "on_the_way", "arrived", "in_progress", "waiting_for_parts",
        } and (obj.provider_id == user.pk or user.has_perm("operations.change_booking"))

    def get_can_decide_quote(self, obj):
        return obj.customer_id == self.context["request"].user.pk and obj.status not in {
            "completed", "cancelled", "failed", "pending",
        } and obj.mechanic_quote.get("status") == "pending"

    def get_can_report(self, obj):
        user = self.context["request"].user
        return obj.offering.division.slug == "mechanic" and obj.status in {"in_progress", "waiting_for_parts"} and (
            obj.provider_id == user.pk or user.has_perm("operations.change_booking")
        )
    has_problem_photo = serializers.SerializerMethodField()
    can_manage_photo = serializers.SerializerMethodField()

    def get_can_manage_photo(self, obj):
        user = self.context["request"].user
        return obj.status not in {"completed", "cancelled", "failed"} and (
            obj.customer_id == user.pk or user.has_perm("operations.change_booking")
        )

    def get_has_problem_photo(self, obj):
        return bool(obj.problem_photo)

    service = serializers.CharField(source="offering.name")
    can_reschedule = serializers.SerializerMethodField()
    available_actions = serializers.SerializerMethodField()

    def get_can_reschedule(self, obj):
        user = self.context["request"].user
        return obj.status in {"pending", "confirmed", "assigned"} and (
            obj.customer_id == user.pk or user.has_perm("operations.change_booking")
        )

    def get_available_actions(self, obj):
        user = self.context["request"].user
        states = BOOKING_TRANSITIONS.get(obj.status, set())
        if obj.mechanic_quote and obj.mechanic_quote.get("status") != "accepted":
            states = states - {"in_progress", "completed"}
        if user.has_perm("operations.change_booking"):
            return sorted(states - ({"assigned"} if not obj.provider_id else set()))
        if obj.provider_id == user.pk:
            return sorted(states - {"cancelled", "confirmed", "assigned"})
        return ["cancelled"] if obj.customer_id == user.pk and obj.status == "pending" else []

    class Meta:
        model = Booking
        fields = [
            "id",
            "service",
            "offering",
            "scheduled_at",
            "duration_minutes",
            "address",
            "notes",
            "service_details",
            "mechanic_report",
            "mechanic_quote",
            "can_quote",
            "can_decide_quote",
            "can_report",
            "status",
            "price",
            "provider",
            "created_at",
            "available_actions",
            "can_reschedule",
            "has_problem_photo",
            "can_manage_photo",
        ]
        read_only_fields = fields


class ProviderScheduleInput(serializers.Serializer):
    available = serializers.BooleanField(required=False)
    weekly_hours = serializers.JSONField(required=False)
    leave_dates = serializers.JSONField(required=False)

    def validate_weekly_hours(self, value):
        try:
            validate_weekly_hours(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value

    def validate_leave_dates(self, value):
        try:
            validate_leave_dates(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value


class BookingViewSet(WorkflowMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = BookingSerializer

    @action(detail=True, methods=["put", "post"])
    def mechanic_quote(self, request, pk=None):
        from .mechanic_quotes import update_quote
        booking = self.get_object()
        booking = update_quote(request.user, booking.pk, request.method, request.data)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["get"])
    def mechanic_quote_history(self, request, pk=None):
        from .mechanic_quotes import public_quote
        booking = self.get_object()
        if booking.offering.division.slug != "mechanic":
            raise ValidationError("Quotation history is only available for mechanic bookings.")
        events = AuditLog.objects.filter(entity=str(booking.pk), action="booking.mechanic_quote_updated").order_by("-created_at", "-pk")
        page = self.paginate_queryset(events)
        response = self.get_paginated_response([
            {"id": event.pk, "recorded_at": event.created_at, "quote": public_quote(event.metadata.get("quote"))}
            for event in page
        ])
        response["Cache-Control"] = "private, no-store"
        return response

    @action(detail=True, methods=["get", "post", "delete"], url_path="problem-photo")
    def problem_photo(self, request, pk=None):
        booking = self.get_object()
        if booking.offering.division.slug != "mechanic":
            raise ValidationError("শুধু মেকানিক বুকিংয়ে ছবি দিন / Photos are only supported for mechanic bookings.")
        if request.method == "GET":
            if not booking.problem_photo:
                from rest_framework.exceptions import NotFound
                raise NotFound()
            response = FileResponse(booking.problem_photo.open("rb"), content_type="image/jpeg")
            response["Cache-Control"] = "private, no-store"
            response["X-Content-Type-Options"] = "nosniff"
            return response
        if booking.customer_id != request.user.pk and not request.user.has_perm("operations.change_booking"):
            raise PermissionDenied()
        from django.core.files.base import ContentFile
        from io import BytesIO
        from PIL import Image, ImageOps, UnidentifiedImageError
        import uuid
        content = None
        if request.method == "POST":
            file = request.FILES.get("photo")
            if not file or file.size > 5 * 1024 * 1024:
                raise ValidationError("সর্বোচ্চ ৫ এমবি ছবি দিন / Choose an image up to 5 MB.")
            try:
                with Image.open(file) as image:
                    if image.format not in {"JPEG", "PNG", "WEBP"} or image.width * image.height > 20000000:
                        raise ValueError()
                    image.load()
                    clean = ImageOps.exif_transpose(image).convert("RGB")
                    clean.thumbnail((2000, 2000))
                    output = BytesIO()
                    clean.save(output, format="JPEG", quality=85)
                    content = ContentFile(output.getvalue(), name=f"{uuid.uuid4()}.jpg")
            except (OSError, ValueError, UnidentifiedImageError, Image.DecompressionBombError):
                raise ValidationError("বৈধ JPG, PNG বা WebP ছবি দিন / Choose a valid JPG, PNG or WebP image.")
        new_name = None
        storage = booking.problem_photo.storage
        try:
            with transaction.atomic():
                booking = Booking.objects.select_for_update().get(pk=booking.pk)
                if booking.status in {"completed", "cancelled", "failed"}:
                    raise ValidationError("এই বুকিংয়ের ছবি পরিবর্তন করা যাবে না / Photos cannot be changed for a closed booking.")
                old_name = booking.problem_photo.name
                if content:
                    booking.problem_photo.save(content.name, content, save=False)
                    new_name = booking.problem_photo.name
                else:
                    booking.problem_photo = ""
                booking.save(update_fields=["problem_photo"])
                audit(request.user, "booking.problem_photo_saved" if content else "booking.problem_photo_removed", booking.pk)
                if old_name:
                    transaction.on_commit(lambda: storage.delete(old_name), robust=True)
        except Exception:
            if new_name:
                storage.delete(new_name)
            raise
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"])
    def reschedule(self, request, pk=None):
        serializer = RescheduleInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        scheduled_at = serializer.validated_data["scheduled_at"]
        with transaction.atomic():
            booking = get_object_or_404(Booking.objects.select_for_update(), pk=self.get_object().pk)
            if booking.customer_id != request.user.pk and not request.user.has_perm("operations.change_booking"):
                raise PermissionDenied()
            if booking.status not in {"pending", "confirmed", "assigned"}:
                raise ValidationError("সময় পরিবর্তন করা যাবে না / This booking can no longer be rescheduled.")
            if scheduled_at <= timezone.now():
                raise ValidationError("ভবিষ্যতের সময় বাছুন / Choose a future appointment.")
            offering = booking.offering
            if not appointment_allowed(offering.service_weekly_hours, offering.service_leave_dates, scheduled_at, booking.duration_minutes):
                raise ValidationError("এই সময়ে সেবা বন্ধ / Service is closed at this time.")
            if booking.provider_id:
                get_user_model().objects.select_for_update().get(pk=booking.provider_id)
                profile = ProviderProfile.objects.filter(user_id=booking.provider_id).first()
                if profile and (not profile.available or not appointment_allowed(profile.weekly_hours, profile.leave_dates, scheduled_at, booking.duration_minutes)):
                    raise ValidationError("মেকানিক এই সময়ে উপলব্ধ নন / Provider is unavailable at this time.")
                from datetime import timedelta
                end = scheduled_at + timedelta(minutes=booking.duration_minutes)
                conflicts = Booking.objects.filter(provider_id=booking.provider_id).exclude(pk=booking.pk).exclude(status__in=["cancelled", "completed", "failed"])
                if any(other.scheduled_at < end and other.scheduled_at + timedelta(minutes=other.duration_minutes) > scheduled_at for other in conflicts):
                    raise ValidationError("এই সময়ে অন্য বুকিং আছে / Provider already has an overlapping appointment.")
            before = booking.scheduled_at
            if before != scheduled_at:
                booking.scheduled_at = scheduled_at
                booking.save(update_fields=["scheduled_at"])
                audit(request.user, "booking.rescheduled", booking.pk, before=before.isoformat(), after=scheduled_at.isoformat())
                if booking.provider_id:
                    Notification.objects.create(user_id=booking.provider_id, title="Booking time changed", body=f"Booking {booking.pk}: {scheduled_at.isoformat()}")
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["put"])
    def mechanic_report(self, request, pk=None):
        with transaction.atomic():
            booking = get_object_or_404(Booking.objects.select_for_update().select_related("offering__division"), pk=pk)
            if booking.provider_id != request.user.pk and not request.user.has_perm("operations.change_booking"):
                raise PermissionDenied()
            if booking.offering.division.slug != "mechanic":
                raise ValidationError("This report is only available for mechanic bookings.")
            if booking.status not in {"in_progress", "waiting_for_parts"}:
                raise ValidationError("Reports can be saved while mechanic work is in progress.")
            serializer = MechanicReportInput(data=request.data)
            serializer.is_valid(raise_exception=True)
            booking.mechanic_report = serializer.validated_data
            booking.save(update_fields=["mechanic_report"])
            audit(request.user, "booking.mechanic_report_saved", booking.pk)
        return Response(self.get_serializer(booking).data)

    def get_queryset(self):
        qs = Booking.objects.select_related("offering__division").order_by("-created_at")
        if self.request.query_params.get("assigned_to_me") == "1":
            qs = qs.filter(provider=self.request.user)
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return (
            qs
            if self.request.user.has_perm("operations.view_booking")
            else qs.filter(Q(customer=self.request.user) | Q(provider=self.request.user))
        )

    def create(self, request):
        serializer = BookingInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = book(request.user, serializer.validated_data, key_from(request))
        return Response(self.get_serializer(booking).data, status=201)

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        if not request.user.groups.filter(name="Provider").exists():
            raise PermissionDenied("Provider account required.")
        from datetime import datetime, time, timedelta
        from zoneinfo import ZoneInfo
        day = serializers.DateField().run_validation(request.query_params.get("date"))
        start = datetime.combine(day, time(), ZoneInfo("Asia/Dhaka"))
        end = start + timedelta(days=7)
        jobs = Booking.objects.filter(provider=request.user, scheduled_at__gte=start - timedelta(days=1),
                                      scheduled_at__lt=end).exclude(status__in=["cancelled", "completed", "failed"]).select_related("offering").order_by("scheduled_at")
        results = [job for job in jobs if job.scheduled_at + timedelta(minutes=job.duration_minutes) > start]
        return Response({"timezone": "Asia/Dhaka", "date": day.isoformat(),
                         "results": self.get_serializer(results, many=True).data})

    @action(detail=False, methods=["get"])
    def providers(self, request):
        if not request.user.has_perm("operations.change_booking"):
            raise PermissionDenied()
        workers = (
            get_user_model()
            .objects.filter(is_active=True, groups__name="Provider")
            .filter(Q(providerprofile__isnull=True) | Q(providerprofile__available=True))
            .order_by("username")
            .distinct()
        )
        booking_id = request.query_params.get("booking")
        if booking_id:
            from datetime import timedelta
            booking_id = serializers.UUIDField().run_validation(booking_id)
            booking = get_object_or_404(self.get_queryset(), pk=booking_id)
            if booking.status not in {"confirmed", "assigned"}:
                raise ValidationError("This booking is not ready for assignment.")
            end = booking.scheduled_at + timedelta(minutes=booking.duration_minutes)
            if booking.offering.qualified_provider_required:
                workers = workers.filter(providerprofile__approved_services=booking.offering_id)
            conflicts = Booking.objects.filter(
                provider_id__in=workers.values("pk"), scheduled_at__lt=end
            ).exclude(pk=booking.pk).exclude(status__in=["cancelled", "completed", "failed"])
            busy = {job.provider_id for job in conflicts
                    if job.scheduled_at + timedelta(minutes=job.duration_minutes) > booking.scheduled_at}
            profiles = {profile.user_id: profile for profile in ProviderProfile.objects.filter(
                user_id__in=workers.values("pk")
            )}
            eligible = [worker.pk for worker in workers if worker.pk not in busy and (
                worker.pk not in profiles or (profiles[worker.pk].covers_booking(booking) and appointment_allowed(
                    profiles[worker.pk].weekly_hours, profiles[worker.pk].leave_dates,
                    booking.scheduled_at, booking.duration_minutes
                ))
            )]
            workers = workers.filter(pk__in=eligible)
        page = self.paginate_queryset(workers)
        return self.get_paginated_response(
            [{"id": worker.pk, "name": worker.get_full_name() or worker.username} for worker in page]
        )

    @action(detail=False, methods=["get", "patch"])
    def provider_profile(self, request):
        if not request.user.groups.filter(name="Provider").exists():
            raise PermissionDenied("Provider account required.")
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk=request.user.pk)
            profile, _ = ProviderProfile.objects.get_or_create(user=request.user)
            if request.method == "PATCH":
                changes = ProviderScheduleInput(data=request.data)
                changes.is_valid(raise_exception=True)
                for field, value in changes.validated_data.items():
                    setattr(profile, field, value)
                profile.save()
                audit(request.user, "provider.availability_updated", profile.pk,
                      fields=list(changes.validated_data))
        jobs = Booking.objects.filter(provider=request.user)
        return Response(
            {
                "name": request.user.get_full_name() or request.user.username,
                "available": profile.available,
                "weekly_hours": profile.weekly_hours,
                "leave_dates": profile.leave_dates,
                "timezone": "Asia/Dhaka",
                "active_jobs": jobs.exclude(status__in=["completed", "cancelled", "failed"]).count(),
                "completed_jobs": jobs.filter(status="completed").count(),
                "failed_jobs": jobs.filter(status="failed").count(),
            }
        )


class DeliveryAddressInput(AddressInput):
    instructions = serializers.CharField(max_length=500, allow_blank=True, default="")


class DeliveryInput(serializers.Serializer):
    pickup = DeliveryAddressInput()
    dropoff = DeliveryAddressInput()
    description = serializers.CharField(max_length=500)
    weight_kg = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("20")
    )
    package_type = serializers.ChoiceField(
        choices=["general", "documents", "clothing", "electronics", "other"], default="general"
    )
    quantity = serializers.IntegerField(min_value=1, max_value=100, default=1)
    cod_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0"),
        max_value=Decimal("100000"),
        default=Decimal("0"),
    )
    fragile = serializers.BooleanField(default=False)
    pickup_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    instructions = serializers.CharField(max_length=1000, allow_blank=True, default="")
    expected_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False
    )

    def validate_pickup_at(self, value):
        if value and value <= timezone.now():
            raise ValidationError("Choose a future pickup time.")
        return value


class DeliverySerializer(serializers.ModelSerializer):
    rider_name = serializers.SerializerMethodField()
    available_actions = serializers.SerializerMethodField()
    can_assign = serializers.SerializerMethodField()
    can_reconcile_cash = serializers.SerializerMethodField()
    can_reject_assignment = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

    def get_feedback(self, obj):
        feedback = getattr(obj, "feedback", None)
        return {"rating": feedback.rating, "comment": feedback.comment} if feedback else None

    def get_can_review(self, obj):
        return (
            obj.status == "delivered"
            and obj.customer_id == self.context["request"].user.pk
            and not hasattr(obj, "feedback")
        )

    def get_can_reject_assignment(self, obj):
        return obj.status == "assigned" and obj.rider_id == self.context["request"].user.pk

    def get_can_reconcile_cash(self, obj):
        return (
            obj.status == "delivered"
            and obj.cod_collected > 0
            and not obj.cash_reconciled_at
            and self.context["request"].user.has_perm("operations.add_payment")
        )

    def get_can_assign(self, obj):
        return obj.status in {"confirmed", "assigned"} and self.context["request"].user.has_perm(
            "operations.change_deliveryrequest"
        )

    def get_rider_name(self, obj):
        return (obj.rider.get_full_name() or obj.rider.username) if obj.rider else ""

    def get_available_actions(self, obj):
        from .services import DELIVERY_TRANSITIONS

        user = self.context["request"].user
        states = DELIVERY_TRANSITIONS.get(obj.status, set())
        if not obj.rider_id:
            states = states - {"assigned"}
        if user.has_perm("operations.change_deliveryrequest"):
            return sorted(states)
        if obj.rider_id == user.pk:
            return sorted(
                states
                & {
                    "pickup_pending",
                    "picked_up",
                    "in_transit",
                    "out_for_delivery",
                    "delivered",
                    "failed",
                    "returned",
                }
            )
        return ["cancelled"] if obj.customer_id == user.pk and obj.status == "requested" else []

    class Meta:
        model = DeliveryRequest
        fields = [
            "id",
            "pickup",
            "dropoff",
            "description",
            "weight_kg",
            "fee",
            "status",
            "rider",
            "created_at",
            "package_type",
            "fragile",
            "pickup_at",
            "instructions",
            "received_by",
            "delivery_note",
            "failure_reason",
            "completed_at",
            "rider_name",
            "available_actions",
            "can_assign",
            "quantity",
            "cod_amount",
            "cod_collected",
            "cash_reconciled_at",
            "can_reconcile_cash",
            "can_reject_assignment",
            "feedback",
            "can_review",
        ]
        read_only_fields = fields


class DeliveryViewSet(WorkflowMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = DeliverySerializer

    def get_queryset(self):
        qs = DeliveryRequest.objects.select_related("rider", "feedback").order_by("-created_at", "-pk")
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"])
        return (
            qs
            if self.request.user.has_perm("operations.view_deliveryrequest")
            else qs.filter(Q(customer=self.request.user) | Q(rider=self.request.user))
        )

    def create(self, request):
        serializer = DeliveryInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = request_delivery(request.user, serializer.validated_data, key_from(request))
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=False, methods=["post"])
    def quote(self, request):
        serializer = DeliveryInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(delivery_quote(serializer.validated_data))

    @action(detail=False, methods=["get"])
    def riders(self, request):
        if not request.user.has_perm("operations.change_deliveryrequest"):
            raise PermissionDenied()
        riders = (
            get_user_model()
            .objects.filter(groups__name="Rider", is_active=True)
            .filter(Q(riderprofile__isnull=True) | Q(riderprofile__available=True))
            .order_by("username")
            .distinct()
        )
        page = self.paginate_queryset(riders)
        return self.get_paginated_response(
            [{"id": rider.pk, "name": rider.get_full_name() or rider.username} for rider in page]
        )

    @action(detail=False, methods=["get", "patch"])
    def rider_profile(self, request):
        if not request.user.groups.filter(name="Rider").exists():
            raise PermissionDenied("Rider account required.")
        profile, _ = RiderProfile.objects.get_or_create(user=request.user)
        if request.method == "PATCH":

            class ProfileInput(serializers.Serializer):
                available = serializers.BooleanField(required=False)
                vehicle = serializers.CharField(max_length=80, allow_blank=True, required=False)

            serializer = ProfileInput(data=request.data)
            serializer.is_valid(raise_exception=True)
            for key, value in serializer.validated_data.items():
                setattr(profile, key, value)
            profile.save()
            audit(request.user, "rider.profile_updated", profile.pk, available=profile.available)
        from django.db.models import Sum, Avg

        jobs = DeliveryRequest.objects.filter(rider=request.user)
        pending_cash = jobs.filter(status="delivered", cash_reconciled_at__isnull=True).aggregate(
            amount=Sum("cod_collected")
        )["amount"] or Decimal("0")
        earnings = jobs.filter(status="delivered").aggregate(amount=Sum("rider_earning"))[
            "amount"
        ] or Decimal("0")
        return Response(
            {
                "name": request.user.get_full_name() or request.user.username,
                "available": profile.available,
                "vehicle": profile.vehicle,
                "completed_jobs": jobs.filter(status="delivered").count(),
                "active_jobs": jobs.exclude(status__in=["delivered", "cancelled", "returned"]).count(),
                "pending_cod": str(pending_cash.quantize(Decimal("0.01"))),
                "recorded_earnings": str(earnings.quantize(Decimal("0.01"))),
                "average_rating": jobs.aggregate(value=Avg("feedback__rating"))["value"],
                "rating_count": DeliveryFeedback.objects.filter(delivery__rider=request.user).count(),
                "failed_jobs": jobs.filter(status="failed").count(),
                "returned_jobs": jobs.filter(status="returned").count(),
            }
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def feedback(self, request, pk=None):
        obj = self.get_object()
        obj = DeliveryRequest.objects.select_for_update().get(pk=obj.pk)
        if obj.customer_id != request.user.pk:
            raise PermissionDenied()
        if obj.status != "delivered" or DeliveryFeedback.objects.filter(delivery=obj).exists():
            raise ValidationError("Rate a completed delivery once.")
        rating = serializers.IntegerField(min_value=1, max_value=5).run_validation(request.data.get("rating"))
        comment = serializers.CharField(max_length=1000, allow_blank=True).run_validation(
            request.data.get("comment", "")
        )
        DeliveryFeedback.objects.create(delivery=obj, rating=rating, comment=comment)
        audit(request.user, "delivery.feedback", obj.pk, rating=rating)
        if obj.rider:
            Notification.objects.create(
                user=obj.rider, title="Delivery feedback received", body=f"Parcel {obj.pk}: {rating}/5."
            )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reject_assignment(self, request, pk=None):
        obj = self.get_object()
        obj = DeliveryRequest.objects.select_for_update().get(pk=obj.pk)
        if obj.rider_id != request.user.pk:
            raise PermissionDenied()
        if obj.status != "assigned":
            raise ValidationError("Only a new assignment may be rejected before acceptance.")
        reason = serializers.CharField(max_length=500).run_validation(request.data.get("reason", ""))
        obj.status = "confirmed"
        obj.rider = None
        obj.rider_earning = 0
        obj.save(update_fields=["status", "rider", "rider_earning"])
        StatusEvent.objects.create(
            entity_type="delivery",
            entity_id=str(obj.pk),
            actor=request.user,
            before="assigned",
            after="confirmed",
        )
        audit(request.user, "delivery.assignment_rejected", obj.pk, reason=reason)
        Notification.objects.create(
            user=obj.customer,
            title="Rider reassignment needed",
            body=f"Parcel {obj.pk}: our team will assign another rider.",
        )
        return Response({"status": "confirmed"})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reconcile_cash(self, request, pk=None):
        if not request.user.has_perm("operations.add_payment"):
            raise PermissionDenied("Finance permission required.")
        obj = self.get_object()
        obj = DeliveryRequest.objects.select_for_update().get(pk=obj.pk)
        reference = serializers.CharField(max_length=100).run_validation(request.data.get("reference", ""))
        amount = serializers.DecimalField(
            max_digits=10, decimal_places=2, min_value=Decimal("0.01")
        ).run_validation(request.data.get("amount"))
        if obj.status != "delivered" or amount != obj.cod_collected or obj.cod_collected <= 0:
            raise ValidationError("Only the exact collected COD of a delivered parcel can be reconciled.")
        if obj.cash_reconciled_at:
            if obj.cash_reference != reference:
                raise ValidationError("Cash was already reconciled with a different reference.")
            return Response(self.get_serializer(obj).data)
        if DeliveryRequest.objects.filter(cash_reference=reference).exists():
            raise ValidationError("Cash deposit reference already used.")
        obj.cash_reference = reference
        obj.cash_reconciled_at = timezone.now()
        from django.db import IntegrityError

        try:
            with transaction.atomic():
                obj.save(update_fields=["cash_reference", "cash_reconciled_at"])
        except IntegrityError:
            raise ValidationError("Cash deposit reference already used.")
        audit(request.user, "delivery.cash_reconciled", obj.pk, reference=reference, amount=str(amount))
        Notification.objects.create(
            user=obj.customer,
            title="Parcel COD recorded",
            body=f"Collected COD for parcel {obj.pk} has been reconciled. This does not record a payout to the sender.",
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        obj = self.get_object()
        return HttpResponse(
            f"<!doctype html><html><meta charset='utf-8'><title>Parcel booking receipt</title><style>body{{font:16px system-ui;max-width:750px;margin:40px auto;padding:24px}}h1{{color:#76269c}}p{{line-height:1.8}}</style><h1>U Service · Parcel booking</h1><p>Reference: {obj.pk}<br>Status: {escape(obj.status)}<br>Booked: {obj.created_at:%Y-%m-%d %H:%M} UTC</p><h2>Pickup</h2><p>{escape(obj.pickup['recipient'])}<br>{escape(obj.pickup['line'])}, {escape(obj.pickup['area'])}</p><h2>Destination</h2><p>{escape(obj.dropoff['recipient'])}<br>{escape(obj.dropoff['line'])}, {escape(obj.dropoff['area'])}</p><p>Package: {escape(obj.description)}<br>Weight: {obj.weight_kg} kg<br>Service fee: BDT {obj.fee}<br>Received by: {escape(obj.received_by or 'Not delivered')}</p><p>This is a booking record, not a payment receipt. COD amount: BDT {obj.cod_amount}. Collection recorded: BDT {obj.cod_collected}. This is not a sender payout record; insurance is not included.</p></html>"
        )
