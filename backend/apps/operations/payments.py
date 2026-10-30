"""Payment gateways for Bangladesh (MFS, Aggregators, Bank & COD). Never accepts an unverified browser assertion of payment success."""

import os
import re
import uuid
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
import requests
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError, APIException, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Order, Payment, PaymentGateway
from .services import audit, emit


PAYMENT_GATEWAY_CODES = [
    "cod",
    "bkash",
    "nagad",
    "rocket",
    "upay",
    "sslcommerz",
    "aamarpay",
    "shurjopay",
    "portpos",
    "ekpay",
    "bank_transfer",
]

DEFAULT_PAYMENT_GATEWAYS = [
    {
        "code": "cod",
        "name": "Cash on Delivery (COD)",
        "name_bn": "ক্যাশ অন ডেলিভারি (COD)",
        "category": "cash",
        "active": True,
        "sandbox": False,
        "account_number": "",
        "instructions": "Pay in cash when your order is delivered to your address.",
        "instructions_bn": "পণ্য বা সেবা আপনার ঠিকানায় পৌঁছানোর পর নগদে পরিশোধ করুন।",
        "display_order": 1,
    },
    {
        "code": "bkash",
        "name": "bKash",
        "name_bn": "বিকাশ (bKash)",
        "category": "mfs",
        "active": True,
        "sandbox": True,
        "account_number": "",
        "instructions": "Send or make payment to our bKash Merchant number and submit the TrxID from your account.",
        "instructions_bn": "আমাদের বিকাশ মার্চেন্ট নম্বরে পেমেন্ট করে আপনার অ্যাকাউন্ট থেকে TrxID জমা দিন।",
        "display_order": 2,
    },
    {
        "code": "nagad",
        "name": "Nagad",
        "name_bn": "নগদ (Nagad)",
        "category": "mfs",
        "active": True,
        "sandbox": True,
        "account_number": "",
        "instructions": "Make payment to our Nagad Merchant number and submit the TrxID from your account.",
        "instructions_bn": "আমাদের নগদ মার্চেন্ট নম্বরে পেমেন্ট করে আপনার অ্যাকাউন্ট থেকে TrxID জমা দিন।",
        "display_order": 3,
    },
    {
        "code": "rocket",
        "name": "Rocket (DBBL)",
        "name_bn": "রকেট - ডাচ-বাংলা ব্যাংক (Rocket)",
        "category": "mfs",
        "active": True,
        "sandbox": True,
        "account_number": "",
        "instructions": "Make payment via DBBL Rocket Merchant and submit the TrxID from your account.",
        "instructions_bn": "ডাচ-বাংলা ব্যাংক রকেট মার্চেন্ট নম্বরে পেমেন্ট করে আপনার অ্যাকাউন্ট থেকে TrxID জমা দিন।",
        "display_order": 4,
    },
    {
        "code": "upay",
        "name": "Upay",
        "name_bn": "উপায় (Upay)",
        "category": "mfs",
        "active": False,
        "sandbox": True,
        "account_number": "",
        "instructions": "Make payment via Upay Merchant and submit the transaction ID from your account.",
        "instructions_bn": "উপায় মার্চেন্ট নম্বরে পেমেন্ট করে আপনার অ্যাকাউন্ট থেকে ট্রানজেকশন আইডি জমা দিন।",
        "display_order": 5,
    },
    {
        "code": "sslcommerz",
        "name": "SSLCOMMERZ (Cards, bKash, Nagad & Net Banking)",
        "name_bn": "এসএসএলকমার্জ (কার্ড, মোবাইল ও নেট ব্যাংকিং)",
        "category": "aggregator",
        "active": True,
        "sandbox": True,
        "account_number": "",
        "instructions": "Pay online with Visa, Mastercard, AMEX, bKash, Nagad or Internet Banking via SSLCOMMERZ.",
        "instructions_bn": "এসএসএলকমার্জের মাধ্যমে ভিসা, মাস্টারকার্ড, বিকাশ, নগদ বা ইন্টারনেট ব্যাংকিংয়ে পরিশোধ করুন।",
        "display_order": 6,
    },
    {
        "code": "aamarpay",
        "name": "aamarPay",
        "name_bn": "আমারপে (aamarPay)",
        "category": "aggregator",
        "active": False,
        "sandbox": True,
        "account_number": "",
        "instructions": "Pay via aamarPay gateway or submit your payment reference from your account.",
        "instructions_bn": "আমারপে গেটওয়ের মাধ্যমে পরিশোধ করুন এবং পেমেন্ট রেফারেন্স আপনার অ্যাকাউন্টে জমা দিন।",
        "display_order": 7,
    },
    {
        "code": "shurjopay",
        "name": "ShurjoPay",
        "name_bn": "সূর্যপে (ShurjoPay)",
        "category": "aggregator",
        "active": False,
        "sandbox": True,
        "account_number": "",
        "instructions": "Pay via ShurjoPay gateway or submit your payment reference from your account.",
        "instructions_bn": "সূর্যপে গেটওয়ের মাধ্যমে পরিশোধ করুন এবং পেমেন্ট রেফারেন্স আপনার অ্যাকাউন্টে জমা দিন।",
        "display_order": 8,
    },
    {
        "code": "portpos",
        "name": "PortPos (PortWallet)",
        "name_bn": "পোর্টপস / পোর্টওয়ালেট (PortPos)",
        "category": "aggregator",
        "active": False,
        "sandbox": True,
        "account_number": "",
        "instructions": "Pay via PortPos gateway and submit your payment reference from your account.",
        "instructions_bn": "পোর্টপস গেটওয়ের মাধ্যমে পরিশোধ করুন এবং পেমেন্ট রেফারেন্স আপনার অ্যাকাউন্টে জমা দিন।",
        "display_order": 9,
    },
    {
        "code": "ekpay",
        "name": "EkPay",
        "name_bn": "একপে (EkPay)",
        "category": "aggregator",
        "active": False,
        "sandbox": True,
        "account_number": "",
        "instructions": "Pay via EkPay gateway and submit your payment reference from your account.",
        "instructions_bn": "একপে গেটওয়ের মাধ্যমে পরিশোধ করুন এবং পেমেন্ট রেফারেন্স আপনার অ্যাকাউন্টে জমা দিন।",
        "display_order": 10,
    },
    {
        "code": "bank_transfer",
        "name": "Bank Transfer (NPSB / BEFTN / RTGS)",
        "name_bn": "ব্যাংক ট্রান্সফার (NPSB / BEFTN)",
        "category": "bank",
        "active": False,
        "sandbox": False,
        "account_number": "",
        "instructions": "Transfer to our company bank account via NPSB/BEFTN and submit the deposit reference.",
        "instructions_bn": "আমাদের কোম্পানি ব্যাংক অ্যাকাউন্টে NPSB/BEFTN ট্রান্সফার করে ডিপোজিট রেফারেন্স জমা দিন।",
        "display_order": 11,
    },
]

