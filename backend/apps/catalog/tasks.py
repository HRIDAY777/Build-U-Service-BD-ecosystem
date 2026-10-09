from celery import shared_task
from .wishlist import check_wishlist_alerts


@shared_task
def dispatch_wishlist_alerts():
    return check_wishlist_alerts()
