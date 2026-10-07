"""SSLCOMMERZ hosted checkout. Never accepts a browser assertion of payment success."""

import os
import uuid
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
import requests
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError, APIException
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Order, Payment
from .services import audit, emit


class GatewayUnavailable(APIException):
    status_code = 503
    default_detail = "Payment provider unavailable. No payment has been confirmed."


def configured():
    return all(
        os.getenv(k) for k in ["SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD", "PAYMENT_PUBLIC_URL"]
    )


def gateway_base():
    return (
        "https://sandbox.sslcommerz.com"
        if os.getenv("SSLCOMMERZ_SANDBOX", "true").lower() == "true"
        else "https://securepay.sslcommerz.com"
    )


def credentials():
    if not configured():
        raise GatewayUnavailable("Online payments are not configured.")
    return {
        "store_id": os.environ["SSLCOMMERZ_STORE_ID"],
        "store_passwd": os.environ["SSLCOMMERZ_STORE_PASSWORD"],
    }


class PaymentMethodsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"methods": ["cod"] + (["sslcommerz"] if configured() else [])})


class PaymentStartView(APIView):
    def post(self, request, order_id):
        creds = credentials()
        public = os.environ["PAYMENT_PUBLIC_URL"].rstrip("/")
        if not public.startswith("https://"):
            raise GatewayUnavailable("A public HTTPS payment callback URL is required.")
        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), pk=order_id, customer=request.user)
            if (
                order.payment_method != "sslcommerz"
                or order.payment_status == "paid"
                or order.status != "placed"
            ):
                raise ValidationError(
                    "This order is not eligible for online payment. Prescription review must finish first."
                )
            payment = Payment.objects.filter(order=order, provider="sslcommerz").first()
            if payment:
                if payment.checkout_url and payment.status == "pending":
                    return Response({"redirect_url": payment.checkout_url})
                raise ValidationError(
                    "A payment attempt already exists. Contact support to reconcile it before another attempt."
                )
            payment = Payment.objects.create(
                order=order, reference="US" + uuid.uuid4().hex[:28], provider="sslcommerz", amount=order.total
            )
        # Persist the attempt before network IO. An ambiguous timeout must not create a second charge.
        payload = {
            **creds,
            "total_amount": str(order.total),
            "currency": "BDT",
            "tran_id": payment.reference,
            "success_url": public + "/api/v1/payments/return/",
            "fail_url": public + "/api/v1/payments/return/",
            "cancel_url": public + "/api/v1/payments/return/",
            "ipn_url": public + "/api/v1/payments/ipn/",
            "cus_name": order.address["recipient"],
            "cus_email": order.customer.email,
            "cus_add1": order.address["line"],
            "cus_city": order.address["area"],
            "cus_country": "Bangladesh",
            "cus_phone": order.address["phone"],
            "shipping_method": "NO",
            "product_name": "U Service order",
            "product_category": order.division.slug,
            "product_profile": "physical-goods",
        }
        try:
            response = requests.post(gateway_base() + "/gwprocess/v4/api.php", data=payload, timeout=20)
            response.raise_for_status()
            data = response.json()
            redirect = data.get("GatewayPageURL", "")
            if (
                data.get("status") != "SUCCESS"
                or urlparse(redirect).scheme != "https"
                or urlparse(redirect).hostname != urlparse(gateway_base()).hostname
            ):
                raise ValueError("Invalid gateway response")
        except (requests.RequestException, ValueError, TypeError, AttributeError):
            Payment.objects.filter(pk=payment.pk).update(status="uncertain")
            raise GatewayUnavailable()
        Payment.objects.filter(pk=payment.pk).update(
            checkout_url=redirect, session_key=data.get("sessionkey", "")
        )
        audit(request.user, "payment.initiated", order.pk, reference=payment.reference)
        return Response({"redirect_url": redirect})


def verify_payment(validation_id):
    creds = credentials()
    try:
        response = requests.get(
            gateway_base() + "/validator/api/validationserverAPI.php",
            params={**creds, "val_id": validation_id, "format": "json"},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        amount = Decimal(str(data["amount"]))
        if (
            not amount.is_finite()
            or data.get("status") not in {"VALID", "VALIDATED"}
            or data.get("currency") != "BDT"
            or data.get("val_id") != validation_id
        ):
            raise ValidationError("Payment verification failed.")
    except (requests.RequestException, ValueError, InvalidOperation, KeyError, TypeError):
        raise GatewayUnavailable()
    reference = data.get("tran_id")
    payment_info = get_object_or_404(Payment, reference=reference, provider="sslcommerz")
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=payment_info.order_id)
        payment = Payment.objects.select_for_update().get(pk=payment_info.pk)
        if amount != payment.amount or amount != order.total:
            raise ValidationError("Verified amount does not match the order.")
        if payment.status == "verified":
            return
        if Payment.objects.filter(validation_id=validation_id).exclude(pk=payment.pk).exists():
            raise ValidationError("Validation ID already assigned.")
        payment.validation_id = validation_id
        if str(data.get("risk_level", "1")) != "0" or order.status in {"cancelled", "rejected", "returned"}:
            payment.status = "review_required"
            payment.save()
            audit(None, "payment.review_required", order.pk, reference=reference)
            return
        payment.status = "verified"
        payment.verified_at = timezone.now()
        payment.save()
        order.payment_status = "paid"
        order.save(update_fields=["payment_status"])
        audit(None, "payment.verified", order.pk, reference=reference, amount=str(amount))
        emit(order.customer, "order.paid", reference=str(order.pk), total=str(amount))


class PaymentIPNView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        validation_id = str(request.data.get("val_id", ""))
        if not validation_id or len(validation_id) > 100:
            raise ValidationError("Validation ID required.")
        # Untrusted IPN fields are never used to settle the order. Independently query
        # the gateway using merchant credentials and compare its authoritative record.
        verify_payment(validation_id)
        return Response({"received": True})


class PaymentReturnView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from django.http import HttpResponseRedirect

        return HttpResponseRedirect("/account")

    def get(self, request):
        return self.post(request)
