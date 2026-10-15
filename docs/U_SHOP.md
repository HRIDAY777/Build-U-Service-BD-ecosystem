# U Shop implementation status — 13 October 2026

U Shop has **31 of the 33 requested capabilities working locally**. The remaining two capabilities are integration-ready but cannot move real money until an approved payment provider account, credentials and reachable HTTPS callbacks are available.

| # | Requested capability | Local status | Where it works |
| --- | --- | --- | --- |
| 1 | Products | Complete | Public catalog, product detail and partner catalog |
| 2 | Categories | Complete | Public filter, admin and partner product editor |
| 3 | Subcategories | Complete | Nested category filter and partner assignment |
| 4 | Brands | Complete | Public filter, product detail, admin and partner assignment |
| 5 | Collections | Complete | Public filter, product detail, admin and partner assignment |
| 6 | Variants | Complete | Public selector plus partner create, edit, deactivate and reactivate |
| 7 | Size | Complete | Variant attributes and bilingual public display |
| 8 | Color | Complete | Variant attributes and bilingual public display |
| 9 | Attributes | Complete | Structured variant attributes |
| 10 | SKU | Complete | Product and variant SKU |
| 11 | Barcode | Complete locally | Product and variant search, validation and partner editing |
| 12 | Multiple images | Complete | Ordered product media gallery |
| 13 | Video | Complete | Product media gallery and partner media editor |
| 14 | Regular price | Complete | Public display and partner editor |
| 15 | Sale price | Complete | Public display, quote and checkout pricing |
| 16 | Cost price | Complete | Private staff/partner field; excluded from public API |
| 17 | Stock | Complete | Product/variant availability |
| 18 | Inventory | Complete | Variant-aware adjustments and inventory movements |
| 19 | Wishlist | Complete | Add, remove, move to cart and sharing workflow |
| 20 | Cart | Complete | Persistent server cart |
| 21 | Coupons | Complete | Server-side validation and quote calculation |
| 22 | Checkout | Complete | Server quote, address and order placement |
| 23 | Payment | Integration-ready | COD works; live online collection needs an approved provider |
| 24 | COD | Complete | Order payment method and delivery collection record |
| 25 | Orders | Complete | Customer and operations order views |
| 26 | Tracking | Complete | Order status/history |
| 27 | Reviews | Complete | Verified completed-purchase reviews |
| 28 | Returns | Complete | Request, review, receive and close workflow |
| 29 | Refunds | Integration-ready | Refund records/workflow work; real provider transfer is external |
| 30 | Recommendations | Complete | Delivered-order ranking with safe fallback |
| 31 | Frequently bought together | Complete | Repeated delivered co-purchase ranking |
| 32 | Related products | Complete | Available products from the same category |
| 33 | Recently viewed | Complete | Browser history with server-validated product results |

## Public experience

- `/catalog?division=shop` provides category/subcategory, brand and collection filters.
- `/catalog/<id>` provides the bilingual product facts, barcode, variants, image/video gallery, related products, recommendations, frequently bought together and recently viewed products.
- Discovery returns only approved, active and in-stock products. It exposes no customer or order identity.
- Frequently bought together requires at least two delivered co-purchases; the section stays hidden when there is not enough evidence.

## Partner and staff management

- Approved shop owners can create a bilingual draft product from the partner catalog, with an initial stock movement. Drafts remain hidden publicly until activated. The generated SKU and slug are unique; product details, variants and media can be completed immediately after creation.
- Partners can edit their own U Shop product details, subcategory, brand, collections, barcode, regular/sale/cost price and primary image.
- Partners can manage up to 50 variants and 12 ordered image/video records per product.
- Stock adjustments require the selected variant when a product uses variants, and every change creates an inventory movement.
- Ownership checks prevent one partner from reading or changing another partner's products.
- Global brand, collection and category creation remains a staff/admin responsibility.

## API entry points

- `GET/POST /api/v1/partner-offerings/new-shop-product/` — list managed approved shops / create a private draft product.
- `GET /api/v1/shop-brands/`
- `GET /api/v1/shop-collections/`
- `GET /api/v1/offerings/?division=shop&category=<id>&brand=<id>&collection=<id>`
- `GET /api/v1/offerings/<id>/discovery/?recent=<comma-separated-ids>`
- `GET/PATCH /api/v1/partner-offerings/<id>/shop-details/`
- `GET/PUT /api/v1/partner-offerings/<id>/shop-variants/`
- `GET/PUT /api/v1/partner-offerings/<id>/shop-media/`
- `POST /api/v1/partner-offerings/<id>/stock/`

## Production inputs still required

The application needs an approved merchant account and credentials for live online payment/refund execution, public HTTPS callback URLs, provider certification, production object storage/CDN with media scanning, approved real product/barcode data, and production monitoring. These are deployment inputs rather than unfinished local screens or workflows.

## Verification

- Django tests cover hierarchy, filters, barcode search/validation, public field privacy, discovery ranking, partner ownership, variant inventory and atomic media updates.
- Playwright covers the Bengali/English U Shop filters, gallery and discovery experience in a real Chromium browser.
- Frontend type checking, linting and the production build are part of the release check.
