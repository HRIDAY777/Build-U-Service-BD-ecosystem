import io
from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from .models import (
    FoodOption,
    Offering,
    OfferingMedia,
    Organization,
    ProductVariant,
    ServiceArea,
    ShopBrand,
    ShopCollection,
)


@override_settings(DEBUG=True)
class ExtendedDemoTests(TestCase):
    def test_extended_data_coverage_and_repeat_preserve_edits(self):
        call_command("seed_demo", stdout=io.StringIO())
        call_command("seed_extended_demo", stdout=io.StringIO())
        self.assertEqual(Offering.objects.filter(sku__startswith="DEMO-EXTENDED-").count(), 144)
        self.assertEqual(FoodOption.objects.count(), 110)
        self.assertEqual(ProductVariant.objects.count(), 32)
        self.assertEqual(ShopBrand.objects.count(), 3)
        self.assertEqual(ShopCollection.objects.count(), 4)
        self.assertEqual(OfferingMedia.objects.count(), 22)
        self.assertEqual(Organization.objects.filter(name__startswith="DEMO Plus ").count(), 12)
        for name in ["Dhanmondi", "Uttara Sector 18", "Savar", "Dhamrai", "Keraniganj", "Nawabganj", "Dohar", "Aminbazar"]:
            area = ServiceArea.objects.get(name=name, district="Dhaka")
            self.assertTrue(area.divisions.filter(slug="delivery").exists())
            self.assertTrue(area.divisions.filter(slug="services").exists())
        item = Offering.objects.get(sku="DEMO-EXTENDED-SHOP-1-1")
        self.assertEqual(item.image, "/images/photos/tshirt.jpg")
        self.assertIn("Cotton T-shirt", item.description)
        self.assertEqual(item.barcode, "8801000100001")
        self.assertEqual(item.brand.name, "U Service Lifestyle")
        self.assertEqual(item.category.parent.name, "Clothing")
        self.assertEqual(item.collections.count(), 2)
        self.assertEqual(item.media.count(), 2)
        self.assertEqual(item.variants.exclude(barcode="").count(), 4)
        item.image = "/images/custom-shirt.jpg"
        item.description = "Owner's own description"
        item.price = 999
        item.save()
        area = ServiceArea.objects.get(name="Uttara Sector 18")
        area.active = False
        area.delivery_fee = 155
        area.save()
        count = ServiceArea.objects.count()
        call_command("seed_extended_demo", stdout=io.StringIO())
        item.refresh_from_db()
        area.refresh_from_db()
        self.assertEqual(item.price, 999)
        self.assertEqual(item.image, "/images/custom-shirt.jpg")
        self.assertEqual(item.description, "Owner's own description")
        self.assertFalse(area.active)
        self.assertEqual(area.delivery_fee, 155)
        self.assertEqual(ServiceArea.objects.count(), count)
        self.assertEqual(Offering.objects.filter(sku__startswith="DEMO-EXTENDED-").count(), 144)

    @override_settings(DEBUG=False)
    def test_demo_disabled_in_production(self):
        with self.assertRaises(CommandError):
            call_command("seed_extended_demo", stdout=io.StringIO())
        self.assertFalse(Offering.objects.exists())
