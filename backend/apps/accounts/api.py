from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
import re
from django.contrib.sessions.models import Session
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.operations.services import audit, emit
from .models import AccountDeletionRequest, Address, ConsentLog


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "language",
            "marketing_consent",
            "email_verified",
            "is_staff",
            "roles",
        ]
        read_only_fields = ["id", "username", "email", "is_staff", "roles", "email_verified"]

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, max_length=128)

    class Meta:
        model = get_user_model()
        fields = ["username", "email", "password", "first_name", "phone"]

    def validate_email(self, value):
        value = value.lower().strip()
        if get_user_model().objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate(self, data):
        try:
            validate_password(
                data["password"], get_user_model()(**{k: v for k, v in data.items() if k != "password"})
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        return data


@method_decorator(csrf_protect, name="dispatch")
class AuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def get_throttles(self):
        if self.request.method == "POST" and self.kwargs.get("operation") in {"login", "register"}:
            return super().get_throttles()
        return []

    def get(self, request, operation):
        if operation == "csrf":
            return Response({"csrfToken": get_token(request)})
        if operation == "me":
            return Response(UserSerializer(request.user).data if request.user.is_authenticated else None)
        return Response(status=404)

    def post(self, request, operation):
        if operation == "register":
            serializer = RegistrationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                user = get_user_model().objects.create_user(**serializer.validated_data)
                emit(user, "customer.registered", reference=str(user.id))
                audit(user, "account.registered", user.pk)
            login(request, user)
            return Response(UserSerializer(user).data, status=201)
        if operation == "login":
            identifier = request.data.get("username", "")
            password = request.data.get("password", "")
            if not isinstance(identifier, str) or not isinstance(password, str) or len(identifier) > 254 or len(password) > 128:
                return Response({"error": "Invalid login details."}, status=400)
            identifier = identifier.strip()
            candidates = list(get_user_model().objects.filter(Q(username=identifier) | Q(email__iexact=identifier))[:2]) if identifier else []
            if len(candidates) == 1:
                user = authenticate(request, username=candidates[0].username, password=password)
            else:
                # Reject ambiguous legacy identities without skipping password hashing for unknown users.
                get_user_model()().set_password(password)
                user = None
            if not user:
                return Response({"error": "Invalid login details."}, status=400)
            login(request, user)
            audit(user, "account.login", user.pk)
            return Response(UserSerializer(user).data)
        if operation == "logout":
            if request.user.is_authenticated:
                audit(request.user, "account.logout", request.user.pk)
            logout(request)
            return Response(status=204)
        return Response(status=404)

    def patch(self, request, operation):
        if operation != "me" or not request.user.is_authenticated:
            return Response(status=403)
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            if "marketing_consent" in serializer.validated_data:
                ConsentLog.objects.create(
                    user=request.user, granted=serializer.validated_data["marketing_consent"]
                )
            serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        old_password = str(request.data.get("old_password", ""))
        new_password = str(request.data.get("new_password", ""))
        if not request.user.check_password(old_password):
            return Response({"error": "Current password is incorrect."}, status=400)
        if old_password == new_password:
            return Response({"error": "Choose a different password."}, status=400)
        try:
            validate_password(new_password, request.user)
        except DjangoValidationError as exc:
            return Response({"error": {"new_password": exc.messages}}, status=400)
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        audit(request.user, "account.password_changed", request.user.pk)
        return Response({"changed": True})


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = str(request.user.pk)
        sessions = Session.objects.filter(expire_date__gte=timezone.now())
        for session in sessions:
            if str(session.get_decoded().get("_auth_user_id")) == user_id:
                session.delete()
        audit(request.user, "account.logout_all", request.user.pk)
        logout(request)
        return Response({"logged_out": True})


class AccountDeletionRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        reason = str(request.data.get("reason", ""))[:2000]
        deletion_request, created = AccountDeletionRequest.objects.get_or_create(
            user=request.user,
            defaults={"reason": reason},
        )
        if not created and deletion_request.status in {"requested", "reviewing"}:
            return Response({"requested": True, "status": deletion_request.status})
        deletion_request.reason = reason
        deletion_request.status = "requested"
        deletion_request.save(update_fields=["reason", "status", "updated_at"])
        audit(request.user, "account.deletion_requested", request.user.pk)
        return Response({"requested": True, "status": deletion_request.status}, status=201)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = force_bytes(user.pk).hex()
            token = default_token_generator.make_token(user)
            frontend = request.headers.get("Origin") or "http://localhost:3000"
            if not frontend.startswith("https://") and "localhost" not in frontend and "127.0.0.1" not in frontend:
                frontend = "https://www.uservicebd.com"
            send_mail("Reset your U Service BD password", f"Use this link to reset your password:\n{frontend}/reset-password?uid={uid}&token={token}\n\nIf you did not request this, ignore this message.", None, [user.email], fail_silently=True)
        return Response({"sent": True, "message": "If an active account matches, reset instructions have been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        try:
            user_id = force_str(bytes.fromhex(str(request.data.get("uid", ""))))
            user = get_user_model().objects.get(pk=user_id, is_active=True)
            token = str(request.data.get("token", ""))
        except (ValueError, TypeError, get_user_model().DoesNotExist):
            return Response({"error": "This reset link is invalid or expired."}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({"error": "This reset link is invalid or expired."}, status=400)
        password = str(request.data.get("new_password", ""))
        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response({"error": {"new_password": exc.messages}}, status=400)
        user.set_password(password)
        user.save(update_fields=["password"])
        audit(user, "account.password_reset", user.pk)
        return Response({"changed": True})


class EmailVerificationRequestView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        if request.user.email_verified:
            return Response({"sent": False, "verified": True})
        token = default_token_generator.make_token(request.user)
        uid = force_bytes(request.user.pk).hex()
        frontend = request.headers.get("Origin") or "http://localhost:3000"
        if not frontend.startswith("https://") and "localhost" not in frontend and "127.0.0.1" not in frontend:
            frontend = "https://www.uservicebd.com"
        send_mail("Verify your U Service BD email", f"Verify your email:\n{frontend}/verify-email?uid={uid}&token={token}", None, [request.user.email], fail_silently=True)
        return Response({"sent": True})


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        try:
            user_id = force_str(bytes.fromhex(str(request.data.get("uid", ""))))
            user = get_user_model().objects.get(pk=user_id, is_active=True)
        except (ValueError, TypeError, get_user_model().DoesNotExist):
            return Response({"error": "This verification link is invalid or expired."}, status=400)
        if user.email_verified:
            return Response({"error": "This verification link is invalid or expired."}, status=400)
        if not default_token_generator.check_token(user, str(request.data.get("token", ""))):
            return Response({"error": "This verification link is invalid or expired."}, status=400)
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        audit(user, "account.email_verified", user.pk)
        return Response({"verified": True})


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "label", "recipient", "phone", "district", "area", "line", "postal_code"]

    def validate_phone(self, value):
        if not re.fullmatch(r"\+?[0-9]{10,15}", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def export(self, request):
        return Response(
            {
                "profile": UserSerializer(request.user).data,
                "addresses": self.get_serializer(self.get_queryset(), many=True).data,
            }
        )
