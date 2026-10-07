from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.operations.models import Order, Booking, DeliveryRequest
from apps.operations.services import emit
from .models import Lead, SupportTicket, Review, Notification, LoyaltyEntry


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ["id", "name", "email", "phone", "interest", "message", "source", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]


class LeadViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = LeadSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"received": True}, status=201)


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ["id", "subject", "message", "status", "response", "created_at"]
        read_only_fields = ["id", "status", "response", "created_at"]


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return SupportTicket.objects.filter(customer=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        ticket = serializer.save(customer=self.request.user)
        emit(self.request.user, "support.created", reference=str(ticket.pk))


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "order", "booking", "rating", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        user = self.context["request"].user
        target = data.get("order") or data.get("booking")
        if not target or bool(data.get("order")) == bool(data.get("booking")):
            raise ValidationError("Select one completed order or booking.")
        if target.customer_id != user.id or target.status not in {"delivered", "completed"}:
            raise ValidationError("Review only your completed purchases.")
        return data


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Review.objects.filter(customer=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "read", "created_at"]
        read_only_fields = ["id", "title", "body", "created_at"]


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")


class DashboardView(APIView):
    def get(self, request):
        user = request.user
        orders = Order.objects.filter(customer=user)
        return Response(
            {
                "orders": orders.count(),
                "bookings": Booking.objects.filter(customer=user).count(),
                "deliveries": DeliveryRequest.objects.filter(customer=user).count(),
                "paid_total": orders.filter(payment_status="paid").aggregate(total=Sum("total"))["total"]
                or 0,
                "loyalty_points": LoyaltyEntry.objects.filter(customer=user).aggregate(total=Sum("points"))[
                    "total"
                ]
                or 0,
            }
        )


class AnalyticsView(APIView):
    def get(self, request):
        if not request.user.has_perm("operations.view_payment"):
            raise PermissionDenied()
        orders = Order.objects.all()
        return Response(
            {
                "orders": orders.count(),
                "customers": get_user_model().objects.filter(is_staff=False).count(),
                "bookings": Booking.objects.count(),
                "leads": Lead.objects.count(),
                "verified_revenue": orders.filter(payment_status="paid").aggregate(total=Sum("total"))[
                    "total"
                ]
                or 0,
                "cod_outstanding": orders.filter(status="delivered", payment_status="unpaid").aggregate(
                    total=Sum("total")
                )["total"]
                or 0,
                "by_division": list(
                    orders.values("division__name").annotate(orders=Count("id"), value=Sum("total"))
                ),
                "note": "Order value includes unpaid orders; verified revenue includes only reconciled payments.",
            }
        )
