from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.conf import settings
from django.db import transaction
from apps.catalog.models import Category, Division, Organization, Offering, ServiceArea
from apps.content.models import Page, FAQ
from apps.automation.models import AutomationRule, KnowledgeDocument


class Command(BaseCommand):
    help = (
        "Create clearly labeled demonstration catalog data. No usable passwords or transactions are seeded."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo seeding is disabled outside DEBUG mode.")
        owner, created = get_user_model().objects.get_or_create(
            username="demo_catalog_owner",
            defaults={"email": "catalog@example.invalid", "first_name": "Demo catalog", "is_active": False},
        )
        if created:
            owner.set_unusable_password()
            owner.save()
        divisions = [
            (
                "food",
                "U Food",
                "ইউ ফুড",
                "goods",
                "A favourite meal, a little closer.",
                "পছন্দের খাবার, আপনার দরজায়।",
            ),
            (
                "pharmacy",
                "U Pharmacy",
                "ইউ ফার্মেসি",
                "goods",
                "Everyday essentials, with care.",
                "স্বাস্থ্য ও ব্যক্তিগত যত্নের প্রয়োজন।",
            ),
            ("shop", "U Shop", "ইউ শপ", "goods", "Good finds for everyday life.", "প্রতিদিনের কেনাকাটা আরও সহজ।"),
            (
                "electrician",
                "U Electrician",
                "ইউ ইলেকট্রিশিয়ান",
                "service",
                "A brighter, better-running home.",
                "বিদ্যুতের কাজে দক্ষ সহায়তা।",
            ),
            (
                "mechanic",
                "U Mechanic",
                "ইউ মেকানিক",
                "service",
                "Keep your day moving.",
                "মেরামত ও যত্নে আপনার পাশে।",
            ),
            (
                "services",
                "U Home Services",
                "ইউ হোম সার্ভিস",
                "service",
                "A helping hand around the home.",
                "ঘরের কাজে বিশ্বস্ত সহযোগী।",
            ),
            (
                "delivery",
                "U Delivery",
                "ইউ ডেলিভারি",
                "delivery",
                "From your door to theirs.",
                "আপনার পার্সেল পৌঁছে যাক যত্নে।",
            ),
        ]
        records = {}
        for slug, name, bn, kind, desc, desc_bn in divisions:
            records[slug], _ = Division.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "name_bn": bn,
                    "kind": kind,
                    "description": desc,
                    "description_bn": desc_bn,
                },
            )
        merchants = {}
        for slug, name in [
            ("food", "Dhanmondi Kitchen · Demo"),
            ("shop", "Everyday Dhaka · Demo"),
            ("pharmacy", "Care Corner · Demo"),
            ("electrician", "Bright Home Electric · Demo"),
            ("mechanic", "Dhaka Bike Care · Demo"),
            ("services", "Shundor Home Care · Demo"),
        ]:
            merchants[slug], _ = Organization.objects.get_or_create(
                name=name,
                defaults={
                    "division": records[slug],
                    "owner": owner,
                    "approved": True,
                    "area": "Dhanmondi",
                    "address": "ডেমো ঠিকানা: বাড়ি ১২, রোড ৭, ধানমন্ডি, ঢাকা (বাস্তব ব্যবসার ঠিকানা নয়)",
                    "opening_hours": "Demo catalog — not a live merchant",
                    "description": "Fictional business for local testing only.",
                },
            )
        products = [
            (
                "food",
                "kacchi-biryani",
                "Kacchi biryani",
                "কাচ্চি বিরিয়ানি",
                "320",
                "Slow-cooked rice, tender meat and fragrant spices. Demo menu item.",
                "সুগন্ধি চাল, মাংস ও মসলার স্বাদ। ডেমো মেনু।",
                False,
            ),
            (
                "electrician",
                "ceiling-fan-service",
                "Ceiling fan repair",
                "সিলিং ফ্যান মেরামত",
                "450",
                "Inspection and basic repair. Replacement parts quoted separately.",
                "ফ্যান পরীক্ষা ও সাধারণ মেরামত। যন্ত্রাংশের মূল্য আলাদা।",
                False,
            ),
            (
                "shop",
                "cotton-tote",
                "Everyday cotton tote",
                "কটন টোট ব্যাগ",
                "290",
                "A reusable cotton carryall for your daily essentials.",
                "প্রতিদিনের জিনিসপত্রের জন্য পুনর্ব্যবহারযোগ্য কটন ব্যাগ।",
                False,
            ),
            (
                "services",
                "home-cleaning",
                "Home cleaning visit",
                "বাসা পরিষ্কার সেবা",
                "1200",
                "Two-hour basic cleaning visit. Scope confirmed before work.",
                "দুই ঘণ্টার সাধারণ পরিষ্কার সেবা। কাজ শুরুর আগে পরিধি নিশ্চিত করা হবে।",
                False,
            ),
            (
                "food",
                "chicken-khichuri",
                "Chicken bhuna khichuri",
                "চিকেন ভুনা খিচুড়ি",
                "240",
                "Comforting rice and lentils with chicken. Demo menu item.",
                "চাল, ডাল ও মুরগির পরিচিত স্বাদ। ডেমো মেনু।",
                False,
            ),
            (
                "food",
                "vegetable-lunch",
                "Vegetable lunch box",
                "ভেজিটেবল লাঞ্চ বক্স",
                "180",
                "Rice, seasonal vegetables and dal. Demo menu item.",
                "ভাত, মৌসুমি সবজি ও ডাল। ডেমো মেনু।",
                False,
            ),
            (
                "pharmacy",
                "first-aid-pouch",
                "First-aid essentials pouch",
                "ফার্স্ট এইড পাউচ",
                "390",
                "Basic bandages and dressings. Non-medicinal demo product.",
                "ব্যান্ডেজ ও ড্রেসিংয়ের সাধারণ কিট। ডেমো পণ্য।",
                False,
            ),
            (
                "pharmacy",
                "prescription-workflow-demo",
                "Prescription review test item · Demo",
                "প্রেসক্রিপশন যাচাইয়ের ডেমো পণ্য",
                "100",
                "Fictional non-dispensable item for testing the approval workflow. Not medicine.",
                "অনুমোদন প্রক্রিয়া পরীক্ষার কাল্পনিক পণ্য। এটি ওষুধ নয়।",
                True,
            ),
            (
                "shop",
                "steel-water-bottle",
                "Steel water bottle",
                "স্টিলের পানির বোতল",
                "650",
                "750 ml reusable bottle for the workday.",
                "কাজের দিনের জন্য ৭৫০ মিলি পানির বোতল।",
                False,
            ),
            (
                "electrician",
                "socket-repair",
                "Switch & socket repair",
                "সুইচ ও সকেট মেরামত",
                "350",
                "One-point inspection and repair. Parts are separate.",
                "একটি পয়েন্ট পরীক্ষা ও মেরামত। যন্ত্রাংশ আলাদা।",
                False,
            ),
            (
                "mechanic",
                "motorcycle-inspection",
                "Motorcycle inspection",
                "মোটরসাইকেল পরীক্ষা",
                "600",
                "Basic inspection and written findings. Repairs quoted separately.",
                "সাধারণ পরীক্ষা ও সমস্যার বিবরণ। মেরামতের মূল্য আলাদা।",
                False,
            ),
            (
                "services",
                "ac-cleaning",
                "AC cleaning service",
                "এসি পরিষ্কার সেবা",
                "900",
                "Indoor unit cleaning and basic checks. No refrigerant included.",
                "ইনডোর ইউনিট পরিষ্কার ও সাধারণ পরীক্ষা। গ্যাসের মূল্য অন্তর্ভুক্ত নয়।",
                False,
            ),
        ]
        category_names = {
            "food": ("Meals", "খাবার"), "shop": ("Everyday essentials", "নিত্যপ্রয়োজনীয়"),
            "pharmacy": ("Health essentials", "স্বাস্থ্যসামগ্রী"),
            "electrician": ("Electrical repairs", "বৈদ্যুতিক মেরামত"),
            "mechanic": ("Vehicle care", "যানবাহনের যত্ন"),
            "services": ("Home care", "ঘরের যত্ন"),
        }
        for slug, key, name, bn, price, desc, desc_bn, rx in products:
            category_name, category_bn = category_names[slug]
            category, _ = Category.objects.get_or_create(division=records[slug], name=category_name, defaults={"name_bn": category_bn})
            offering, _ = Offering.objects.get_or_create(
                slug=key,
                defaults={
                    "division": records[slug],
                    "category": category,
                    "organization": merchants.get(slug),
                    "name": name,
                    "name_bn": bn,
                    "description": desc,
                    "description_bn": desc_bn,
                    "sku": f"DEMO-{key.upper()}",
                    "price": price,
                    "stock": 50,
                    "prescription_required": rx,
                    "duration_minutes": 120 if key == "home-cleaning" else 60,
                },
            )
            Offering.objects.filter(pk=offering.pk, category__isnull=True, sku=f"DEMO-{key.upper()}").update(category=category)
        for name, bn, fee in [
            ("Dhanmondi", "ধানমন্ডি", 60),
            ("Mohammadpur", "মোহাম্মদপুর", 70),
            ("Mirpur", "মিরপুর", 80),
        ]:
            area, created = ServiceArea.objects.get_or_create(
                name=name, defaults={"name_bn": bn, "delivery_fee": fee}
            )
            if created:
                area.divisions.set(records.values())
        pages = [
            (
                "about",
                "A little help. A better everyday.",
                "আপনার প্রতিদিনের সঙ্গী",
                "U Service BD connects food, shopping, home services and delivery in one account.\n\nThis local demonstration shows how the platform works. Businesses, offerings and coverage are sample data; no real merchant or delivery service is represented.\n\nOur approach is simple: clear pricing, accountable service and one place to manage your everyday needs.",
                "U Service BD খাবার, কেনাকাটা, ঘরের সেবা ও ডেলিভারিকে একই অ্যাকাউন্টে যুক্ত করে।\n\nএই স্থানীয় ডেমোতে ব্যবসা, পণ্য ও সেবার এলাকা উদাহরণ হিসেবে দেওয়া হয়েছে।\n\nআমাদের লক্ষ্য: স্বচ্ছ মূল্য, দায়িত্বশীল সেবা ও প্রতিদিনের প্রয়োজনের সহজ সমাধান।",
            ),
            (
                "privacy",
                "Privacy information — demonstration",
                "গোপনীয়তা তথ্য — ডেমো",
                "This is a development environment. Avoid submitting real medical or sensitive information. Accounts, addresses, orders and support messages are stored in the local application database. Prescription uploads are private and require customer or authorized reviewer access. Marketing consent is optional.\n\nUse your account’s support form to request deletion or export. Before public launch, the business must approve retention periods, processor contracts and a jurisdiction-specific privacy policy. This page does not claim legal compliance.",
                "এটি উন্নয়ন পরিবেশ। প্রকৃত চিকিৎসা বা সংবেদনশীল তথ্য জমা দেবেন না। অ্যাকাউন্ট, ঠিকানা, অর্ডার ও সহায়তার বার্তা স্থানীয় ডেটাবেসে সংরক্ষিত হয়। বিপণনের সম্মতি ঐচ্ছিক।\n\nজনসাধারণের জন্য চালুর আগে ব্যবসার অনুমোদিত গোপনীয়তা নীতি প্রয়োজন।",
            ),
            (
                "terms",
                "Terms — demonstration environment",
                "ব্যবহারের শর্ত — ডেমো",
                "This environment is for evaluating software workflows. Demo orders and service requests are not commitments to deliver real goods or services. Cash-on-delivery records do not represent collected money until an authorized finance user reconciles a deposit reference.\n\nBusiness terms, refund eligibility, tax rules, pharmacy procedures and service guarantees require owner and professional review before commercial launch.",
                "এই পরিবেশ সফটওয়্যারের কার্যপ্রবাহ যাচাইয়ের জন্য। ডেমো অর্ডার প্রকৃত পণ্য বা সেবা প্রদানের প্রতিশ্রুতি নয়।\n\nবাণিজ্যিকভাবে চালুর আগে ব্যবসার শর্ত, ফেরত নীতি, কর ও ফার্মেসির নিয়ম অনুমোদন করতে হবে।",
            ),
        ]
        for slug, title, title_bn, body, body_bn in pages:
            Page.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "title_bn": title_bn,
                    "body": body,
                    "body_bn": body_bn,
                    "description": title,
                    "published": True,
                },
            )
        faqs = [
            (
                "Do I need a different account for each service?",
                "প্রতিটি সেবার জন্য কি আলাদা অ্যাকাউন্ট লাগবে?",
                "No. One account keeps your orders, bookings and delivery requests together.",
                "না। একটি অ্যাকাউন্টেই অর্ডার, বুকিং ও ডেলিভারি অনুরোধ দেখা যায়।",
            ),
            (
                "Where are services available?",
                "কোন এলাকায় সেবা পাওয়া যায়?",
                "Select your area during checkout or booking. The server checks whether that division serves the area. Demo coverage is not live service availability.",
                "অর্ডার বা বুকিংয়ের সময় এলাকা বেছে নিন। সংশ্লিষ্ট বিভাগ সেখানে সেবা দেয় কি না যাচাই করা হয়। ডেমো কভারেজ প্রকৃত সেবা নয়।",
            ),
            (
                "How do prescription orders work?",
                "প্রেসক্রিপশন প্রয়োজন হলে কী করব?",
                "Upload your prescription from the order in your account. An authorized reviewer must approve it before processing. AI cannot approve prescriptions.",
                "অ্যাকাউন্টে অর্ডারের সাথে প্রেসক্রিপশন আপলোড করুন। অনুমোদিত পর্যালোচকের অনুমোদনের পর প্রক্রিয়া শুরু হবে। AI অনুমোদন করতে পারে না।",
            ),
            (
                "How can I follow my order?",
                "অর্ডারের আপডেট কোথায় দেখব?",
                "Open your account and select status history. Updates come from actual staff actions, not simulated tracking.",
                "অ্যাকাউন্টে অর্ডারের স্ট্যাটাস হিস্ট্রি দেখুন। কর্মীদের কার্যক্রম অনুযায়ী আপডেট দেখানো হয়।",
            ),
        ]
        for i, (q, qb, a, ab) in enumerate(faqs):
            FAQ.objects.get_or_create(
                question=q, defaults={"question_bn": qb, "answer": a, "answer_bn": ab, "position": i}
            )
        for topic, title in [
            ("order.created", "Order received"),
            ("booking.created", "Booking received"),
            ("delivery.created", "Delivery request received"),
            ("order.delivered", "Order delivered"),
            ("order.paid", "Payment reconciled"),
            ("prescription.approved", "Prescription approved"),
            ("prescription.rejected", "Prescription review update"),
        ]:
            AutomationRule.objects.get_or_create(
                name=title,
                defaults={
                    "trigger": topic,
                    "action": "notify",
                    "template": f"{title}. Visit your account for details.",
                },
            )
        AutomationRule.objects.get_or_create(
            name="Record new customer activity",
            defaults={
                "trigger": "customer.registered",
                "action": "crm",
                "template": "Customer registered through the website.",
            },
        )
        KnowledgeDocument.objects.get_or_create(
            title="Account and order help",
            defaults={
                "text": "One U Service account works across divisions. View your orders in Account > Orders. You can cancel before acceptance. Prescription orders require an uploaded prescription and authorized human review. The assistant cannot diagnose or authorize medicine. Payments in the demo are cash on delivery. ডেলিভারি ও বুকিংয়ের আপডেট অ্যাকাউন্টে দেখা যায়।",
                "public": True,
                "approved": True,
            },
        )
        roles = {
            "Operations Manager": [
                "view_order",
                "change_order",
                "view_booking",
                "change_booking",
                "view_deliveryrequest",
                "change_deliveryrequest",
            ],
            "Finance": ["view_order", "view_payment", "add_payment", "view_refund", "view_deliveryrequest"],
            "Pharmacist": ["view_order", "view_prescription", "change_prescription"],
            "Customer Support": ["view_supportticket", "change_supportticket", "view_lead", "change_lead"],
            "Content Manager": ["view_page", "add_page", "change_page", "view_faq", "add_faq", "change_faq"],
            "Provider": [],
            "Rider": [],
            "Partner": [],
        }
        for role, codenames in roles.items():
            group, _ = Group.objects.get_or_create(name=role)
            group.permissions.set(Permission.objects.filter(codename__in=codenames))
        self.stdout.write(
            self.style.SUCCESS(
                "Demo catalog seeded. No login passwords, orders, payments or reviews were fabricated."
            )
        )
