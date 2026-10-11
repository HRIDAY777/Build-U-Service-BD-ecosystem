from celery import shared_task
from .wishlist import check_wishlist_alerts
from .renewal_alerts import check_partner_renewal_alerts


@shared_task
def dispatch_partner_renewal_alerts():
    return check_partner_renewal_alerts()


@shared_task
def dispatch_wishlist_alerts():
    return check_wishlist_alerts()
