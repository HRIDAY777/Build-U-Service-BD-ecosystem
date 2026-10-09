import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { serverGet, PageResult, Division } from "@/lib/api";
import { Text } from "@/components/provider";
import { LocalityInput } from "@/components/location-picker";
import { Photo } from "@/components/photo";
import { divisionPhotos } from "@/lib/photos";

type Business = {
  id: number;
  name: string;
  division: number;
  division_name: string;
  division_name_bn: string;
  division_slug: string;
  area: string;
  address: string;
  description: string;
  opening_hours: string;
};

export default async function Stores({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const query = new URLSearchParams();
  for (const key of ["division", "q", "area", "page"])
    if (params[key]) query.set(key, params[key]);
  const [businesses, divisions] = await Promise.all([
    serverGet<PageResult<Business>>(`organizations/?${query}`),
    serverGet<PageResult<Division>>("divisions/"),
  ]);
  const page = Number(params.page || 1);
  function pageUrl(value: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(value));
    return `/stores?${next}`;
  }
  return (
    <div className="page-wrap">
      <h1>
        <Text bn="দোকান ও সেবাদাতা" en="Stores and service providers" />
      </h1>
      <p>
        <Text
          bn="নাম, এলাকা, ঠিকানা ও ব্যবসার বিভাগ দিয়ে প্রতিষ্ঠান খুঁজুন।"
          en="Find businesses by name, area, address and business division."
        />
      </p>
      <form className="form-panel" action="/stores">
        <label className="field">
          <Text bn="নাম বা ঠিকানা" en="Name or address" />
          <input name="q" maxLength={150} defaultValue={params.q} />
        </label>
        <label className="field">
          <Text bn="এলাকা" en="Area" />
          <LocalityInput name="area" defaultValue={params.area} />
        </label>
        <label className="field">
          <Text bn="ব্যবসার বিভাগ" en="Business division" />
          <select name="division" defaultValue={params.division || ""}>
            <option value="">All / সব</option>
            {divisions?.results.map((division) => (
              <option key={division.id} value={division.slug}>
                {division.name_bn} / {division.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button">
          <Text bn="খুঁজুন" en="Search" />
        </button>
        <Link href="/stores" className="text-link">
          <Text bn="ফিল্টার মুছুন" en="Clear filters" />
        </Link>
      </form>
      {!businesses ? (
        <p role="alert">
          <UiText text={"Businesses are unavailable. Please try again."} />
        </p>
      ) : (
        !businesses.results.length && (
          <p>No matching businesses / কোনো প্রতিষ্ঠান পাওয়া যায়নি।</p>
        )
      )}
      {businesses?.results.map((business) => (
        <article className="record store-photo-card" key={business.id}>
          {divisionPhotos[business.division_slug] && (
            <div className="store-photo">
              <Photo
                src={divisionPhotos[business.division_slug]}
                alt={`${business.division_name_bn} সেবার দৃষ্টান্তমূলক ছবি`}
              />
              <span className="photo-demo-label">সেবার দৃষ্টান্তমূলক ছবি</span>
            </div>
          )}
          <div>
            <h2>{business.name}</h2>
            <p>
              <Text bn="বিভাগ: " en="Division: " />
              <Text
                bn={business.division_name_bn || business.division_name}
                en={business.division_name}
              />
            </p>
            <p>
              <Text bn="এলাকা: " en="Area: " />
              {business.area}
            </p>
            <p>
              <Text bn="ঠিকানা: " en="Address: " />
              {business.address || "ঠিকানা দেওয়া হয়নি / Address not provided"}
            </p>
            <p>{business.description}</p>
            {business.opening_hours && (
              <p>
                <Text bn="সময়সূচি: " en="Hours: " />
                {business.opening_hours}
              </p>
            )}
            <Link
              className="button secondary"
              href={`/catalog?${new URLSearchParams({ organization: String(business.id), division: business.division_slug })}`}
            >
              <Text bn="পণ্য ও সেবা দেখুন" en="View products and services" />
            </Link>
          </div>
        </article>
      ))}
      <div className="record-actions">
        {page > 1 && (
          <Link className="button secondary" href={pageUrl(page - 1)}>
            <UiText text={"Previous"} />
          </Link>
        )}
        {businesses?.next && (
          <Link className="button secondary" href={pageUrl(page + 1)}>
            <UiText text={"Next"} />
          </Link>
        )}
      </div>
    </div>
  );
}
