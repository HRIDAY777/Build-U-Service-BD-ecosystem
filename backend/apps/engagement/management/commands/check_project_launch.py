"""Read-only launch report. Never contacts providers or displays credentials."""

import json
import os
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.migrations.executor import MigrationExecutor
from django.db import connection


class Command(BaseCommand):
    help = "Report project launch prerequisites without exposing secrets or sending payments."

    def handle(self, *args, **options):
        required = ["SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD", "PAYMENT_PUBLIC_URL"]
        callback = urlparse(os.getenv("PAYMENT_PUBLIC_URL", ""))
        executor = MigrationExecutor(connection)
        pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
        report = {
            "live_ready": False,
            "environment": "local" if settings.DEBUG else "production",
            "pending_migrations": len(pending),
            "order_gateway": {
                "missing_settings": [key for key in required if not os.getenv(key)],
                "sandbox": os.getenv("SSLCOMMERZ_SANDBOX", "true").lower() == "true",
                "https_callback": callback.scheme == "https" and bool(callback.hostname),
                "merchant_approval": "requires provider confirmation",
            },
            "project_payments": "not integrated; order gateway settings do not enable project payments",
            "payouts": "manual records only; provider and integration required",
            "signatures": "authenticated typed-name consent; certified provider not integrated",
            "private_documents": "authenticated downloads; production private storage and scanning must be verified",
            "manual_confirmation_required": [
                "business and permitted transaction scope",
                "reviewed agreements",
                "private storage and malware scanning",
                "backup restore and operational permissions",
                "sandbox acceptance and limited live reconciliation",
            ],
        }
        self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2))
