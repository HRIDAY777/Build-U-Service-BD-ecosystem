"""Additional local catalog examples and Dhaka district coverage."""
import json
from decimal import Decimal
from pathlib import Path
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.catalog.models import Division, Category, Organization, Offering, ServiceArea, ProductVariant, FoodOptionGroup, FoodOption

# Indicative demo prices; no real merchant, clinical claim or fulfillment promise.
CATALOG = {
 "food": [
 ("Chicken biryani","চিকেন বিরিয়ানি",220,"Rice meals","ভাতের খাবার"),
 ("Beef tehari","বিফ তেহারি",260,"Rice meals","ভাতের খাবার"),
 ("Vegetable khichuri","সবজি খিচুড়ি",140,"Rice meals","ভাতের খাবার"),
 ("Chicken roast meal","চিকেন রোস্ট মিল",300,"Rice meals","ভাতের খাবার"),
 ("Fish curry meal","মাছের তরকারি মিল",230,"Rice meals","ভাতের খাবার"),
 ("Beef burger","বিফ বার্গার",250,"Snacks","নাস্তা"),
 ("Chicken sandwich","চিকেন স্যান্ডউইচ",160,"Snacks","নাস্তা"),
 ("Vegetable pizza","সবজি পিজ্জা",420,"Snacks","নাস্তা"),
 ("Chicken shawarma","চিকেন শাওয়ারমা",190,"Snacks","নাস্তা"),
 ("Fried rice","ফ্রাইড রাইস",180,"Rice meals","ভাতের খাবার"),
 ("Family rice platter","ফ্যামিলি রাইস প্ল্যাটার",1100,"Family meals","পারিবারিক খাবার"),
 ("Breakfast paratha set","পরোটা নাস্তার সেট",100,"Breakfast","সকালের নাস্তা"),
 ("Fresh lemonade","লেবুর শরবত",80,"Drinks","পানীয়"),
 ("Sweet yoghurt","মিষ্টি দই",120,"Desserts","মিষ্টান্ন")],
 "shop": [
 ("Cotton T-shirt","কটন টি-শার্ট",450,"Clothing","পোশাক"),
 ("Polo shirt","পোলো শার্ট",750,"Clothing","পোশাক"),
 ("Cotton panjabi","কটন পাঞ্জাবি",1400,"Clothing","পোশাক"),
 ("Cotton kurti","কটন কুর্তি",950,"Clothing","পোশাক"),
 ("Canvas backpack","ক্যানভাস ব্যাকপ্যাক",1200,"Bags","ব্যাগ"),
 ("Lunch box","লাঞ্চ বক্স",350,"Kitchen","রান্নাঘর"),
 ("Ceramic mug","সিরামিক মগ",250,"Kitchen","রান্নাঘর"),
 ("Steel flask","স্টিল ফ্লাস্ক",650,"Kitchen","রান্নাঘর"),
 ("Notebook set","নোটবুক সেট",180,"Stationery","স্টেশনারি"),
 ("Pen set","কলম সেট",120,"Stationery","স্টেশনারি"),
 ("Desk organiser","ডেস্ক অর্গানাইজার",320,"Stationery","স্টেশনারি"),
 ("LED desk lamp","এলইডি ডেস্ক ল্যাম্প",850,"Home essentials","ঘরের প্রয়োজন"),
 ("Bedsheet set","বিছানার চাদর সেট",1100,"Home essentials","ঘরের প্রয়োজন"),
 ("Bath towel","গোসলের তোয়ালে",480,"Home essentials","ঘরের প্রয়োজন"),
 ("Umbrella","ছাতা",380,"Accessories","অনুষঙ্গ"),
 ("Reusable shopping bag","পুনর্ব্যবহারযোগ্য শপিং ব্যাগ",150,"Bags","ব্যাগ"),
 ("Phone stand","ফোন স্ট্যান্ড",220,"Accessories","অনুষঙ্গ"),
 ("USB cable","ইউএসবি কেবল",280,"Accessories","অনুষঙ্গ"),
 ("Storage basket","স্টোরেজ ঝুড়ি",450,"Home essentials","ঘরের প্রয়োজন"),
 ("Kitchen apron","রান্নাঘরের অ্যাপ্রন",300,"Kitchen","রান্নাঘর")],
 "pharmacy": [
 ("First aid box","ফার্স্ট এইড বক্স",650,"Care essentials","যত্নের প্রয়োজন"),
 ("Digital thermometer","ডিজিটাল থার্মোমিটার",350,"Care essentials","যত্নের প্রয়োজন"),
 ("Disposable mask pack","ডিসপোজেবল মাস্ক প্যাক",150,"Care essentials","যত্নের প্রয়োজন"),
 ("Cotton roll","কটন রোল",90,"Care essentials","যত্নের প্রয়োজন"),
 ("Bandage pack","ব্যান্ডেজ প্যাক",100,"Care essentials","যত্নের প্রয়োজন"),
 ("Handwash","হ্যান্ডওয়াশ",180,"Personal care","ব্যক্তিগত যত্ন"),
 ("Hand sanitiser","হ্যান্ড স্যানিটাইজার",120,"Personal care","ব্যক্তিগত যত্ন"),
 ("Toothbrush set","টুথব্রাশ সেট",160,"Personal care","ব্যক্তিগত যত্ন"),
 ("Hot water bag","গরম পানির ব্যাগ",300,"Care essentials","যত্নের প্রয়োজন"),
 ("Reusable ice pack","পুনর্ব্যবহারযোগ্য আইস প্যাক",220,"Care essentials","যত্নের প্রয়োজন")],
 "services": [
 ("Kitchen deep cleaning","রান্নাঘর গভীর পরিষ্কার",1800,"Cleaning","পরিষ্কার"),
 ("Bathroom cleaning","বাথরুম পরিষ্কার",900,"Cleaning","পরিষ্কার"),
 ("Sofa cleaning","সোফা পরিষ্কার",1500,"Cleaning","পরিষ্কার"),
 ("Carpet cleaning","কার্পেট পরিষ্কার",1200,"Cleaning","পরিষ্কার"),
 ("Move-in cleaning","বাসায় ওঠার আগে পরিষ্কার",3500,"Cleaning","পরিষ্কার"),
 ("Window cleaning","জানালা পরিষ্কার",800,"Cleaning","পরিষ্কার"),
 ("Plumbing inspection","প্লাম্বিং পরীক্ষা",500,"Home maintenance","বাসার রক্ষণাবেক্ষণ"),
 ("Tap replacement visit","কল পরিবর্তনের ভিজিট",450,"Home maintenance","বাসার রক্ষণাবেক্ষণ"),
 ("Door lock fitting","দরজার তালা লাগানো",600,"Home maintenance","বাসার রক্ষণাবেক্ষণ"),
 ("Furniture assembly","ফার্নিচার জোড়া লাগানো",1000,"Home maintenance","বাসার রক্ষণাবেক্ষণ"),
 ("Water tank cleaning","পানির ট্যাংক পরিষ্কার",2000,"Cleaning","পরিষ্কার"),
 ("Curtain installation","পর্দা লাগানো",700,"Home maintenance","বাসার রক্ষণাবেক্ষণ")],
 "electrician": [
 ("Switch installation","সুইচ লাগানো",350,"Electrical work","ইলেকট্রিক কাজ"),
 ("Socket repair","সকেট মেরামত",400,"Electrical work","ইলেকট্রিক কাজ"),
 ("Light fitting","লাইট লাগানো",300,"Electrical work","ইলেকট্রিক কাজ"),
 ("Wiring inspection","ওয়্যারিং পরীক্ষা",700,"Electrical work","ইলেকট্রিক কাজ"),
 ("Circuit breaker inspection","সার্কিট ব্রেকার পরীক্ষা",650,"Electrical work","ইলেকট্রিক কাজ"),
 ("Exhaust fan installation","এক্সহস্ট ফ্যান লাগানো",550,"Electrical work","ইলেকট্রিক কাজ"),
 ("Ceiling light installation","সিলিং লাইট লাগানো",500,"Electrical work","ইলেকট্রিক কাজ"),
 ("Doorbell installation","কলিং বেল লাগানো",450,"Electrical work","ইলেকট্রিক কাজ")],
 "mechanic": [
 ("Bicycle tune-up","সাইকেল টিউন-আপ",450,"Bike care","বাইক ও সাইকেল যত্ন"),
 ("Bicycle brake adjustment","সাইকেলের ব্রেক ঠিক করা",250,"Bike care","বাইক ও সাইকেল যত্ন"),
 ("Motorbike inspection","মোটরবাইক পরীক্ষা",600,"Bike care","বাইক ও সাইকেল যত্ন"),
 ("Chain servicing","চেইন সার্ভিসিং",350,"Bike care","বাইক ও সাইকেল যত্ন"),
 ("Tyre inspection","টায়ার পরীক্ষা",250,"Bike care","বাইক ও সাইকেল যত্ন"),
 ("Battery inspection","ব্যাটারি পরীক্ষা",300,"Vehicle care","যানবাহন যত্ন"),
 ("Scooter inspection","স্কুটার পরীক্ষা",500,"Vehicle care","যানবাহন যত্ন"),
 ("Basic vehicle check","গাড়ির সাধারণ পরীক্ষা",800,"Vehicle care","যানবাহন যত্ন")],
}
PHOTOS={slug:f"/images/photos/{slug}.jpg" for slug in CATALOG}


