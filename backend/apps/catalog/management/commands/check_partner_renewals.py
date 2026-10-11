from django.core.management.base import BaseCommand
from apps.catalog.renewal_alerts import check_partner_renewal_alerts


class Command(BaseCommand):
    help = "Create deduplicated private partner document renewal reminders."

    def handle(self, *args, **options):
        self.stdout.write(f"Created {check_partner_renewal_alerts()} partner renewal reminders.")
