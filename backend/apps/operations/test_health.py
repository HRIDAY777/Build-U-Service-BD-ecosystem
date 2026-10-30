from unittest.mock import patch

from django.test import Client, TestCase, override_settings


class ReadinessTests(TestCase):
    @patch("config.celery.app.connection_for_read")
    @override_settings(SECURE_SSL_REDIRECT=True)
    def test_ready_when_database_and_broker_are_available(self, connection_for_read):
        response = Client().get("/ready/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "checks": {"database": "ok", "broker": "ok"}},
        )
        connection_for_read.assert_called_once_with(connect_timeout=2)
        connection_for_read.return_value.__enter__.return_value.ensure_connection.assert_called_once_with(
            max_retries=0
        )

    @patch("config.celery.app.connection_for_read")
    def test_unavailable_broker_returns_service_unavailable(self, connection_for_read):
        broker = connection_for_read.return_value.__enter__.return_value
        broker.ensure_connection.side_effect = OSError("broker unavailable")

        with self.assertLogs("config.urls", level="ERROR"):
            response = Client().get("/ready/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {"status": "unavailable", "checks": {"database": "ok", "broker": "unavailable"}},
        )
