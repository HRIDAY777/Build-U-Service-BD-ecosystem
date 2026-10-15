from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.operations.models import InventoryMovement

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
class PartnerShopManagementTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.owner = users.objects.create_user(
            username="partner-shop-owner", email="partner-shop-owner@example.test"
        )
        self.other_owner = users.objects.create_user(
            username="other-shop-owner", email="other-shop-owner@example.test"
        )
        self.shop = Division.objects.create(
            slug="shop", name="U Shop", name_bn="ইউ শপ", kind="goods"
        )
        self.food = Division.objects.create(
            slug="food", name="Food", name_bn="খাবার", kind="goods"
        )
        self.organization = Organization.objects.create(
            name="Owner shop",
            division=self.shop,
            owner=self.owner,
            approved=True,
            area="Dhaka",
        )
        other_organization = Organization.objects.create(
            name="Other shop",
            division=self.shop,
            owner=self.other_owner,
            approved=True,
            area="Dhaka",
        )
        food_organization = Organization.objects.create(
            name="Owner restaurant",
            division=self.food,
            owner=self.owner,
            approved=True,
            area="Dhaka",
        )
        self.parent = Category.objects.create(
            division=self.shop, name="Clothing", name_bn="পোশাক"
        )
        self.subcategory = Category.objects.create(
            division=self.shop,
            parent=self.parent,
            name="Casual clothing",
            name_bn="দৈনন্দিন পোশাক",
        )
        self.food_category = Category.objects.create(
            division=self.food, name="Meals", name_bn="খাবার"
        )
        self.brand = ShopBrand.objects.create(
            name="Owner brand", name_bn="ওনার ব্র্যান্ড"
        )
        self.collection = ShopCollection.objects.create(
            name="Daily", name_bn="দৈনিক", slug="daily"
        )
        self.product = Offering.objects.create(
            division=self.shop,
            organization=self.organization,
            category=self.parent,
            name="Shirt",
            name_bn="শার্ট",
            slug="partner-shirt",
            sku="PARTNER-SHIRT",
            description="Shirt",
            price=Decimal("500"),
            stock=5,
        )
        self.other_product = Offering.objects.create(
            division=self.shop,
            organization=other_organization,
            category=self.parent,
            name="Other shirt",
            name_bn="অন্য শার্ট",
            slug="other-partner-shirt",
            sku="OTHER-PARTNER-SHIRT",
            description="Other shirt",
            price=Decimal("600"),
            stock=3,
        )
        self.food_product = Offering.objects.create(
            division=self.food,
            organization=food_organization,
            name="Meal",
            name_bn="খাবার",
            slug="partner-meal",
            sku="PARTNER-MEAL",
            description="Meal",
            price=Decimal("200"),
            stock=3,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def endpoint(self, product, action):
        return f"/api/v1/partner-offerings/{product.pk}/{action}/"

    def test_create_shop_draft_is_scoped_and_not_public(self):
        endpoint = "/api/v1/partner-offerings/new-shop-product/"
        shops = self.client.get(endpoint)
        self.assertEqual([row["id"] for row in shops.data], [self.organization.pk])
        payload = {
            "organization": self.organization.pk,
            "name": "New product", "name_bn": "নতুন পণ্য",
            "description": "Product details", "description_bn": "পণ্যের বিবরণ",
            "price": "250.00", "stock": 7,
        }
        response = self.client.post(endpoint, payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        product = Offering.objects.get(pk=response.data["id"])
        self.assertFalse(product.active)
        self.assertEqual(product.organization, self.organization)
        self.assertEqual(product.stock, 7)
        self.assertTrue(InventoryMovement.objects.filter(offering=product, delta=7).exists())
        self.assertEqual(self.client.get(f"/api/v1/offerings/{product.pk}/").status_code, 404)
        before = Offering.objects.count()
        for organization in [self.other_product.organization_id, self.food_product.organization_id]:
            response = self.client.post(endpoint, {**payload, "organization": organization}, format="json")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Offering.objects.count(), before)
        self.organization.approved = False
        self.organization.save(update_fields=["approved"])
        self.assertEqual(self.client.post(endpoint, payload, format="json").status_code, 400)
        self.client.force_authenticate(user=None)
        self.assertIn(self.client.post(endpoint, payload, format="json").status_code, [401, 403])

    def test_owner_updates_shop_details_and_scope_is_enforced(self):
        endpoint = self.endpoint(self.product, "shop-details")
        self.assertEqual(self.client.get(endpoint).status_code, 200)
        response = self.client.patch(
            endpoint,
            {
                "category": self.subcategory.pk,
                "brand": self.brand.pk,
                "collections": [self.collection.pk],
                "barcode": "PARTNER-BARCODE-1",
                "description": "Updated product",
                "description_bn": "আপডেট পণ্য",
                "price": "550.00",
                "sale_price": "525.00",
                "cost_price": "400.00",
                "image": "/images/photos/tshirt.jpg",
                "active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.category, self.subcategory)
        self.assertEqual(self.product.brand, self.brand)
        self.assertEqual(self.product.barcode, "PARTNER-BARCODE-1")
        self.assertEqual(list(self.product.collections.all()), [self.collection])
        self.assertEqual(self.product.sale_price, Decimal("525.00"))
        self.assertEqual(self.product.cost_price, Decimal("400.00"))

        self.assertEqual(
            self.client.get(self.endpoint(self.other_product, "shop-details")).status_code,
            404,
        )
        invalid = self.client.patch(
            endpoint, {"category": self.food_category.pk}, format="json"
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(
            self.client.get(self.endpoint(self.food_product, "shop-details")).status_code,
            400,
        )

    def test_partner_manages_variants_and_variant_stock(self):
        endpoint = self.endpoint(self.product, "shop-variants")
        response = self.client.put(
            endpoint,
            [
                {
                    "label": "M / Black",
                    "attributes": {"size": "M", "color": "Black"},
                    "sku": "PARTNER-SHIRT-M-BLACK",
                    "barcode": "PARTNER-VARIANT-1",
                    "price": "500.00",
                    "sale_price": None,
                    "cost_price": "350.00",
                    "stock": 4,
                    "active": True,
                },
                {
                    "label": "L / Black",
                    "attributes": {"size": "L", "color": "Black"},
                    "sku": "PARTNER-SHIRT-L-BLACK",
                    "barcode": "PARTNER-VARIANT-2",
                    "price": "520.00",
                    "sale_price": "500.00",
                    "cost_price": "360.00",
                    "stock": 2,
                    "active": True,
                },
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        first, second = ProductVariant.objects.filter(offering=self.product).order_by("id")
        self.assertEqual(
            InventoryMovement.objects.filter(
                offering=self.product, reason="partner_variant_sync"
            ).count(),
            2,
        )
        missing_variant = self.client.post(
            self.endpoint(self.product, "stock"),
            {"delta": 2, "reason": "delivery received"},
            format="json",
        )
        self.assertEqual(missing_variant.status_code, 400)
        adjusted = self.client.post(
            self.endpoint(self.product, "stock"),
            {
                "delta": 2,
                "reason": "delivery received",
                "variant_id": first.pk,
            },
            format="json",
        )
        self.assertEqual(adjusted.status_code, 200, adjusted.data)
        first.refresh_from_db()
        self.assertEqual(first.stock, 6)
        self.assertTrue(
            InventoryMovement.objects.filter(
                offering=self.product,
                variant=first,
                delta=2,
                reason="delivery received",
            ).exists()
        )

        response = self.client.put(
            endpoint,
            [
                {
                    "id": first.pk,
                    "label": first.label,
                    "attributes": first.attributes,
                    "sku": first.sku,
                    "barcode": first.barcode,
                    "price": "500.00",
                    "sale_price": None,
                    "cost_price": "350.00",
                    "stock": 6,
                    "active": True,
                }
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        second.refresh_from_db()
        self.assertFalse(second.active)

        foreign_variant = ProductVariant.objects.create(
            offering=self.other_product,
            label="Other",
            sku="OTHER-VARIANT",
            price=600,
            stock=1,
        )
        invalid = self.client.put(
            endpoint,
            [
                {
                    "id": foreign_variant.pk,
                    "label": "Other",
                    "attributes": {},
                    "sku": "OTHER-VARIANT",
                    "barcode": "",
                    "price": "600.00",
                    "sale_price": None,
                    "cost_price": None,
                    "stock": 1,
                    "active": True,
                }
            ],
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

    def test_partner_manages_media_atomically(self):
        endpoint = self.endpoint(self.product, "shop-media")
        response = self.client.put(
            endpoint,
            [
                {
                    "kind": "image",
                    "url": "/images/photos/tshirt.jpg",
                    "alt": "Front view",
                    "alt_bn": "সামনের ছবি",
                    "position": 0,
                    "active": True,
                },
                {
                    "kind": "video",
                    "url": "https://cdn.example.test/shirt.mp4",
                    "alt": "Product video",
                    "alt_bn": "পণ্যের ভিডিও",
                    "position": 1,
                    "active": True,
                },
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(OfferingMedia.objects.filter(offering=self.product).count(), 2)
        previous = list(
            OfferingMedia.objects.filter(offering=self.product).values_list(
                "url", flat=True
            )
        )
        invalid = self.client.put(
            endpoint,
            [
                {
                    "kind": "image",
                    "url": "http://unsafe.example.test/image.jpg",
                    "alt": "Unsafe",
                    "alt_bn": "",
                    "position": 0,
                    "active": True,
                }
            ],
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(
            list(
                OfferingMedia.objects.filter(offering=self.product).values_list(
                    "url", flat=True
                )
            ),
            previous,
        )
