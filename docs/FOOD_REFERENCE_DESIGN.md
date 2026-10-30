# Food reference redesign

Page: /catalog?division=food
Reference: U Service Bengali Food Delivery Homepage.png supplied by the user.

Implemented a working HTML header, bilingual hero copy, locality search, meal search, category links, restaurant menu links, database-backed offers, ordering guidance, and the existing catalog/cart controls. Mobile artwork is shown at its full aspect ratio. No screenshot is used as a functioning page. Restaurant names, preparation time, prices and discounts come from the API; reference-only claims and discount percentages are not invented.

Generated asset: frontend/public/images/photos/food-hero-clean.webp
Method: built-in image_gen, original saved at C:/Users/mdsia/.codex/generated_images/01a10d6d-52a8-7001-bb2c-0dc1abafcbb8/exec-10e1d46e-5c9d-414c-9cc6-eff762ded2b4.png; WebP conversion with Sharp.

Prompt:
Create a clean web hero BACKGROUND ASSET from the supplied Food Delivery homepage reference. Only the photographic hero scene, no entire webpage. Wide 4:1 ratio. Preserve closely the same composition: left 38% very pale airy Dhaka cityscape negative space, smiling Bangladeshi woman in purple holding phone at 51%, purple-uniformed delivery rider with purple branded U Service food bag at 70%, delicious large chicken biryani bowl on warm restaurant table at far right. Keep people, entire phone and food inside frame. Remove ALL headline text, breadcrumb, navigation, search fields, buttons, category rows, speech bubbles and any badges; no UI whatsoever. Preserve U Service branding on bag/phone. Seamless polished photographic marketing composition, natural warm lighting, white and soft lavender on left. This is just the hero artwork for real HTML text and controls to overlay.

Validation: ESLint and TypeScript passed. Browser checks passed at 320, 390, 768 and 1672 pixels with no horizontal overflow. Bengali/English switch, mobile menu, meal search and restaurant menu navigation passed. This is a reference-based implementation, not a verified pixel-identical clone. Existing demo data and missing product photography remain visible as such.
