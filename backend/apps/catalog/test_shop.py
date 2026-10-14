from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.operations.models import Order, OrderItem
from .models import (
    Category,
    Division,
    Offering,
    OfferingMedia,
    Organization,
    ProductVariant,
    ShopBrand,
    ShopCollection,
)


@override_settings(SECURE_SSL_REDIRECT=False)
class ShopCatalogTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            username="shop-owner", email="shop-owner@example.test"
        )
        self.customer = get_user_model().objects.create_user(
            username="shop-customer", email="shop-customer@example.test"
        )
        self.shop = Division.objects.create(slug="shop", name="U Shop", name_bn="ইউ শপ", kind="goods")
        self.food = Division.objects.create(slug="food", name="Food", name_bn="খাবার", kind="goods")
        self.org = Organization.objects.create(name="Approved shop", division=self.shop, owner=user, approved=True, area="Dhaka")
        self.category = Category.objects.create(division=self.shop, name="Clothing", name_bn="পোশাক")
        self.subcategory = Category.objects.create(division=self.shop, parent=self.category, name="T-shirts", name_bn="টি-শার্ট")
        self.brand = ShopBrand.objects.create(name="Demo Brand", name_bn="ডেমো ব্র্যান্ড")
        self.collection = ShopCollection.objects.create(name="Summer", name_bn="গ্রীষ্ম", slug="summer")
        self.inactive_collection = ShopCollection.objects.create(name="Hidden", slug="hidden", active=False)
        self.product = self.make_product("Main shirt", "main-shirt", "SHOP-1", self.subcategory, barcode="10001")
        self.product.brand = self.brand
        self.product.save(update_fields=["brand"])
        self.product.collections.add(self.collection, self.inactive_collection)
        self.related = self.make_product("Related shirt", "related-shirt", "SHOP-2", self.subcategory)
        self.companion = self.make_product("Companion", "companion", "SHOP-3", self.category)
        self.popular = self.make_product("Popular", "popular", "SHOP-4", self.category)
        self.out_of_stock = self.make_product("Unavailable", "unavailable", "SHOP-5", self.category, stock=0)
        self.other_category = Category.objects.create(division=self.shop, name="Home", name_bn="ঘর")
        self.recent = self.make_product("Recently viewed", "recent", "SHOP-6", self.other_category)
        self.client = APIClient()

    def make_product(self, name, slug, sku, category, stock=5, barcode=""):
        return Offering.objects.create(
            division=self.shop,
            organization=self.org,
            category=category,
            name=name,
            name_bn=name,
            slug=slug,
            sku=sku,
            barcode=barcode,
            description="Product description",
            price=Decimal("500"),
            stock=stock,
        )

    def delivered_order(self, *products):
        order = Order.objects.create(
            customer=self.customer,
            division=self.shop,
            organization=self.org,
            status="delivered",
            address={"recipient": "Demo", "phone": "01712345678", "area": "Dhaka", "line": "Road 1"},
            subtotal=Decimal("1000"),
            delivery_fee=Decimal("0"),
            total=Decimal("1000"),
            idempotency_key=f"order-{Order.objects.count()}",
            request_hash="test",
        )
        for product in products:
            OrderItem.objects.create(order=order, offering=product, name=product.name, quantity=1, unit_price=product.price)
        return order

    def test_shop_metadata_filters_hierarchy_barcode_and_public_fields(self):
        OfferingMedia.objects.create(offering=self.product, kind="image", url="/images/photos/tshirt.jpg", alt="Front")
        OfferingMedia.objects.create(offering=self.product, kind="video", url="https://cdn.example.test/product.mp4", alt="Demo")
        OfferingMedia.objects.create(offering=self.product, kind="image", url="http://unsafe.example.test/image.jpg", alt="Hidden")
        variant = ProductVariant.objects.create(offering=self.product, label="Large", attributes={"size": "L", "color": "Purple"}, sku="SHOP-1-L", barcode="20001", price=500, stock=4)

        detail = self.client.get(f"/api/v1/offerings/{self.product.pk}/")
        self.assertEqual(detail.status_code, 200, detail.data)
        self.assertEqual(detail.data["brand_name"], "Demo Brand")
        self.assertEqual([value["slug"] for value in detail.data["collections"]], ["summer"])
        self.assertEqual(len(detail.data["media"]), 2)
        self.assertNotIn("cost_price", detail.data)
        self.assertEqual(detail.data["variants"][0]["barcode"], variant.barcode)

        for query in [
            f"category={self.category.pk}",
            f"brand={self.brand.pk}",
            f"collection={self.collection.pk}",
            "q=10001",
            "q=20001",
        ]:
            response = self.client.get(f"/api/v1/offerings/?division=shop&{query}")
            self.assertEqual(response.status_code, 200, response.data)
            self.assertIn(self.product.pk, [row["id"] for row in response.data["results"]])

    def test_recommendations_related_recent_and_frequently_bought_together(self):
        self.delivered_order(self.product, self.companion, self.popular)
        self.delivered_order(self.product, self.companion)
        self.delivered_order(self.popular)
        self.delivered_order(self.popular)
        Order.objects.create(
            customer=self.customer, division=self.shop, organization=self.org, status="placed", address={},
            subtotal=1, delivery_fee=0, total=1, idempotency_key="placed", request_hash="test",
        )
        response = self.client.get(f"/api/v1/offerings/{self.product.pk}/discovery/?recent={self.recent.pk},{self.product.pk}")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([row["id"] for row in response.data["recent"]], [self.recent.pk])
        self.assertIn(self.related.pk, [row["id"] for row in response.data["related"]])
        self.assertEqual([row["id"] for row in response.data["bought_together"]], [self.companion.pk])
        self.assertEqual(response.data["recommended"][0]["id"], self.popular.pk)
        all_ids = {row["id"] for section in response.data.values() for row in section}
        self.assertNotIn(self.out_of_stock.pk, all_ids)
        self.assertNotIn("customer", str(response.data))
        self.assertEqual(self.client.get(f"/api/v1/offerings/{self.product.pk}/discovery/?recent=bad").status_code, 400)

    def test_shop_model_validation(self):
        wrong_parent = Category(division=self.food, parent=self.category, name="Wrong", name_bn="ভুল")
        with self.assertRaises(DjangoValidationError):
            wrong_parent.full_clean()
        non_shop = Offering(division=self.food, brand=self.brand, name="Food", name_bn="খাবার", slug="food-product", sku="FOOD-X", description="x", price=1)
        with self.assertRaises(DjangoValidationError):
            non_shop.full_clean()
        non_shop.brand = None
        non_shop.save()
        with self.assertRaises(DjangoValidationError), transaction.atomic():
            non_shop.collections.add(self.collection)
        bad_media = OfferingMedia(offering=self.product, kind="image", url="http://example.test/a.jpg")
        with self.assertRaises(DjangoValidationError):
            bad_media.full_clean()
        local_video = OfferingMedia(
            offering=self.product, kind="video", url="/videos/shop-demo.mp4"
        )
        local_video.full_clean()
        duplicate_product_barcode = ProductVariant(
            offering=self.related,
            label="Duplicate barcode",
            sku="DUPLICATE-BARCODE",
            barcode=self.product.barcode,
            price=1,
        )
        with self.assertRaises(DjangoValidationError):
            duplicate_product_barcode.full_clean()
        ProductVariant.objects.create(
            offering=self.related,
            label="Cross table source",
            sku="CROSS-TABLE-SOURCE",
            barcode="20001",
            price=1,
        )
        cross_table_product = Offering(
            division=self.shop,
            organization=self.org,
            category=self.category,
            name="Cross table duplicate",
            name_bn="ক্রস টেবিল ডুপ্লিকেট",
            slug="cross-table-duplicate",
            sku="CROSS-TABLE-DUPLICATE",
            barcode="20001",
            description="x",
            price=1,
        )
        with self.assertRaises(DjangoValidationError):
            cross_table_product.full_clean()
