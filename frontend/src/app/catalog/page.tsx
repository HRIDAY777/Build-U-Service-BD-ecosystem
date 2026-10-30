import { TranslatedInput } from "@/components/translated-elements";
import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { serverGet, PageResult, Division, Offering, Area } from "@/lib/api";
import { OfferingCard } from "@/components/offering-card";
import { Text } from "@/components/provider";
import { Restaurant, RestaurantInfo } from "@/components/restaurant-info";
import { CatalogRefinement } from "@/components/catalog-refinement";
import { ArrowRight } from "lucide-react";
import {
  ShopStorefront,
  ShopHeader,
  ShopBenefits,
} from "@/components/shop-storefront";
import "../shop-reference.css";
import { FoodStorefront } from "@/components/food-storefront";
import {
  ElectricianHeader,
  ElectricianStorefront,
} from "@/components/electrician-storefront";
import "../electrician-reference.css";
import {
  PharmacyHeader,
  PharmacyStorefront,
} from "@/components/pharmacy-storefront";
import "../pharmacy-reference.css";
import { CatalogOverview } from "@/components/catalog-overview";
import "../catalog-overview.css";
type Category = {
  id: number;
  division_slug: string;
  name: string;
  name_bn: string;
  parent: number | null;
};
type ShopFilter = { id: number; name: string; name_bn: string; slug?: string };
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = Object.fromEntries(
    Object.entries(rawParams).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const query = new URLSearchParams();
  if (params.division) query.set("division", params.division);
  if (params.q) query.set("q", params.q);
  if (params.page) query.set("page", params.page);
  for (const key of [
    "min_price",
    "max_price",
    "sort",
    "in_stock",
    "category",
    "organization",
  ]) {
    if (params[key]) query.set(key, params[key]);
  }
  if (params.division === "shop") {
    for (const key of ["brand", "collection"]) {
      if (params[key]) query.set(key, params[key]);
    }
  }
  function divisionUrl(division: string) {
    const next = new URLSearchParams(query);
    next.delete("page");
    next.delete("category");
    next.delete("organization");
    next.delete("brand");
    next.delete("collection");
    if (division) next.set("division", division);
    else next.delete("division");
    return `/catalog?${next}`;
  }
  const [divisions, items, categories, brands, collections, electricianAreas] =
    await Promise.all(
    [
      serverGet<PageResult<Division>>("divisions/"),
      serverGet<PageResult<Offering>>(`offerings/?${query}`),
      serverGet<Category[]>(
        `categories/?${new URLSearchParams(params.division ? { division: params.division } : {})}`,
      ),
      params.division === "shop"
        ? serverGet<ShopFilter[]>("shop-brands/")
        : null,
      params.division === "shop"
        ? serverGet<ShopFilter[]>("shop-collections/")
        : null,
      params.division === "electrician"
        ? serverGet<PageResult<Area>>("areas/?division=electrician")
        : null,
    ],
  );
  const foodRestaurants =
    params.division === "food"
      ? await serverGet<PageResult<Restaurant>>("organizations/?division=food")
      : null;
  const foodHighlights =
    params.division === "food"
      ? await serverGet<PageResult<Offering>>("offerings/?division=food")
      : null;
  const restaurant =
    params.organization && /^\d+$/.test(params.organization)
      ? await serverGet<Restaurant>(`organizations/${params.organization}/`)
      : null;
  const topLevelCategories = (categories || []).filter(
    (category) => category.parent === null,
  );
  const topLevelIds = new Set(
    topLevelCategories.map((category) => category.id),
  );
  const orderedCategories = [
    ...topLevelCategories.flatMap((parent) => [
      parent,
      ...(categories || []).filter((category) => category.parent === parent.id),
    ]),
    ...(categories || []).filter(
      (category) =>
        category.parent !== null && !topLevelIds.has(category.parent),
    ),
  ];
  const selectedDivision = divisions?.results.find(
    (d) => d.slug === params.division,
  );
  if (Object.keys(params).length === 0) {
    return <CatalogOverview items={items?.results || []} />;
  }
  if (params.division === "electrician") {
    return (
      <div className="page-wrap catalog-page electrician-reference-page">
        <ElectricianHeader />
        <ElectricianStorefront
          offerings={items?.results || []}
          areas={electricianAreas}
        />
      </div>
    );
  }
  if (params.division === "pharmacy") {
    return (
      <div className="page-wrap catalog-page pharmacy-reference-page">
        <PharmacyHeader />
        <PharmacyStorefront
          categories={categories || []}
          items={items}
          query={params.q}
          selected={params.category}
        />
      </div>
    );
  }
  return (
    <div
      className={`page-wrap catalog-page${params.division === "shop" ? " shop-reference-page" : params.division === "food" ? " food-reference-page" : ""}`}
    >
      {params.division === "food" && (
        <FoodStorefront
          categories={categories || []}
          restaurants={foodRestaurants?.results || null}
          items={foodHighlights?.results || []}
          query={params.q}
          selected={params.category}
        />
      )}
      {params.division === "shop" && <ShopHeader />}
      {params.division === "shop" && (
        <ShopStorefront
          categories={categories || []}
          query={params.q}
          selected={params.category}
        />
      )}
      <nav className="catalog-breadcrumb" aria-labelledby="catalog-path-label">
        <span id="catalog-path-label" className="sr-only">
          <Text bn="পাতার অবস্থান" en="Page location" />
        </span>
        <Link href="/">
          <Text bn="হোম" en="Home" />
        </Link>
        <span>/</span>
        <Text bn="সেবা ও কেনাকাটা" en="Explore & shop" />
      </nav>
      {params.division !== "shop" && params.division !== "food" && (
        <header className="catalog-heading">
          <div>
            <span className="eyebrow">
              <UiText text={"U SERVICE BD · DISCOVER"} />
            </span>
            <h1>
              {selectedDivision ? (
                <Text
                  bn={selectedDivision.name_bn || selectedDivision.name}
                  en={selectedDivision.name}
                />
              ) : (
                <Text bn="আপনার প্রয়োজন, এক জায়গায়" en="Find your everyday." />
              )}
            </h1>
            <p className="page-intro">
              <Text
                bn="খাবার, কেনাকাটা ও বিশ্বস্ত সেবা বেছে নিন।"
                en="Discover meals, everyday essentials and professional services."
              />
            </p>
          </div>
          <Link
            className="text-link"
            href={
              params.division
                ? `/stores?division=${encodeURIComponent(params.division)}`
                : "/stores"
            }
          >
            <Text
              bn="দোকান ও সেবাদাতা বেছে নিন"
              en="Browse stores and providers"
            />
            <ArrowRight size={16} />
          </Link>
        </header>
      )}
      {restaurant && (
        <section className="catalog-business">
          <h2>{restaurant.name}</h2>
          <RestaurantInfo restaurant={restaurant} />
        </section>
      )}
      {params.organization && (
        <p>
          <Text
            bn="নির্বাচিত প্রতিষ্ঠানের পণ্য ও সেবা দেখানো হচ্ছে।"
            en="Showing products and services from the selected business."
          />{" "}
          <Link className="text-link" href={divisionUrl(params.division || "")}>
            <Text bn="সব প্রতিষ্ঠান দেখুন" en="Show all businesses" />
          </Link>
        </p>
      )}
      <nav
        className="catalog-divisions"
        aria-labelledby="catalog-divisions-label"
      >
        <span id="catalog-divisions-label" className="sr-only">
          <Text bn="সেবার বিভাগ" en="Service divisions" />
        </span>
        <Link
          className={!params.division ? "active" : ""}
          href={divisionUrl("")}
          aria-current={!params.division ? "page" : undefined}
        >
          <Text bn="সব বিভাগ" en="All divisions" />
        </Link>
        {divisions?.results
          .filter((d) => d.kind !== "delivery")
          .map((d) => (
            <Link
              key={d.id}
              className={params.division === d.slug ? "active" : ""}
              aria-current={params.division === d.slug ? "page" : undefined}
              href={divisionUrl(d.slug)}
            >
              <Text bn={d.name_bn || d.name} en={d.name} />
            </Link>
          ))}
      </nav>
      <div
        className="catalog-layout"
        id={params.division === "food" ? "food-results" : "shop-products"}
      >
        <CatalogRefinement
          collapsed={params.division === "shop" || params.division === "food"}
        >
          <form className="form-panel catalog-filters" action="/catalog">
            <label className="field">
              <Text bn="পণ্য বা সেবা খুঁজুন" en="Search products or services" />
              <TranslatedInput
                name="q"
                defaultValue={params.q}
                placeholder="খুঁজুন / Search"
                aria-label="Search catalog"
              />
            </label>
            <label className="field">
              <Text bn="ক্যাটাগরি" en="Category" />
              <select name="category" defaultValue={params.category || ""}>
                <option value="">
                  <UiText text={"All categories / সব ক্যাটাগরি"} />
                </option>
                {orderedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    <Text
                      bn={`${category.parent ? "— " : ""}${category.name_bn || category.name}`}
                      en={`${category.parent ? "— " : ""}${category.name}`}
                    />
                  </option>
                ))}
              </select>
            </label>
            {params.division === "shop" && (
              <label className="field">
                <Text bn="ব্র্যান্ড" en="Brand" />
                <select name="brand" defaultValue={params.brand || ""}>
                  <option value="">
                    <Text bn="সব ব্র্যান্ড" en="All brands" />
                  </option>
                  {brands?.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      <Text bn={brand.name_bn || brand.name} en={brand.name} />
                    </option>
                  ))}
                </select>
              </label>
            )}
            {params.division === "shop" && (
              <label className="field">
                <Text bn="কালেকশন" en="Collection" />
                <select
                  name="collection"
                  defaultValue={params.collection || ""}
                >
                  <option value="">
                    <Text bn="সব কালেকশন" en="All collections" />
                  </option>
                  {collections?.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      <Text
                        bn={collection.name_bn || collection.name}
                        en={collection.name}
                      />
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <Text bn="সর্বনিম্ন দাম (৳)" en="Minimum price (৳)" />
              <input
                type="number"
                name="min_price"
                min="0"
                max="9999999999.99"
                step="0.01"
                defaultValue={params.min_price}
              />
            </label>
            <label className="field">
              <Text bn="সর্বোচ্চ দাম (৳)" en="Maximum price (৳)" />
              <input
                type="number"
                name="max_price"
                min="0"
                max="9999999999.99"
                step="0.01"
                defaultValue={params.max_price}
              />
            </label>
            <label className="field">
              <Text bn="সাজান" en="Sort by" />
              <select name="sort" defaultValue={params.sort || "default"}>
                <option value="default">
                  <UiText text={"Default / স্বাভাবিক"} />
                </option>
                <option value="price_asc">
                  <UiText text={"Price: low to high / কম থেকে বেশি"} />
                </option>
                <option value="price_desc">
                  <UiText text={"Price: high to low / বেশি থেকে কম"} />
                </option>
                <option value="name">
                  <UiText text={"Name / নাম"} />
                </option>
                <option value="updated">
                  <UiText text={"Recently updated / সম্প্রতি আপডেট"} />
                </option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                name="in_stock"
                value="true"
                defaultChecked={params.in_stock === "true"}
              />{" "}
              <Text
                bn="শুধু মজুত পণ্য ও সেবা"
                en="In-stock products and services"
              />
            </label>
            {params.division && (
              <input type="hidden" name="division" value={params.division} />
            )}
            {params.organization && (
              <input
                type="hidden"
                name="organization"
                value={params.organization}
              />
            )}
            <button className="button">
              <Text bn="খুঁজুন" en="Search" />
            </button>
            <Link
              className="text-link"
              href={
                params.division
                  ? `/catalog?division=${encodeURIComponent(params.division)}`
                  : "/catalog"
              }
            >
              <Text bn="ফিল্টার মুছুন" en="Clear filters" />
            </Link>
          </form>
        </CatalogRefinement>
        {params.division === "shop" && <ShopBenefits />}
        <section
          className="catalog-results"
          aria-labelledby="catalog-results-title"
        >
          <div className="catalog-results-heading">
            <h2 id="catalog-results-title">
              <Text bn="আপনার জন্য" en="Explore the collection" />
            </h2>
            {items && (
              <span>
                <Text
                  bn={`${items.count.toLocaleString("bn-BD")}টি ফলাফল`}
                  en={`${items.count.toLocaleString("en-US")} results`}
                />
              </span>
            )}
          </div>
          <div className="offering-grid">
            {items?.results.map((o) => (
              <OfferingCard key={o.id} offering={o} />
            ))}
            {!items?.results.length && (
              <div className="empty">
                <p>
                  {items ? (
                    <UiText
                      text={"কোনো ফলাফল পাওয়া যায়নি। / No matching results."}
                    />
                  ) : (
                    <UiText
                      text={
                        "দামের সীমা ও ফিল্টার পরীক্ষা করুন, অথবা কিছুক্ষণ পর চেষ্টা করুন। / Check the price range and filters, or try again shortly."
                      }
                    />
                  )}
                </p>
                <Link className="button secondary" href="/catalog">
                  <UiText text={"View all"} />
                </Link>
              </div>
            )}
          </div>
          {items && items.count > 24 && (
            <div className="record-actions">
              {Number(params.page || 1) > 1 && (
                <Link
                  className="button secondary"
                  href={`/catalog?${new URLSearchParams({ ...params, page: String(Number(params.page) - 1) })}`}
                >
                  <UiText text={"Previous"} />
                </Link>
              )}
              {items.next && (
                <Link
                  className="button"
                  href={`/catalog?${new URLSearchParams({ ...params, page: String(Number(params.page || 1) + 1) })}`}
                >
                  <UiText text={"Next"} />
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
      <p className="demo-note">
        <UiText
          text={
            "Demo catalog · Prices and availability are validated again at checkout."
          }
        />
      </p>
    </div>
  );
}
