from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum, Count
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.operations.models import Order, Booking, DeliveryRequest
from apps.operations.services import audit, emit
from .models import (
    Lead,
    SupportTicket,
    SupportMessage,
    Review,
    Notification,
    LoyaltyEntry,
    LoyaltyReward,
    LoyaltyRedemption,
)


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
    message = serializers.CharField(max_length=5000)
    is_owner = serializers.SerializerMethodField()
    can_respond = serializers.SerializerMethodField()
    assigned_name = serializers.SerializerMethodField()
    can_route = serializers.SerializerMethodField()

    def get_can_route(self, obj):
        user = self.context["request"].user
        return user.is_staff and user.has_perms(["engagement.view_supportticket", "engagement.change_supportticket"])

    def get_assigned_name(self, obj):
        return (obj.assigned_to.get_full_name() or "Support team") if obj.assigned_to_id else ""

    def get_is_owner(self, obj):
        return obj.customer_id == self.context["request"].user.pk

    def get_can_respond(self, obj):
        user = self.context["request"].user
        return user.is_staff and user.has_perm("engagement.change_supportticket")

    class Meta:
        model = SupportTicket
        fields = ["id", "subject", "message", "status", "response", "created_at", "is_owner", "can_respond", "can_route", "category", "priority", "assigned_to", "assigned_name"]
        read_only_fields = ["id", "status", "response", "created_at", "priority", "assigned_to", "assigned_name"]


class SupportMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = ["id", "sender_role", "body", "created_at"]
        read_only_fields = fields


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        tickets = SupportTicket.objects.select_related("assigned_to").order_by("-created_at", "-pk")
        for field, choices in [("status", ["open", "in_progress", "resolved"]),
                               ("category", [key for key, _ in SupportTicket._meta.get_field("category").choices]),
                               ("priority", [key for key, _ in SupportTicket._meta.get_field("priority").choices])]:
            value = self.request.query_params.get(field)
            if value:
                value = serializers.ChoiceField(choices=choices).run_validation(value)
                tickets = tickets.filter(**{field: value})
        if self.request.query_params.get("assigned_to_me") == "1":
            tickets = tickets.filter(assigned_to=self.request.user)
        if self.request.user.is_staff and self.request.user.has_perm("engagement.view_supportticket"):
            return tickets
        return tickets.filter(customer=self.request.user)

    @action(detail=False, methods=["get"])
    def responders(self, request):
        if not request.user.is_staff or not request.user.has_perms(["engagement.view_supportticket", "engagement.change_supportticket"]):
            raise PermissionDenied()
        candidates = get_user_model().objects.filter(is_active=True, is_staff=True).order_by("pk")
        eligible = [
            {"id": user.pk, "name": user.get_full_name() or user.username}
            for user in candidates if user.has_perms(["engagement.view_supportticket", "engagement.change_supportticket"])
        ]
        return self.get_paginated_response(self.paginate_queryset(eligible))

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def route_ticket(self, request, pk=None):
        if not request.user.is_staff or not request.user.has_perms(["engagement.view_supportticket", "engagement.change_supportticket"]):
            raise PermissionDenied()
        ticket = self.get_object()
        ticket = SupportTicket.objects.select_for_update().get(pk=ticket.pk)
        if ticket.status == "resolved":
            raise ValidationError("Reopen the ticket before routing it.")
        class RoutingInput(serializers.Serializer):
            category = serializers.ChoiceField(choices=SupportTicket._meta.get_field("category").choices)
            priority = serializers.ChoiceField(choices=SupportTicket._meta.get_field("priority").choices)
            assigned_to = serializers.IntegerField(min_value=1, allow_null=True)
        form = RoutingInput(data=request.data)
        form.is_valid(raise_exception=True)
        values = form.validated_data
        assignee = None
        if values["assigned_to"] is not None:
            assignee = get_user_model().objects.filter(pk=values["assigned_to"], is_active=True, is_staff=True).first()
            if not assignee or not assignee.has_perms(["engagement.view_supportticket", "engagement.change_supportticket"]):
                raise ValidationError("Choose an active support team member.")
        previous = {"category": ticket.category, "priority": ticket.priority, "assigned_to": ticket.assigned_to_id}
        if previous == values:
            return Response(self.get_serializer(ticket).data)
        ticket.category, ticket.priority, ticket.assigned_to = values["category"], values["priority"], assignee
        ticket.save(update_fields=["category", "priority", "assigned_to"])
        audit(request.user, "support.routed", ticket.pk, before=previous, after=values)
        if assignee and previous["assigned_to"] != assignee.pk:
            Notification.objects.create(user=assignee, title="Support ticket assigned", body=f"Ticket #{ticket.pk}")
        return Response(self.get_serializer(ticket).data)

    @transaction.atomic
    def perform_create(self, serializer):
        ticket = serializer.save(customer=self.request.user)
        emit(self.request.user, "support.created", reference=str(ticket.pk))

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def respond(self, request, pk=None):
        if not request.user.is_staff or not request.user.has_perm("engagement.change_supportticket"):
            raise PermissionDenied()
        ticket = self.get_object()
        ticket = SupportTicket.objects.select_for_update().get(pk=ticket.pk)
        status = serializers.ChoiceField(choices=["in_progress", "resolved"]).run_validation(request.data.get("status"))
        response = serializers.CharField(max_length=5000).run_validation(request.data.get("response"))
        if ticket.status == "resolved":
            raise ValidationError("The customer must reopen this ticket before another response.")
        before = ticket.status
        ticket.status, ticket.response = status, response
        ticket.save(update_fields=["status", "response"])
        SupportMessage.objects.create(ticket=ticket, author=request.user, sender_role="team", body=response)
        audit(request.user, "support.responded", ticket.pk, before=before, after=status)
        Notification.objects.create(user=ticket.customer, title="Support reply received", body=f"Your ticket #{ticket.pk}: {ticket.subject} has a new reply.")
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        ticket = self.get_object()
        messages = ticket.messages.order_by("-created_at", "-pk")
        page = self.paginate_queryset(messages)
        return self.get_paginated_response(SupportMessageSerializer(page, many=True).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def follow_up(self, request, pk=None):
        ticket = self.get_object()
        ticket = SupportTicket.objects.select_for_update().get(pk=ticket.pk)
        if ticket.customer_id != request.user.pk:
            raise PermissionDenied()
        if ticket.status == "resolved":
            raise ValidationError("Reopen your ticket before sending a follow-up.")
        body = serializers.CharField(max_length=5000).run_validation(request.data.get("body"))
        message = SupportMessage.objects.create(ticket=ticket, author=request.user, sender_role="customer", body=body)
        audit(request.user, "support.follow_up", ticket.pk)
        return Response(SupportMessageSerializer(message).data, status=201)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        ticket = SupportTicket.objects.select_for_update().get(pk=ticket.pk)
        if ticket.customer_id != request.user.pk:
            raise PermissionDenied()
        if ticket.status != "resolved":
            raise ValidationError("Only resolved tickets can be reopened.")
        ticket.status = "open"
        ticket.save(update_fields=["status"])
        audit(request.user, "support.reopened", ticket.pk)
        return Response(self.get_serializer(ticket).data)


class ReviewSerializer(serializers.ModelSerializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=2000)

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

    @transaction.atomic
    def perform_create(self, serializer):
        field = "order" if serializer.validated_data.get("order") else "booking"
        target = serializer.validated_data[field]
        type(target).objects.select_for_update().get(pk=target.pk)
        if Review.objects.filter(**{field: target}).exists():
            raise ValidationError("This purchase already has a review.")
        serializer.save(customer=self.request.user)

    @action(detail=False, methods=["get"])
    def eligible_purchases(self, request):
        kind = request.query_params.get("kind", "order")
        if kind not in {"order", "booking"}:
            raise ValidationError("Choose order or booking.")
        model = Order if kind == "order" else Booking
        purchases = model.objects.filter(
            customer=request.user, status="delivered" if kind == "order" else "completed",
            review__isnull=True,
        ).order_by("-created_at", "-pk")
        if kind == "booking":
            purchases = purchases.select_related("offering")
        else:
            purchases = purchases.select_related("division")
        page = self.paginate_queryset(purchases)
        data = [{"id": str(item.pk), "label": item.division.name if kind == "order" else item.offering.name,
                 "created_at": item.created_at} for item in page]
        return self.get_paginated_response(data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "read", "created_at"]
        read_only_fields = ["id", "title", "body", "created_at"]


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(read=False).update(read=True)
        return Response({"updated": updated})


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


class LoyaltySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyEntry
        fields = ["id", "points", "reference", "created_at"]
        read_only_fields = fields


class LoyaltyViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoyaltySerializer

    def get_queryset(self):
        return LoyaltyEntry.objects.filter(customer=self.request.user).order_by("-created_at", "-pk")

    @action(detail=False, methods=["get"])
    def balance(self, request):
        return Response({"points": self.get_queryset().aggregate(total=Sum("points"))["total"] or 0})

    @action(detail=False, methods=["get"])
    def rewards(self, request):
        rewards = LoyaltyReward.objects.filter(active=True).order_by("points_cost", "pk")
        return Response(LoyaltyRewardSerializer(rewards, many=True).data)

    @action(detail=False, methods=["get"])
    def redemptions(self, request):
        redemptions = LoyaltyRedemption.objects.filter(customer=request.user).select_related("reward").order_by(
            "-created_at", "-pk"
        )
        return Response(LoyaltyRedemptionSerializer(redemptions, many=True).data)

    @action(detail=False, methods=["post"])
    def redeem(self, request):
        serializer = LoyaltyRedemptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reward_id = serializer.validated_data["reward_id"]

        with transaction.atomic():
            customer = get_user_model().objects.select_for_update().get(pk=request.user.pk)
            reward = LoyaltyReward.objects.select_for_update().filter(pk=reward_id, active=True).first()
            if reward is None:
                raise ValidationError({"reward_id": "This reward is not available."})

            balance = LoyaltyEntry.objects.filter(customer=customer).aggregate(total=Sum("points"))["total"] or 0
            if balance < reward.points_cost:
                raise ValidationError({"points": "You do not have enough points for this reward."})

            redemption = LoyaltyRedemption.objects.create(
                customer=customer,
                reward=reward,
                points_spent=reward.points_cost,
            )
            LoyaltyEntry.objects.create(
                customer=customer,
                points=-reward.points_cost,
                reference=f"loyalty-redemption-{redemption.pk}",
            )
            audit(request.user, "loyalty.redeemed", redemption.pk, reward=reward.name, points=reward.points_cost)

        return Response(
            {
                "id": redemption.pk,
                "reward": reward.name,
                "points_spent": reward.points_cost,
                "balance": balance - reward.points_cost,
            },
            status=201,
        )


class LoyaltyRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyReward
        fields = ["id", "name", "description", "points_cost"]
        read_only_fields = fields


class LoyaltyRedemptionSerializer(serializers.ModelSerializer):
    reward = serializers.CharField(source="reward.name", read_only=True)

    class Meta:
        model = LoyaltyRedemption
        fields = ["id", "reward", "points_spent", "created_at", "fulfilled_at"]
        read_only_fields = fields


class LoyaltyRedemptionRequestSerializer(serializers.Serializer):
    reward_id = serializers.IntegerField(min_value=1)


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
