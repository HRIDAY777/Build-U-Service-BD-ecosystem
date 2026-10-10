# Extended local demo data

Added on 10 October 2026 for testing with Dhaka city and Dhaka district coverage.

| Division | Added offerings |
|---|---:|
| Food | 28 |
| Shop | 40 |
| Pharmacy care essentials | 20 |
| Home services | 24 |
| Electrician | 16 |
| Mechanic | 16 |
| Total | 144 |

Also added: 12 fictional businesses, 18 new categories, 32 size/color variants, 44 food option groups and 110 food options. Listings include Bangla names/descriptions, sample prices, sale-price examples, stock scenarios and clearly illustrative existing local photos. Pharmacy examples are care accessories, not prescription products. Service examples have weekly booking hours. Food portions are required and extras are optional.

The new businesses belong to the previously created local `test_partner_1010` account. Use Portal → Catalog to edit them. Catalog pagination now lets owners reach items beyond the first page. Its credentials remain in the ignored local accounts file; they are not committed.

149 new service areas were added, bringing active Dhaka areas to 152 in this local database. Coverage uses all Dhaka upazila/thana and union names in the bundled community geography dataset, plus familiar urban neighbourhoods, Uttara sectors 1–18 and selected Mirpur sections. District upazilas include Savar, Dhamrai, Keraniganj, Nawabganj and Dohar. Names retain the dataset's spellings. This is a demonstration service configuration, not verified live coverage or an exhaustive village/street register.

New city areas generally have a sample delivery fee of BDT 80, Uttara sectors BDT 90 and district upazila/union areas BDT 120. Existing configured prices, records and disabled-area states are preserved. All active divisions are linked to these active Dhaka demo areas. Parcel pricing still applies its existing server rules; the actual quote is shown before confirmation.

To reproduce locally after the base demo is seeded:

```powershell
$env:DJANGO_DEBUG='true'
.venv/Scripts/python.exe backend/manage.py seed_extended_demo --owner test_partner_1010
```

The command defaults to `demo_catalog_owner` if `--owner` is omitted. It requires an existing owner and base divisions, refuses non-DEBUG environments, and can be repeated without duplicating records or resetting edited prices/stock. Repeating it on the current database created zero new records.

Validation: 103 backend tests passed, including production guard and repeat/preservation checks. Frontend lint, TypeScript and production build passed. Browser validation covers catalog pagination, district coverage and existing customer workflows.

## Catalog presentation update

Eight subject-specific Pexels photos are bundled with sources on `/photo-credits`. Extended demos use matched photos or item icons instead of unrelated division photos. Category-specific bilingual descriptions identify sample prices; custom owner descriptions/images are preserved when rerunning the seed. Cards display current sale prices, stock, duration and options. Catalog filters use a responsive grid.

Validation: extended demo preservation tests (2), customer browser checks (3), frontend lint/typecheck and production build passed. Local test throttling was cleared by restarting the backend before browser verification.
