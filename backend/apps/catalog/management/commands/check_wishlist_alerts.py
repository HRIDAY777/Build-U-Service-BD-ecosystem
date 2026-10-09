from django.core.management.base import BaseCommand
from apps.catalog.wishlist import check_wishlist_alerts


class Command(BaseCommand):
    help = "Check price/restock changes and create opted-in wishlist notifications."

    def handle(self, *args, **options):
        self.stdout.write(f"Created {check_wishlist_alerts()} wishlist notifications.")