class Command(BaseCommand):
    help = "Add local demo catalog variety and sample Dhaka city/district service coverage."

    def add_arguments(self, parser):
        parser.add_argument("--owner", default="demo_catalog_owner")

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Extended demo data is disabled outside DEBUG mode.")
        owner = get_user_model().objects.filter(username=options["owner"]).first()
        if not owner:
            raise CommandError("Owner not found; seed the base demo or specify an existing demo owner.")
        divisions={d.slug:d for d in Division.objects.filter(active=True)}
        if set(CATALOG)-divisions.keys():
            raise CommandError("Seed the base divisions first.")
        counts={"offerings":0,"organizations":0,"categories":0,"areas":0,"variants":0,"food_groups":0,"food_options":0}
        for slug, rows in CATALOG.items():
            for branch, area in enumerate(["Dhanmondi","Uttara"],1):
                org, created=Organization.objects.get_or_create(name=f"DEMO Plus {slug.title()} {area}", division=divisions[slug], defaults={"owner":owner,"approved":True,"area":area,"address":f"Demo address: Road {branch}, {area}, Dhaka (fictional)","description":"Fictional business for local testing only."})
                counts["organizations"]+=created
                for index,(name,bn,price,category_name,category_bn) in enumerate(rows,1):
                    category,created=Category.objects.get_or_create(division=divisions[slug],name=category_name,defaults={"name_bn":category_bn})
                    counts["categories"]+=created
                    key=f"extended-{slug}-{branch}-{index}"
                    service=divisions[slug].kind=="service"
                    item,created=Offering.objects.get_or_create(sku=f"DEMO-{key.upper()}",defaults={"slug":key,"division":divisions[slug],"organization":org,"category":category,"name":name,"name_bn":bn,"price":price,"sale_price":Decimal(price)*Decimal("0.95") if index%4==0 and not service else None,"stock":0 if index%13==0 else 15+index,"duration_minutes":120 if slug=="services" and index<7 else 60,"service_weekly_hours":{str(day):[{"open":"09:00","close":"19:00"}] for day in range(7)} if service else {},"description":"Demo listing with illustrative imagery. Scope and any parts are confirmed before service; prices are sample values.","description_bn":"ডেমো তালিকা ও দৃষ্টান্তমূলক ছবি। সেবার পরিধি ও যন্ত্রাংশের মূল্য কাজের আগে নিশ্চিত করা হবে। মূল্য নমুনা হিসেবে দেওয়া।","image":PHOTOS[slug]})
                    counts["offerings"]+=created
                    if slug=="food" and index<=11:
                        for title,title_bn,minimum,maximum,choices in [("Portion","পরিমাণ",1,1,[("Regular","সাধারণ",0),("Large","বড়",80)]),("Extras","অতিরিক্ত",0,2,[("Salad","সালাদ",30),("Drink","পানীয়",50),("Dessert","মিষ্টান্ন",60)])]:
                            group,created=FoodOptionGroup.objects.get_or_create(offering=item,name=title,defaults={"name_bn":title_bn,"min_choices":minimum,"max_choices":maximum})
                            counts["food_groups"]+=created
                            for en,bangla,extra in choices:
                                _,created=FoodOption.objects.get_or_create(group=group,name=en,defaults={"name_bn":bangla,"price":extra})
                                counts["food_options"]+=created
                    if slug=="shop" and index<=4:
                        for size,color in [("M","Black"),("L","Black"),("M","Blue"),("L","Blue")]:
                            _,created=ProductVariant.objects.get_or_create(sku=f"DEMO-{key.upper()}-{size}-{color.upper()}",defaults={"offering":item,"label":f"{size} / {color}","attributes":{"size":size,"color":color},"price":price,"stock":10})
                            counts["variants"]+=created
        data=json.loads((Path(__file__).resolve().parents[2]/"static/catalog/locations.json").read_text(encoding="utf-8"))
        dhaka=next(d for v in data["divisions"] for d in v["districts"] if d["name"]=="Dhaka")
        areas={}
        for upazila in dhaka["upazilas"]:
            fee=120 if upazila["name"] in {"Savar","Dhamrai","Keraniganj","Nawabganj","Dohar"} else 80
            areas.setdefault(upazila["name"],(upazila["bnName"],fee))
            for place in upazila.get("areas",[]):
                areas.setdefault(place["name"],(place["bnName"],fee))
        for name,bn in [("Banani","বনানী"),("Bashundhara R/A","বসুন্ধরা আবাসিক এলাকা"),("Baridhara","বারিধারা"),("Banasree","বনশ্রী"),("Bashabo","বাসাবো"),("Shantinagar","শান্তিনগর"),("Malibagh","মালিবাগ"),("Moghbazar","মগবাজার"),("Eskaton","ইস্কাটন"),("Farmgate","ফার্মগেট"),("Karwan Bazar","কারওয়ান বাজার"),("Kallyanpur","কল্যাণপুর"),("Shyamoli","শ্যামলী"),("Gabtoli","গাবতলী"),("Agargaon","আগারগাঁও"),("Niketan","নিকেতন"),("Nikunj","নিকুঞ্জ"),("Aftabnagar","আফতাবনগর")]:
            areas.setdefault(name,(bn,80))
        for sector in range(1,19):
            bangla=str(sector).translate(str.maketrans("0123456789","০১২৩৪৫৬৭৮৯"))
            areas[f"Uttara Sector {sector}"]=(f"উত্তরা সেক্টর {bangla}",90)
        for number in [1,2,6,7,10,11,12,13,14]:
            bangla=str(number).translate(str.maketrans("0123456789","০১২৩৪৫৬৭৮৯"))
            areas[f"Mirpur {number}"]=(f"মিরপুর {bangla}",80)
        for name,(bn,fee) in areas.items():
            area,created=ServiceArea.objects.get_or_create(name=name,defaults={"name_bn":bn,"district":"Dhaka","delivery_fee":fee})
            counts["areas"]+=created
            if area.district=="Dhaka" and area.active:
                area.divisions.add(*divisions.values())
        self.stdout.write(json.dumps({"created":counts,"total_active_dhaka_areas":ServiceArea.objects.filter(district="Dhaka",active=True).count(),"extended_offerings":Offering.objects.filter(sku__startswith="DEMO-EXTENDED-").count()},sort_keys=True))
