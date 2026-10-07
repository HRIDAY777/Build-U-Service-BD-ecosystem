import Link from "next/link";
import { serverGet, PageResult, Division, Offering } from "@/lib/api";
import { OfferingCard } from "@/components/offering-card";
import { Text } from "@/components/provider";
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{ division?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.division) query.set("division", params.division);
  if (params.q) query.set("q", params.q);
  if (params.page) query.set("page", params.page);
  const [divisions, items] = await Promise.all([
    serverGet<PageResult<Division>>("divisions/"),
    serverGet<PageResult<Offering>>(`offerings/?${query}`),
  ]);
  return (
    <div className="page-wrap">
      <span className="eyebrow">U SERVICE BD · DISCOVER</span>
      <h1>
        <Text bn="আপনার প্রয়োজন, এক জায়গায়" en="Your everyday starts here" />
      </h1>
      <p className="page-intro">
        <Text
          bn="খাবার, কেনাকাটা ও বিশ্বস্ত সেবা বেছে নিন।"
          en="Discover meals, everyday essentials and professional services."
        />
      </p>
      <form className="search-row">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="খুঁজুন / Search"
          aria-label="Search catalog"
        />
        {params.division && (
          <input type="hidden" name="division" value={params.division} />
        )}
        <button className="button">
          <Text bn="খুঁজুন" en="Search" />
        </button>
      </form>
      <div className="filters">
        <Link
          className={`filter ${!params.division ? "active" : ""}`}
          href="/catalog"
        >
          <Text bn="সব" en="All" />
        </Link>
        {divisions?.results
          .filter((d) => d.kind !== "delivery")
          .map((d) => (
            <Link
              key={d.id}
              className={`filter ${params.division === d.slug ? "active" : ""}`}
              href={`/catalog?division=${d.slug}`}
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
              {items
                ? "কোনো ফলাফল পাওয়া যায়নি। / No matching results."
                : "Catalog is unavailable. Please try again shortly."}
            </p>
            <Link className="button secondary" href="/catalog">
              View all
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
              Previous
            </Link>
          )}
          {items.next && (
            <Link
              className="button"
              href={`/catalog?${new URLSearchParams({ ...params, page: String(Number(params.page || 1) + 1) })}`}
            >
              Next
            </Link>
          )}
        </div>
      )}
      <p className="demo-note">
        Demo catalog · Prices and availability are validated again at checkout.
      </p>
    </div>
  );
}