GATEWAY_ENV_KEYS = {
    "sslcommerz": ["SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD", "PAYMENT_PUBLIC_URL"],
    "bkash": ["BKASH_APP_KEY", "BKASH_APP_SECRET", "BKASH_USERNAME", "BKASH_PASSWORD"],
    "nagad": ["NAGAD_MERCHANT_ID", "NAGAD_PUBLIC_KEY", "NAGAD_PRIVATE_KEY"],
    "rocket": ["ROCKET_MERCHANT_ID", "ROCKET_SECRET_KEY"],
    "upay": ["UPAY_MERCHANT_ID", "UPAY_MERCHANT_KEY"],
    "aamarpay": ["AAMARPAY_STORE_ID", "AAMARPAY_SIGNATURE_KEY"],
    "shurjopay": ["SHURJOPAY_USERNAME", "SHURJOPAY_PASSWORD"],
    "portpos": ["PORTPOS_APP_KEY", "PORTPOS_SECRET_KEY"],
    "ekpay": ["EKPAY_MERCHANT_ID", "EKPAY_MERCHANT_KEY"],
}


class GatewayUnavailable(APIException):
    status_code = 503
    default_detail = "Payment provider unavailable. No payment has been confirmed."


def configured():
    return all(
        os.getenv(k) for k in ["SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD", "PAYMENT_PUBLIC_URL"]
    )


