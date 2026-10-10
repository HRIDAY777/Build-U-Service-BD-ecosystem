import json
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings


class ProjectLaunchReportTests(TestCase):
    @override_settings(DEBUG=True)
    @patch.dict("os.environ", {}, clear=True)
    def test_missing_configuration_is_reported(self):
        output = StringIO()
        call_command("check_project_launch", stdout=output)
        report = json.loads(output.getvalue())
        self.assertFalse(report["live_ready"])
        self.assertEqual(report["environment"], "local")
        self.assertEqual(report["pending_migrations"], 0)
        self.assertEqual(len(report["order_gateway"]["missing_settings"]), 3)
        self.assertFalse(report["order_gateway"]["https_callback"])

    @patch.dict("os.environ", {"SSLCOMMERZ_STORE_ID": "private-id-test", "SSLCOMMERZ_STORE_PASSWORD": "private-password-test", "PAYMENT_PUBLIC_URL": "https://example.invalid", "SSLCOMMERZ_SANDBOX": "false"})
    def test_credentials_never_leak_or_imply_project_readiness(self):
        output = StringIO()
        call_command("check_project_launch", stdout=output)
        rendered = output.getvalue()
        report = json.loads(rendered)
        self.assertNotIn("private-id-test", rendered)
        self.assertNotIn("private-password-test", rendered)
        self.assertFalse(report["live_ready"])
        self.assertEqual(report["order_gateway"]["missing_settings"], [])
        self.assertTrue(report["order_gateway"]["https_callback"])
        self.assertIn("not integrated", report["project_payments"])
