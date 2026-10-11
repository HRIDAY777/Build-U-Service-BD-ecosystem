import { TranslatedInput } from "@/components/translated-elements";
import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { serverGet, PageResult, Division, Offering } from "@/lib/api";
import { OfferingCard } from "@/components/offering-card";
import { Text } from "@/components/provider";
import { Restaurant, RestaurantInfo } from "@/components/restaurant-info";
type Category = {
  id: number;
  division_slug: string;
  name: string;
  name_bn: string;
};
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
  function divisionUrl(division: string) {
    const next = new URLSearchParams(query);
    next.delete("page");
    next.delete("category");
    next.delete("organization");
    if (division) next.set("division", division);
    else next.delete("division");
    return `/catalog?${next}`;
  }
  const [divisions, items, categories] = await Promise.all([
    serverGet<PageResult<Division>>("divisions/"),
    serverGet<PageResult<Offering>>(`offerings/?${query}`),
    serverGet<Category[]>(
      `categories/?${new URLSearchParams(params.division ? { division: params.division } : {})}`,
    ),
  ]);
  const restaurant =
    params.organization && /^\d+$/.test(params.organization)
      ? await serverGet<Restaurant>(`organizations/${params.organization}/`)
      : null;
  return (
    <div className="page-wrap">
      <span className="eyebrow">
        <UiText text={"U SERVICE BD · DISCOVER"} />
      </span>
      <h1>
        <Text bn="আপনার প্রয়োজন, এক জায়গায়" en="Your everyday starts here" />
      </h1>
      {restaurant && (
        <>
          <h2>{restaurant.name}</h2>
          <RestaurantInfo restaurant={restaurant} />
        </>
      )}
      <p className="page-intro">
        <Text
          bn="খাবার, কেনাকাটা ও বিশ্বস্ত সেবা বেছে নিন।"
          en="Discover meals, everyday essentials and professional services."
        />
      </p>
      <Link
        className="text-link"
        href={
          params.division
            ? `/stores?division=${encodeURIComponent(params.division)}`
            : "/stores"
        }
      >
        <Text bn="দোকান ও সেবাদাতা বেছে নিন" en="Browse stores and providers" />
      </Link>
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
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                <Text
                  bn={category.name_bn || category.name}
                  en={category.name}
                />
              </option>
            ))}
          </select>
        </label>
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
      <div className="filters">
        <Link
          className={`filter ${!params.division ? "active" : ""}`}
          href={divisionUrl("")}
        >
          <Text bn="সব" en="All" />
        </Link>
        {divisions?.results
          .filter((d) => d.kind !== "delivery")
          .map((d) => (
            <Link
              key={d.id}
              className={`filter ${params.division === d.slug ? "active" : ""}`}
              href={divisionUrl(d.slug)}
            >
              <Text bn={d.name_bn} en={d.name} />
            </Link>
          ))}
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
