import hashlib
from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.operations.services import audit
from .models import Division, Organization, PartnerApplication, PartnerDocument


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerDocument
        fields = ["id", "title", "sha256", "expires_on", "active", "review_status", "review_note", "reviewed_at", "created_at"]


class ApplicationSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()
    documents = DocumentSerializer(many=True, read_only=True)
    division = serializers.PrimaryKeyRelatedField(queryset=Division.objects.filter(active=True))
    details = serializers.CharField(max_length=5000, allow_blank=True, required=False)

    class Meta:
        model = PartnerApplication
        fields = ["id", "is_owner", "division", "business_name", "phone", "area", "address", "details",
                  "status", "review_note", "verification_reference", "organization", "documents", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "review_note", "verification_reference", "organization", "created_at", "updated_at"]

    def get_is_owner(self, instance):
        return instance.owner_id == self.context["request"].user.pk

    def validate_phone(self, value):
        value = value.replace(" ", "").replace("-", "")
        if value.startswith("+880"):
            value = "0" + value[4:]
        if len(value) != 11 or not value.isascii() or not value.isdigit() or not value.startswith("01"):
            raise serializers.ValidationError("Enter a Bangladesh mobile number.")
        return value


class ReviewInput(serializers.Serializer):
    status = serializers.ChoiceField(choices=["reviewing", "needs_changes", "approved", "rejected"])
    review_note = serializers.CharField(max_length=2000)
    verification_reference = serializers.CharField(max_length=160, required=False, default="")


class DocumentReviewInput(serializers.Serializer):
    status = serializers.ChoiceField(choices=["accepted", "rejected"])
    note = serializers.CharField(max_length=2000)


class PartnerApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def reviewer(self):
        return self.request.user.has_perms(["catalog.view_partnerapplication", "catalog.change_partnerapplication"])

    def get_queryset(self):
        qs = PartnerApplication.objects.select_related("division").prefetch_related("documents").order_by("-created_at", "-pk")
        return qs if self.reviewer() else qs.filter(owner=self.request.user)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response

    def perform_create(self, serializer):
        application = serializer.save(owner=self.request.user)
        audit(self.request.user, "partner.submitted", application.pk)

    def locked(self):
        application = self.get_object()
        return PartnerApplication.objects.select_for_update().get(pk=application.pk)

    def editable(self, application):
        if application.owner_id != self.request.user.pk or application.status not in ["submitted", "needs_changes"]:
            raise PermissionDenied("Only the applicant may edit an application awaiting review or changes.")

    @transaction.atomic
    def partial_update(self, request, pk=None):
        application = self.locked()
        self.editable(application)
        serializer = self.get_serializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status="submitted", review_note="", verification_reference="")
        audit(request.user, "partner.updated", application.pk)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def capabilities(self, request):
        return Response({"review": self.reviewer()})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        application = self.locked()
        if application.owner_id != request.user.pk or application.status not in ["submitted", "needs_changes"]:
            raise PermissionDenied("This application cannot be cancelled.")
        application.status = "cancelled"
        application.save(update_fields=["status", "updated_at"])
        audit(request.user, "partner.cancelled", application.pk)
        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def document(self, request, pk=None):
        application = self.locked()
        self.editable(application)
        upload = request.FILES.get("file")
        metadata = serializers.Serializer()
        metadata.fields["title"] = serializers.CharField(max_length=160)
        metadata.fields["expires_on"] = serializers.DateField(required=False, allow_null=True)
        metadata.initial_data = request.data
        metadata.is_valid(raise_exception=True)
        if not upload or upload.size > 5 * 1024 * 1024 or upload.read(5) != b"%PDF-":
            raise ValidationError("Upload a PDF no larger than 5 MB.")
        upload.seek(0)
        if application.documents.count() >= 10:
            raise ValidationError("Maximum ten documents per application.")
        expiry = metadata.validated_data.get("expires_on")
        if expiry and expiry < timezone.localdate():
            raise ValidationError("The document has expired.")
        digest = hashlib.sha256()
        for chunk in upload.chunks():
            digest.update(chunk)
        upload.seek(0)
        document = PartnerDocument.objects.create(application=application, file=upload, sha256=digest.hexdigest(), **metadata.validated_data)
        audit(request.user, "partner.document_uploaded", application.pk, document=document.pk)
        return Response(DocumentSerializer(document).data, status=201)

    @action(detail=True, methods=["get"], url_path=r"documents/(?P<document_id>\d+)/download")
    def download(self, request, pk=None, document_id=None):
        application = self.get_object()
        document = application.documents.filter(pk=document_id).first()
        if not document:
            from django.http import Http404
            raise Http404
        response = FileResponse(document.file.open("rb"), as_attachment=True, filename="partner-document.pdf", content_type="application/pdf")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @action(detail=True, methods=["post"], url_path=r"documents/(?P<document_id>\d+)/withdraw")
    @transaction.atomic
    def withdraw(self, request, pk=None, document_id=None):
        application = self.locked()
        self.editable(application)
        document = application.documents.filter(pk=document_id).first()
        if not document:
            raise ValidationError("Document not found.")
        document.active = False
        document.save(update_fields=["active"])
        audit(request.user, "partner.document_withdrawn", application.pk, document=document.pk)
        return Response(DocumentSerializer(document).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def review(self, request, pk=None):
        if not self.reviewer():
            raise PermissionDenied()
        application = self.locked()
        data = ReviewInput(data=request.data)
        if application.owner_id == request.user.pk:
            raise PermissionDenied("Applicants cannot review their own application.")
        data.is_valid(raise_exception=True)
        target = data.validated_data["status"]
        allowed = {"submitted": ["reviewing"], "reviewing": ["needs_changes", "approved", "rejected"]}
        if target not in allowed.get(application.status, []):
            raise ValidationError("Invalid review transition.")
        if target == "approved":
            if not application.division.active:
                raise ValidationError("This division is inactive.")
            if not data.validated_data["verification_reference"] or not application.documents.filter(active=True).exists():
                raise ValidationError("Review the documents and provide a verification reference before approval.")
            if application.documents.filter(active=True, expires_on__lt=timezone.localdate()).exists():
                raise ValidationError("An uploaded document has expired; request updated documents.")
            if application.documents.filter(active=True).exclude(review_status="accepted").exists():
                raise ValidationError("Every active document must be individually accepted before approval.")
            application.organization = Organization.objects.create(
                owner=application.owner, division=application.division, name=application.business_name,
                area=application.area, address=application.address, description=application.details, approved=True,
            )
        for key, value in data.validated_data.items():
            setattr(application, key, value)
        application.save()
        audit(request.user, "partner.reviewed", application.pk, status=target)
        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=["post"], url_path=r"documents/(?P<document_id>\d+)/review")
    @transaction.atomic
    def review_document(self, request, pk=None, document_id=None):
        if not self.reviewer():
            raise PermissionDenied()
        application = self.locked()
        if application.owner_id == request.user.pk:
            raise PermissionDenied("Applicants cannot review their own documents.")
        if application.status != "reviewing":
            raise ValidationError("Start application review before reviewing documents.")
        document = application.documents.filter(pk=document_id, active=True).first()
        if not document:
            raise ValidationError("Active document not found.")
        data = DocumentReviewInput(data=request.data)
        data.is_valid(raise_exception=True)
        if data.validated_data["status"] == "accepted" and document.expires_on and document.expires_on < timezone.localdate():
            raise ValidationError("An expired document cannot be accepted.")
        document.review_status = data.validated_data["status"]
        document.review_note = data.validated_data["note"]
        document.reviewed_at = timezone.now()
        document.save(update_fields=["review_status", "review_note", "reviewed_at"])
        audit(request.user, "partner.document_reviewed", application.pk, document=document.pk, status=document.review_status, sha256=document.sha256, note=document.review_note)
        return Response(DocumentSerializer(document).data)
