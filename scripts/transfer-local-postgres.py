"""Backup/export local SQLite, then import into an EMPTY local Docker database."""
import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["export", "import"])
parser.add_argument("--snapshot", type=Path)
args = parser.parse_args()
env = os.environ.copy()
env["DJANGO_DEBUG"] = "true"
env["PYTHONUTF8"] = "1"
if args.mode == "export":
    env.pop("DATABASE_URL", None)
    folder = root / "backend/artifacts" / datetime.now(timezone.utc).strftime("postgres-transfer-%Y%m%d-%H%M%S")
    folder.mkdir(parents=True)
    with sqlite3.connect(root / "backend/db.sqlite3") as source, sqlite3.connect(folder / "db.sqlite3") as backup:
        source.backup(backup)
    subprocess.run([sys.executable, str(root / "backend/manage.py"), "dumpdata", "--natural-foreign", "--exclude", "contenttypes", "--exclude", "auth.permission", "--output", str(folder / "data.json")], env=env, check=True)
    print(f"Backup and private fixture: {folder}")
else:
    if not args.snapshot:
        parser.error("--snapshot is required for import")
    config = dict(line.split("=", 1) for line in (root / ".env.docker.local").read_text().splitlines() if "=" in line and not line.startswith("#"))
    env["DATABASE_URL"] = "postgresql://{}:{}@127.0.0.1:{}/{}".format(quote(config["POSTGRES_USER"], safe=""), quote(config["POSTGRES_PASSWORD"], safe=""), config["POSTGRES_PORT"], quote(config["POSTGRES_DB"], safe=""))
    os.environ.update(env)
    sys.path.insert(0, str(root / "backend"))
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
    import django
    django.setup()
    from django.apps import apps
    from django.core.management import call_command
    from django.db import connection
    if connection.vendor != "postgresql":
        raise RuntimeError("Target must be PostgreSQL")
    fixture = args.snapshot / "data.json"
    records = json.loads(fixture.read_text(encoding="utf-8"))
    expected = {}
    for record in records:
        expected[record["model"]] = expected.get(record["model"], 0) + 1
    populated = [label for label in expected if apps.get_model(label).objects.exists()]
    if populated:
        raise RuntimeError("Import refused: target already contains application data")
    from django.db import transaction
    with transaction.atomic():
        call_command("loaddata", str(fixture), verbosity=0)
        for label, count in expected.items():
            if apps.get_model(label).objects.count() != count:
                raise RuntimeError(f"Row count mismatch: {label}")
    print(f"Verified {len(records)} records across {len(expected)} models on PostgreSQL")
