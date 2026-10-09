from django.db import transaction
from django.db.models import Q
from apps.engagement.models import Notification
from .models import WishlistItem


def offering_snapshot(offering):
    variants = list(offering.variants.filter(active=True))
    return offering.current_price, sum(v.stock for v in variants) if variants else offering.stock


def check_wishlist_alerts(user=None):
    """Commit each notification and observed state together; repeated scans do not repeat it."""
    items = WishlistItem.objects.filter(user__is_active=True)
    if user is not None:
        items = items.filter(user=user)
    ids = items.filter(Q(price_alert=True) | Q(restock_alert=True)).values_list("pk", flat=True)
    count = 0
    for pk in list(ids):
        with transaction.atomic():
            item = WishlistItem.objects.select_for_update().filter(pk=pk).first()
            if item is None or not (item.price_alert or item.restock_alert):
                continue
            offering = item.offering
            if (
                not offering.active
                or not offering.division.active
                or (offering.organization_id and not offering.organization.approved)
            ):
                continue
            price, stock = offering_snapshot(offering)
            if item.price_alert and item.observed_price is not None and price < item.observed_price:
                Notification.objects.create(
                    user=item.user,
                    title="Wishlist: দাম কমেছে / Price dropped",
                    body=f"{offering.name_bn or offering.name}: ৳{item.observed_price} → ৳{price}. /catalog/{offering.pk}",
                )
                count += 1
            if (
                item.restock_alert
                and item.observed_stock == 0
                and stock > 0
                and offering.division.kind == "goods"
            ):
                Notification.objects.create(
                    user=item.user,
                    title="Wishlist: স্টক এসেছে / Back in stock",
                    body=f"{offering.name_bn or offering.name} এখন পাওয়া যাচ্ছে। /catalog/{offering.pk}",
                )
                count += 1
            item.observed_price, item.observed_stock = price, stock
            item.save(update_fields=["observed_price", "observed_stock"])
    return count
