from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.html import escape
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.catalog.models import Division
from .models import Order, Booking, DeliveryRequest, Prescription, StatusEvent
from .services import (
    checkout,
    book,
    transition,
    review_prescription,
    reconcile_cod,
    request_refund,
    validate_area,
    audit,
    emit,
)


class AddressInput(serializers.Serializer):
    recipient = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^\+?[0-9]{10,15}$")
    area = serializers.CharField(max_length=100)
    line = serializers.CharField(max_length=500)


class ItemInput(serializers.Serializer):
    offering = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


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
            "created_at",
        ]
        read_only_fields = fields

    def get_items(self, obj):
        return [
            {
                "offering": i.offering_id,
                "name": i.name,
                "quantity": i.quantity,
                "unit_price": str(i.unit_price),
            }
            for i in obj.items.all()
        ]

    def get_prescription_status(self, obj):
        try:
            return obj.prescription.status
        except Prescription.DoesNotExist:
            return None


def key_from(request):
    key = request.headers.get("Idempotency-Key", "")
    if not key or len(key) > 80:
        raise ValidationError("A unique Idempotency-Key header (1–80 characters) is required.")
    return key


class WorkflowMixin:
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        obj = self.get_object()
        obj = transition(request.user, type(obj), obj.pk, request.data.get("status"))
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
        field = "provider" if isinstance(obj, Booking) else "rider"
        with transaction.atomic():
            obj = type(obj).objects.select_for_update().get(pk=obj.pk)
            if obj.status not in {"accepted", "preparing", "ready", "confirmed", "assigned"}:
                raise ValidationError("Assignment is not allowed at this stage.")
            if isinstance(obj, Booking):
                get_user_model().objects.select_for_update().get(pk=worker.pk)
                from datetime import timedelta

                conflicts = (
                    Booking.objects.filter(provider=worker)
                    .exclude(pk=obj.pk)
                    .exclude(status__in=["cancelled", "completed", "failed"])
                )
                end = obj.scheduled_at + timedelta(minutes=obj.offering.duration_minutes)
                if any(
                    b.scheduled_at < end
                    and b.scheduled_at + timedelta(minutes=b.offering.duration_minutes) > obj.scheduled_at
                    for b in conflicts.select_related("offering")
                ):
                    raise ValidationError("Provider already has an overlapping appointment.")
            setattr(obj, field, worker)
            obj.save(update_fields=[field])
            audit(request.user, f"{obj._meta.model_name}.assigned", obj.pk, worker=worker.pk)
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
            f"<tr><td>{escape(i.name)}</td><td>{i.quantity}</td><td>BDT {i.unit_price}</td><td>BDT {i.unit_price * i.quantity}</td></tr>"
            for i in order.items.all()
        )
        return HttpResponse(
            f"""<!doctype html><html lang='en'><meta charset='utf-8'><title>Invoice {order.pk}</title><style>body{{font:16px system-ui;max-width:850px;margin:60px auto;padding:24px}}h1{{color:#76269c}}table{{width:100%;border-collapse:collapse}}td,th{{padding:14px;border-bottom:1px solid #ddd;text-align:left}}footer{{margin-top:60px;color:#555}}</style><h1>U Service BD Limited</h1><h2>Invoice</h2><p>{order.pk}<br>{order.created_at:%d %B %Y}</p><p>{escape(order.address["recipient"])}<br>{escape(order.address["line"])}, {escape(order.address["area"])}</p><table><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>{rows}</table><p>Subtotal: BDT {order.subtotal}<br>Discount: BDT {order.discount}<br>Delivery: BDT {order.delivery_fee}</p><h2>Total: BDT {order.total}</h2><p>{escape(order.payment_method.upper())} · {escape(order.payment_status)}</p><footer>Generated from the order record. Tax configuration requires business approval before launch.</footer></html>"""
        )


class RefundInput(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    reason = serializers.CharField(max_length=2000)


class BookingInput(serializers.Serializer):
    offering = serializers.IntegerField(min_value=1)
    scheduled_at = serializers.DateTimeField()
    address = AddressInput()
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class BookingSerializer(serializers.ModelSerializer):
    service = serializers.CharField(source="offering.name")

    class Meta:
        model = Booking
        fields = [
            "id",
            "service",
            "offering",
            "scheduled_at",
            "address",
            "notes",
            "status",
            "price",
            "provider",
            "created_at",
        ]
        read_only_fields = fields


class BookingViewSet(WorkflowMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = BookingSerializer

    def get_queryset(self):
        qs = Booking.objects.select_related("offering").order_by("-created_at")
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


class DeliveryInput(serializers.Serializer):
    pickup = AddressInput()
    dropoff = AddressInput()
    description = serializers.CharField(max_length=500)
    weight_kg = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("20")
    )


class DeliverySerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = fields


class DeliveryViewSet(WorkflowMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = DeliverySerializer

    def get_queryset(self):
        qs = DeliveryRequest.objects.order_by("-created_at")
        return (
            qs
            if self.request.user.has_perm("operations.view_deliveryrequest")
            else qs.filter(Q(customer=self.request.user) | Q(rider=self.request.user))
        )

    def create(self, request):
        serializer = DeliveryInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        division = get_object_or_404(Division, slug="delivery", active=True)
        pickup_area = validate_area(data["pickup"], division)
        dropoff_area = validate_area(data["dropoff"], division)
        fee = (
            max(pickup_area.delivery_fee, dropoff_area.delivery_fee)
            + max(Decimal("0"), data["weight_kg"] - 1) * 20
        )
        with transaction.atomic():
            obj = DeliveryRequest.objects.create(
                customer=request.user, fee=fee.quantize(Decimal("0.01")), **data
            )
            audit(request.user, "delivery.created", obj.pk)
            emit(request.user, "delivery.created", reference=str(obj.pk))
        return Response(self.get_serializer(obj).data, status=201)