def gateway_api_configured(code: str) -> bool:
    if code == "cod":
        return True
    keys = GATEWAY_ENV_KEYS.get(code, [])
    return bool(keys) and all(os.getenv(k) for k in keys)


def ensure_payment_gateways():
    existing = set(PaymentGateway.objects.values_list("code", flat=True))
    missing = [
        PaymentGateway(**item)
        for item in DEFAULT_PAYMENT_GATEWAYS
        if item["code"] not in existing
    ]
    if missing:
        PaymentGateway.objects.bulk_create(missing, ignore_conflicts=True)
    return PaymentGateway.objects.order_by("display_order", "id")


def serialize_gateway(gw: PaymentGateway, include_admin_fields: bool = False):
    data = {
        "code": gw.code,
        "name": gw.name,
        "name_bn": gw.name_bn,
        "category": gw.category,
        "active": gw.active,
        "sandbox": gw.sandbox,
        "account_number": gw.account_number,
        "instructions": gw.instructions,
        "instructions_bn": gw.instructions_bn,
        "display_order": gw.display_order,
        "api_configured": gateway_api_configured(gw.code),
    }
    if include_admin_fields:
        data["id"] = gw.pk
        data["updated_at"] = gw.updated_at.isoformat() if gw.updated_at else None
    return data


def is_gateway_usable(code: str) -> bool:
    ensure_payment_gateways()
    gw = PaymentGateway.objects.filter(code=code).first()
    if not gw or not gw.active:
        return False
    if code == "sslcommerz":
        return configured()
    return True


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


def can_manage_gateways(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or user.has_perm("operations.change_paymentgateway")
            or user.has_perm("operations.change_order")
        )
    )


class PaymentMethodsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        gateways = list(ensure_payment_gateways())
        active_gateways = [
            gw
            for gw in gateways
            if gw.active and (gw.code != "sslcommerz" or configured())
        ]
        methods = [gw.code for gw in active_gateways]
        if not methods:
            methods = ["cod"]
        return Response(
            {
                "methods": methods,
                "gateways": [serialize_gateway(gw) for gw in active_gateways],
            }
        )


class PaymentGatewayListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_manage_gateways(request.user):
            raise PermissionDenied("You do not have permission to manage payment gateways.")
        gateways = ensure_payment_gateways()
        return Response(
            {
                "results": [
                    serialize_gateway(gw, include_admin_fields=True) for gw in gateways
                ]
            }
        )


class PaymentGatewayDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, code):
        if not can_manage_gateways(request.user):
            raise PermissionDenied("You do not have permission to manage payment gateways.")
        ensure_payment_gateways()
        with transaction.atomic():
            gw = get_object_or_404(PaymentGateway.objects.select_for_update(), code=code)
            changed = {}
            if "active" in request.data:
                if not isinstance(request.data["active"], bool):
                    raise ValidationError("active must be a boolean.")
                gw.active = request.data["active"]
                changed["active"] = gw.active
            if "sandbox" in request.data:
                if not isinstance(request.data["sandbox"], bool):
                    raise ValidationError("sandbox must be a boolean.")
                gw.sandbox = request.data["sandbox"]
                changed["sandbox"] = gw.sandbox
            if "account_number" in request.data:
                val = str(request.data["account_number"] or "").strip()
                if len(val) > 120:
                    raise ValidationError("Account number is too long (maximum 120 characters).")
                gw.account_number = val
                changed["account_number"] = val
            if "instructions" in request.data:
                val = str(request.data["instructions"] or "").strip()
                if len(val) > 500:
                    raise ValidationError("Instructions must be 500 characters or fewer.")
                gw.instructions = val
                changed["instructions"] = val
            if "instructions_bn" in request.data:
                val = str(request.data["instructions_bn"] or "").strip()
                if len(val) > 500:
                    raise ValidationError("Bangla instructions must be 500 characters or fewer.")
                gw.instructions_bn = val
                changed["instructions_bn"] = val
            if "display_order" in request.data:
                try:
                    order_num = int(request.data["display_order"])
                except (TypeError, ValueError):
                    raise ValidationError("display_order must be an integer.")
                if order_num < 1 or order_num > 100:
                    raise ValidationError("display_order must be between 1 and 100.")
                gw.display_order = order_num
                changed["display_order"] = order_num
            gw.save()
            audit(request.user, "payment_gateway.updated", gw.code, **changed)
        return Response(serialize_gateway(gw, include_admin_fields=True))


