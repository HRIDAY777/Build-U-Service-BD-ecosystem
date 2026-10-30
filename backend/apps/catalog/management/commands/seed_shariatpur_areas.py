import json
from django.core.management.base import BaseCommand
from apps.catalog.models import Division, ServiceArea


SHARIATPUR_DATA = [
    # Upazila level entries
    {"name": "Shariatpur Sadar", "name_bn": "শরীয়তপুর সদর", "fee": 50},
    {"name": "Naria", "name_bn": "নড়িয়া", "fee": 60},
    {"name": "Zajira", "name_bn": "জাজিরা (পদ্মা সেতু সংলগ্ন)", "fee": 60},
    {"name": "Bhedarganj", "name_bn": "ভেদরগঞ্জ", "fee": 60},
    {"name": "Damudya", "name_bn": "ডামুড্যা", "fee": 60},
    {"name": "Gosairhat", "name_bn": "গোসাইরহাট", "fee": 60},
    {"name": "Shariatpur All Areas", "name_bn": "সমগ্র শরীয়তপুর জেলা", "fee": 60},

    # Shariatpur Sadar areas
    {"name": "Palong", "name_bn": "পালং (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Angaria", "name_bn": "আংগারিয়া (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Chikondi", "name_bn": "চিকন্দি (শরীয়তপুর)", "fee": 50},
    {"name": "Tulasar", "name_bn": "তুলাসার (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Rudrakar", "name_bn": "রুদ্রকর (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Binodpur", "name_bn": "বিনোদপুর (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Domshar", "name_bn": "ডোমসার (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Mahmudpur", "name_bn": "মাহমুদপুর (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Chandrapur", "name_bn": "চন্দ্রপুর (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Chitolia", "name_bn": "চিতলিয়া (শরীয়তপুর সদর)", "fee": 50},
    {"name": "Shulpara", "name_bn": "শৌলপাড়া (শরীয়তপুর সদর)", "fee": 50},

    # Naria areas
    {"name": "Vojeshwar", "name_bn": "ভোজেশ্বর (নড়িয়া)", "fee": 60},
    {"name": "Gharisar", "name_bn": "ঘড়িষার (নড়িয়া)", "fee": 60},
    {"name": "Kedarpur", "name_bn": "কেদারপুর (নড়িয়া)", "fee": 60},
    {"name": "Bijari", "name_bn": "বিঝারি (নড়িয়া)", "fee": 60},
    {"name": "Fategongpur", "name_bn": "ফতেজংপুর (নড়িয়া)", "fee": 60},
    {"name": "Dingamanik", "name_bn": "ডিংগামানিক (নড়িয়া)", "fee": 60},
    {"name": "Nowpara", "name_bn": "নওপাড়া (নড়িয়া)", "fee": 60},
    {"name": "Rajnagar", "name_bn": "রাজনগর (নড়িয়া)", "fee": 60},
    {"name": "Japsa", "name_bn": "জপসা (নড়িয়া)", "fee": 60},
    {"name": "Moktererchar", "name_bn": "মোক্তারেরচর (নড়িয়া)", "fee": 60},
    {"name": "Nashason", "name_bn": "নশাসন (নড়িয়া)", "fee": 60},
    {"name": "Charatra", "name_bn": "চরআত্রা (নড়িয়া)", "fee": 60},
    {"name": "Vumkhara", "name_bn": "ভূমখাড়া (নড়িয়া)", "fee": 60},

    # Zajira areas
    {"name": "Nawdoba (Padma Bridge)", "name_bn": "নাওডোবা (পদ্মা সেতু / জাজিরা)", "fee": 60},
    {"name": "Purba Nawdoba", "name_bn": "পূর্ব নাওডোবা (জাজিরা)", "fee": 60},
    {"name": "Zajira Sadar", "name_bn": "জাজিরা সদর", "fee": 60},
    {"name": "Bilaspur", "name_bn": "বিলাসপুর (জাজিরা)", "fee": 60},
    {"name": "Bknagar", "name_bn": "বি. কে. নগর (জাজিরা)", "fee": 60},
    {"name": "Kundarchar", "name_bn": "কুন্ডেরচর (জাজিরা)", "fee": 60},
    {"name": "Mulna", "name_bn": "মূলনা (জাজিরা)", "fee": 60},
    {"name": "Barokandi", "name_bn": "বড়কান্দি (জাজিরা)", "fee": 60},
    {"name": "Barogopalpur", "name_bn": "বড়গোপালপুর (জাজিরা)", "fee": 60},
    {"name": "Jaynagor", "name_bn": "জয়নগর (জাজিরা)", "fee": 60},
    {"name": "Palerchar", "name_bn": "পালেরচর (জাজিরা)", "fee": 60},
    {"name": "Shenerchar", "name_bn": "সেনেরচর (জাজিরা)", "fee": 60},

    # Bhedarganj areas
    {"name": "Sakhipur", "name_bn": "সখিপুর (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Mahisar", "name_bn": "মহিষার (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Ramvadrapur", "name_bn": "রামভদ্রপুর (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Arsinagar", "name_bn": "আরশিনগর (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Charvaga", "name_bn": "চরভাগা (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Charkumaria", "name_bn": "চরকুমারিয়া (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Charsensas", "name_bn": "চরসেনসাস (ভেদরগঞ্জ)", "fee": 60},
    {"name": "D.M Khali", "name_bn": "ডি.এম খালি (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Kachikata", "name_bn": "কাচিকাঁটা (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Narayanpur", "name_bn": "নারায়নপুর (ভেদরগঞ্জ)", "fee": 60},
    {"name": "North Tarabunia", "name_bn": "উত্তর তারাবুনিয়া (ভেদরগঞ্জ)", "fee": 60},
    {"name": "South Tarabunia", "name_bn": "দক্ষিন তারাবুনিয়া (ভেদরগঞ্জ)", "fee": 60},
    {"name": "Saygaon", "name_bn": "ছয়গাঁও (ভেদরগঞ্জ)", "fee": 60},

    # Damudya areas
    {"name": "Kaneshar", "name_bn": "কনেস্বর (ডামুড্যা)", "fee": 60},
    {"name": "Dankati", "name_bn": "ধানকাটি (ডামুড্যা)", "fee": 60},
    {"name": "Shidulkura", "name_bn": "শিধলকুড়া (ডামুড্যা)", "fee": 60},
    {"name": "Darulaman", "name_bn": "দারুল আমান (ডামুড্যা)", "fee": 60},
    {"name": "Purba Damudya", "name_bn": "পূর্ব ডামুড্যা", "fee": 60},
    {"name": "Damudya Islampur", "name_bn": "ইসলামপুর (ডামুড্যা)", "fee": 60},
    {"name": "Sidya", "name_bn": "সিড্যা (ডামুড্যা)", "fee": 60},

    # Gosairhat areas
    {"name": "Edilpur", "name_bn": "ইদিলপুর (গোসাইরহাট)", "fee": 60},
    {"name": "Nalmuri", "name_bn": "নলমুড়ি (গোসাইরহাট)", "fee": 60},
    {"name": "Goshairhat Sadar", "name_bn": "গোসাইরহাট সদর", "fee": 60},
    {"name": "Alaolpur", "name_bn": "আলাওলপুর (গোসাইরহাট)", "fee": 60},
    {"name": "Kuchaipatti", "name_bn": "কুচাইপট্টি (গোসাইরহাট)", "fee": 60},
    {"name": "Kodaldhar", "name_bn": "কোদালপুর (গোসাইরহাট)", "fee": 60},
    {"name": "Pipilashi", "name_bn": "পিপিলিশি (গোসাইরহাট)", "fee": 60},
    {"name": "Samantasar", "name_bn": "সামন্তসার (গোসাইরহাট)", "fee": 60},
]


class Command(BaseCommand):
    help = "Seeds all upazilas, unions, and municipal areas of Shariatpur district into ServiceArea."

    def handle(self, *args, **options):
        divisions = list(Division.objects.filter(active=True))
        if not divisions:
            self.stdout.write(self.style.WARNING("No active divisions found! Creating or fetching divisions..."))
            divisions = list(Division.objects.all())

        created_count = 0
        updated_count = 0

        for item in SHARIATPUR_DATA:
            area, created = ServiceArea.objects.update_or_create(
                name=item["name"],
                defaults={
                    "name_bn": item["name_bn"],
                    "district": "Shariatpur",
                    "delivery_fee": item["fee"],
                    "active": True,
                },
            )
            area.divisions.set(divisions)
            if created:
                created_count += 1
            else:
                updated_count += 1

        total_shariatpur = ServiceArea.objects.filter(district="Shariatpur", active=True).count()
        total_areas = ServiceArea.objects.filter(active=True).count()

        result = {
            "district": "Shariatpur",
            "shariatpur_created": created_count,
            "shariatpur_updated": updated_count,
            "total_shariatpur_active_areas": total_shariatpur,
            "total_all_active_areas": total_areas,
            "divisions_linked_count": len(divisions),
        }
        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))
