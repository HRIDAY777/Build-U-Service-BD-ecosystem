import calendar
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework import serializers, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from apps.operations.services import audit
from .project_models import ManagedProject, ProjectApplication, ProjectEntry, ProjectUpdate
from .models import Notification

PLANS = {"starter": (10000, 4, 10800), "basic": (25000, 6, 28000), "premium": (50000, 12, 61000), "regular": (100000, 40, 125000), "growth": (100000, 40, 150000)}


def month_date(start, offset):
    month = start.month - 1 + offset
    year = start.year + month // 12
    month = month % 12 + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def schedule(application):
    if not application.start_date:
        return []
    amount = application.expected_total if application.kind == "investor" else application.amount * Decimal("0.4")
    amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    count = application.months if application.kind == "client" or application.package == "regular" else 1
    each = (amount / count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return [{"date": month_date(application.start_date, (i + 1) if count > 1 else application.months).isoformat(), "amount": str(each if i < count - 1 else amount - each * (count - 1))} for i in range(count)]


class UpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectUpdate
        fields = ["id", "title", "title_bn", "description", "description_bn", "date"]


class ProjectSerializer(serializers.ModelSerializer):
    updates = serializers.SerializerMethodField()

    def get_updates(self, obj):
        return UpdateSerializer(obj.updates.filter(public=True).order_by("-date", "-id"), many=True).data

    class Meta:
        model = ManagedProject
        fields = ["id", "title", "title_bn", "category", "area", "description", "description_bn", "image", "progress", "updates"]


class ManagedProjectViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = ProjectSerializer
    queryset = ManagedProject.objects.filter(published=True).order_by("-created_at")

    def get_queryset(self):
        user = self.request.user
        qs = ManagedProject.objects.all().order_by("-created_at") if user.is_staff and user.has_perm("engagement.view_managedproject") else super().get_queryset()
        if category := self.request.query_params.get("category"):
            qs = qs.filter(category=category)
        return qs


class EntrySerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    class Meta:
        model = ProjectEntry
        fields = ["id", "kind", "amount", "reference", "date", "note"]


class ApplicationSerializer(serializers.ModelSerializer):
    phone = serializers.RegexField(r"^\+?[0-9][0-9 -]{6,19}$", max_length=20)
    entries = EntrySerializer(many=True, read_only=True)
    payment_schedule = serializers.SerializerMethodField()
    project_title = serializers.CharField(source="project.title", read_only=True, default="")
    updates = serializers.SerializerMethodField()
    consent = serializers.BooleanField(write_only=True)
    term = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    def get_is_owner(self, obj):
        return obj.customer_id == self.context["request"].user.pk

    def get_term(self, obj):
        if not obj.start_date:
            return {"maturity_date": None, "elapsed_months": 0, "remaining_months": obj.months, "progress_percent": 0}
        end = month_date(obj.start_date, obj.months)
        today = timezone.localdate()
        elapsed = sum(month_date(obj.start_date, i) <= today for i in range(1, obj.months + 1))
        percent = max(0, min(100, int((today - obj.start_date).days / max(1, (end - obj.start_date).days) * 100)))
        return {"maturity_date": end.isoformat(), "elapsed_months": elapsed, "remaining_months": obj.months - elapsed, "progress_percent": percent}

    def get_updates(self, obj):
        return UpdateSerializer(obj.project.updates.order_by("-date", "-id"), many=True).data if obj.project_id else []

    def get_payment_schedule(self, obj):
        rows = schedule(obj)
        paid = sum((e.amount for e in obj.entries.all() if e.kind == ("distribution" if obj.kind == "investor" else "receipt")), Decimal(0))
        if obj.kind == "client":
            paid -= sum((e.amount for e in obj.entries.all() if e.kind == "refund"), Decimal(0))
            paid -= (obj.amount * Decimal("0.6")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        for row in rows:
            settled = min(max(paid, Decimal(0)), Decimal(row["amount"]))
            row["recorded_paid"] = str(settled)
            row["remaining"] = str(Decimal(row["amount"]) - settled)
            paid -= settled
        return rows

    def validate(self, attrs):
        if not attrs.pop("consent", False):
            raise serializers.ValidationError("Consent is required.")
        if not attrs["name"].strip() or not attrs["address"].strip() or not attrs["details"].strip():
            raise serializers.ValidationError("Name, address and project details are required.")
        if attrs["kind"] == "investor":
            plan = PLANS.get(attrs.get("package"))
            if not plan:
                raise serializers.ValidationError({"package": "Choose an available package."})
            unit, months, total = map(Decimal, plan)
            amount = attrs["amount"]
            if amount % unit or not unit <= amount <= unit * 100:
                raise serializers.ValidationError({"amount": "Use 1–100 whole package units."})
            attrs["months"] = int(months)
            attrs["expected_total"] = total * (amount / unit)
        else:
            attrs["package"] = ""
            if attrs["amount"] > 100000000:
                raise serializers.ValidationError({"amount": "Maximum project estimate is 100000000."})
            attrs["expected_total"] = attrs["amount"]
        return attrs

    class Meta:
        model = ProjectApplication
        fields = ["id", "kind", "name", "phone", "address", "details", "package", "amount", "months", "expected_total", "terms_version", "status", "project", "project_title", "agreement_reference", "review_note", "start_date", "created_at", "entries", "payment_schedule", "updates", "request_key", "consent"]
        fields += ["term", "accepted_at", "is_owner"]
        read_only_fields = ["id", "expected_total", "terms_version", "status", "project", "agreement_reference", "review_note", "start_date", "created_at", "accepted_at"]
        extra_kwargs = {"phone": {"min_length": 7}, "request_key": {"validators": []}}


class ProjectApplicationViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer

    @action(detail=False, methods=["get"])
    def capabilities(self, request):
        user = request.user
        return Response({"review": user.is_staff and user.has_perm("engagement.change_projectapplication"), "ledger": user.is_staff and user.has_perm("engagement.add_projectentry"), "manage": user.is_staff and user.has_perm("engagement.view_projectapplication")})

    def get_queryset(self):
        qs = ProjectApplication.objects.select_related("project").prefetch_related("entries", "project__updates").order_by("-created_at")
        user = self.request.user
        return qs if user.is_staff and user.has_perm("engagement.view_projectapplication") else qs.filter(customer=user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        existing = ProjectApplication.objects.filter(request_key=serializer.validated_data["request_key"]).first()
        if existing:
            if existing.customer_id != request.user.pk:
                raise PermissionDenied()
            return Response(self.get_serializer(existing).data)
        try:
            with transaction.atomic():
                obj = serializer.save(customer=request.user)
        except IntegrityError:
            obj = ProjectApplication.objects.filter(request_key=serializer.validated_data["request_key"], customer=request.user).first()
            if not obj:
                raise ValidationError("Unable to submit this application. Retry with a new request.")
            return Response(self.get_serializer(obj).data)
        audit(request.user, "project.application.submitted", obj.pk, kind=obj.kind)
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        obj = ProjectApplication.objects.select_for_update().get(pk=self.get_object().pk)
        if obj.customer_id != request.user.pk or obj.status not in ["submitted", "reviewing"]:
            raise ValidationError("Only your pending application can be cancelled.")
        obj.status = "cancelled"
        obj.save()
        audit(request.user, "project.application.cancelled", obj.pk)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept(self, request, pk=None):
        obj = ProjectApplication.objects.select_for_update().get(pk=self.get_object().pk)
        if obj.customer_id != request.user.pk or obj.status != "approved" or request.data.get("consent") is not True:
            raise ValidationError("Only the owner can acknowledge an approved plan with explicit consent.")
        if not obj.accepted_at:
            obj.accepted_at = timezone.now()
            obj.save()
            audit(request.user, "project.application.acknowledged", obj.pk, agreement=obj.agreement_reference, amount=str(obj.amount), terms=obj.terms_version)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def review(self, request, pk=None):
        if not request.user.is_staff or not request.user.has_perm("engagement.change_projectapplication"):
            raise PermissionDenied()
        obj = ProjectApplication.objects.select_for_update().get(pk=self.get_object().pk)
        transitions = {"submitted": ["reviewing", "rejected"], "reviewing": ["approved", "rejected"], "approved": ["active", "cancelled"], "active": ["completed", "cancelled"]}
        target = request.data.get("status")
        if target not in transitions.get(obj.status, []):
            raise ValidationError("Invalid status transition.")
        if target == "approved":
            try:
                obj.project = ManagedProject.objects.get(pk=request.data.get("project"))
            except (ManagedProject.DoesNotExist, ValueError, TypeError):
                raise ValidationError("Select an existing project.")
            obj.agreement_reference = str(request.data.get("agreement_reference", "")).strip()[:180]
            if not obj.agreement_reference:
                raise ValidationError("A reviewed agreement reference is required.")
            if obj.kind == "client" and request.data.get("confirmed_amount"):
                try:
                    amount = Decimal(str(request.data["confirmed_amount"]))
                    if not amount.is_finite() or not Decimal("1") <= amount <= Decimal("100000000") or amount != amount.quantize(Decimal("0.01")):
                        raise ValueError()
                except (ValueError, ArithmeticError):
                    raise ValidationError("Provide a valid confirmed project price with at most two decimals.")
                obj.amount = obj.expected_total = amount
        if target == "active":
            if not obj.accepted_at:
                raise ValidationError("The customer must acknowledge the approved plan first.")
            receipts = sum((e.amount if e.kind == "receipt" else -e.amount if e.kind == "refund" else Decimal(0) for e in obj.entries.all()), Decimal(0))
            required = obj.amount if obj.kind == "investor" else (obj.amount * Decimal("0.6")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if receipts < required:
                raise ValidationError("Record confirmed capital (investor) or the 60% client milestones before starting the term.")
            try:
                obj.start_date = date.fromisoformat(request.data.get("start_date", ""))
            except (ValueError, TypeError):
                raise ValidationError("Provide the confirmed project handover/start date.")
            if obj.start_date > timezone.localdate():
                raise ValidationError("The start date cannot be in the future.")
        if target == "cancelled" and obj.entries.exists():
            receipts = sum((e.amount if e.kind == "receipt" else -e.amount if e.kind == "refund" else Decimal(0) for e in obj.entries.all()), Decimal(0))
            if receipts:
                raise ValidationError("Reconcile recorded receipts before cancelling.")
        if target == "completed":
            entries = list(obj.entries.all())
            paid = sum((e.amount for e in entries if e.kind == ("distribution" if obj.kind == "investor" else "receipt")), Decimal(0))
            if obj.kind == "client":
                paid -= sum((e.amount for e in entries if e.kind == "refund"), Decimal(0))
            if paid < obj.expected_total:
                raise ValidationError("The recorded ledger must be fully settled before completion.")
        obj.review_note = str(request.data.get("note", ""))[:5000]
        obj.status = target
        obj.save()
        audit(request.user, "project.application.reviewed", obj.pk, status=target)
        Notification.objects.create(user=obj.customer, title="Project account update / প্রজেক্ট অ্যাকাউন্ট আপডেট", body=f"Application {obj.pk}: {target}. View details at /project-account.")
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="ledger")
    @transaction.atomic
    def ledger(self, request, pk=None):
        if not request.user.is_staff or not request.user.has_perm("engagement.add_projectentry"):
            raise PermissionDenied()
        obj = ProjectApplication.objects.select_for_update().get(pk=self.get_object().pk)
        if obj.status not in ["approved", "active"]:
            raise ValidationError("Only approved or active applications accept ledger records.")
        if not obj.accepted_at:
            raise ValidationError("Customer acknowledgement is required before recording funds.")
        serializer = EntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        kind, amount = serializer.validated_data["kind"], serializer.validated_data["amount"]
        if kind == "distribution" and (obj.kind != "investor" or obj.status != "active"):
            raise ValidationError("Distributions require an active investor application.")
        entries = list(obj.entries.all())
        if kind == "distribution":
            net_capital = sum((e.amount if e.kind == "receipt" else -e.amount if e.kind == "refund" else Decimal(0) for e in entries), Decimal(0))
            if net_capital < obj.amount or serializer.validated_data["date"] < obj.start_date:
                raise ValidationError("Distribution requires funded capital and a date on or after confirmed start.")
        if kind == "refund" and any(e.kind == "distribution" for e in entries):
            raise ValidationError("A distributed investment needs a reviewed settlement; do not record a capital refund here.")
        total = sum((e.amount for e in entries if e.kind == kind), Decimal(0)) + amount
        cap = obj.expected_total if kind == "distribution" else obj.amount
        if total > cap:
            raise ValidationError("Entry exceeds the application total.")
        if kind == "refund" and total > sum((e.amount for e in entries if e.kind == "receipt"), Decimal(0)):
            raise ValidationError("Refund exceeds recorded receipts.")
        if serializer.validated_data["date"] > timezone.localdate():
            raise ValidationError("Record completed transactions only.")
        try:
            with transaction.atomic():
                entry = serializer.save(application=obj, recorded_by=request.user)
        except IntegrityError:
            raise ValidationError("This transaction reference has already been recorded.")
        audit(request.user, "project.ledger.recorded", obj.pk, entry=entry.pk, reference=entry.reference)
        Notification.objects.create(user=obj.customer, title="Project transaction recorded / প্রজেক্টের লেনদেন রেকর্ড হয়েছে", body=f"{entry.kind}: BDT {entry.amount}; reference {entry.reference}. View /project-account. This is a manual ledger record.")
        return Response(self.get_serializer(obj).data, status=201)