class PaymentSubmitTrxView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        raw_trx = str(request.data.get("trx_id", "")).strip().upper()
        sender = str(request.data.get("sender_phone", "")).strip()
        if not re.match(r"^[A-Z0-9_-]{4,60}$", raw_trx):
            raise ValidationError(
                "সঠিক ট্রানজেকশন আইডি (TrxID) দিন (৪–৬০ অক্ষর বা সংখ্যা) / Enter a valid Transaction ID (4–60 alphanumeric characters)."
            )
        if sender and not re.match(r"^\+?[0-9]{10,15}$", sender):
            raise ValidationError("সঠিক প্রেরকের মোবাইল নম্বর দিন / Enter a valid sender phone number.")
        with transaction.atomic():
            order = get_object_or_404(
                Order.objects.select_for_update(), pk=order_id, customer=request.user
            )
            if order.payment_method in {"cod", "sslcommerz"}:
                raise ValidationError(
                    "Manual Transaction ID submission applies only to Mobile Financial Services, Bank Transfer or manual gateway orders."
                )
            if order.payment_status == "paid" or order.status in {"cancelled", "rejected", "returned"}:
                raise ValidationError("This order cannot accept a new payment reference.")
            if Payment.objects.filter(reference=raw_trx).exclude(order=order).exists():
                raise ValidationError("This Transaction ID has already been used.")
            payment = Payment.objects.filter(order=order, provider=order.payment_method).first()
            if payment:
                if payment.status == "verified":
                    raise ValidationError("Payment is already verified.")
                payment.reference = raw_trx
                payment.session_key = sender[:100]
                payment.status = "review_required"
                payment.save(update_fields=["reference", "session_key", "status"])
            else:
                payment = Payment.objects.create(
                    order=order,
                    reference=raw_trx,
                    provider=order.payment_method,
                    amount=order.total,
                    session_key=sender[:100],
                    status="review_required",
                )
            order.payment_status = "review_required"
            order.save(update_fields=["payment_status"])
            audit(
                request.user,
                "payment.trx_submitted",
                order.pk,
                provider=order.payment_method,
                reference=raw_trx,
                sender=sender,
            )
        return Response(
            {
                "order_id": str(order.pk),
                "payment_method": order.payment_method,
                "payment_status": order.payment_status,
                "trx_id": payment.reference,
                "status": payment.status,
            }
        )


class PaymentVerifyTrxView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        if not can_manage_gateways(request.user):
            raise PermissionDenied("You do not have permission to verify payments.")
        decision = str(request.data.get("decision", "verified")).strip()
        if decision not in {"verified", "rejected"}:
            raise ValidationError("Decision must be 'verified' or 'rejected'.")
        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), pk=order_id)
            payment = (
                Payment.objects.select_for_update()
                .filter(order=order)
                .order_by("-created_at")
                .first()
            )
            if not payment:
                raise ValidationError("No submitted payment record found for this order.")
            if decision == "verified":
                payment.status = "verified"
                payment.verified_at = timezone.now()
                payment.save(update_fields=["status", "verified_at"])
                order.payment_status = "paid"
                order.save(update_fields=["payment_status"])
                audit(
                    request.user,
                    "payment.verified",
                    order.pk,
                    provider=payment.provider,
                    reference=payment.reference,
                    amount=str(payment.amount),
                )
                emit(order.customer, "order.paid", reference=str(order.pk), total=str(payment.amount))
            else:
                payment.status = "rejected"
                payment.save(update_fields=["status"])
                order.payment_status = "unpaid"
                order.save(update_fields=["payment_status"])
                audit(
                    request.user,
                    "payment.rejected",
                    order.pk,
                    provider=payment.provider,
                    reference=payment.reference,
                )
        return Response(
            {
                "order_id": str(order.pk),
                "payment_status": order.payment_status,
                "trx_id": payment.reference,
                "status": payment.status,
            }
        )


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
