from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
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
from .models import Address, ConsentLog


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
            "is_staff",
            "roles",
        ]
        read_only_fields = ["id", "username", "email", "is_staff", "roles"]

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
            user = authenticate(
                request, username=request.data.get("username", ""), password=request.data.get("password", "")
            )
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


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "label", "recipient", "phone", "district", "area", "line", "postal_code"]


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
