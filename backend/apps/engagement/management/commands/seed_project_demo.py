from datetime import date
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth.models import Group, Permission
from apps.engagement.project_models import ManagedProject, ProjectUpdate


class Command(BaseCommand):
    help = "Add clearly marked fictional project gallery examples in DEBUG only."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        if not settings.DEBUG:
            raise CommandError("Demo projects are disabled outside DEBUG.")
        for name, codes in {
            "Operations Manager": ["view_projectapplication", "change_projectapplication", "view_managedproject", "view_projectentry"],
            "Finance": ["view_projectapplication", "view_managedproject", "view_projectentry", "add_projectentry"],
            "Content Manager": ["view_managedproject", "add_managedproject", "change_managedproject", "view_projectupdate", "add_projectupdate", "change_projectupdate"],
        }.items():
            group, _ = Group.objects.get_or_create(name=name)
            group.permissions.add(*Permission.objects.filter(content_type__app_label="engagement", codename__in=codes))
        for category, title, bn, area, progress in [
            ("solar", "DEMO — Rooftop solar planning", "ডেমো — ছাদের সোলার পরিকল্পনা", "Uttara, Dhaka", 20),
            ("electrical", "DEMO — Home wiring upgrade", "ডেমো — বাসার ওয়্যারিং উন্নয়ন", "Dhanmondi, Dhaka", 55),
            ("construction", "DEMO — Small building planning", "ডেমো — ছোট ভবনের পরিকল্পনা", "Savar, Dhaka", 10),
            ("finishing", "DEMO — Interior finishing", "ডেমো — ইন্টেরিয়র ফিনিশিং", "Keraniganj, Dhaka", 80),
        ]:
            project, _ = ManagedProject.objects.get_or_create(title=title, defaults={"title_bn": bn, "category": category, "area": area, "description": "Fictional example to test the project gallery and updates; not completed client work.", "description_bn": "প্রজেক্ট গ্যালারি ও আপডেট পরীক্ষা করার কাল্পনিক নমুনা; আসল গ্রাহকের কাজ নয়।", "published": True, "progress": progress})
            ProjectUpdate.objects.get_or_create(project=project, title="DEMO milestone", defaults={"title_bn": "ডেমো কাজের ধাপ", "description": "Sample site planning update.", "description_bn": "সাইট পরিকল্পনার নমুনা আপডেট।", "date": date.today(), "public": True})
        self.stdout.write("Demo project gallery is ready; reruns preserve existing edits.")
