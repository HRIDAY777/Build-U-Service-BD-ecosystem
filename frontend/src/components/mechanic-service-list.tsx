"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, ArrowDown } from "lucide-react";
import { Offering } from "@/lib/api";
import { OfferingCard } from "./offering-card";
import { Text, useApp } from "./provider";
export function MechanicServiceList({ services }: { services: Offering[] }) {
  const { lang } = useApp();
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("recommended"),
    [limit, setLimit] = useState(8);
  const needle = query.trim().normalize("NFC").toLocaleLowerCase();
  const results = services.filter((o) =>
    [o.name, o.name_bn, o.description, o.description_bn, o.merchant]
      .join(" ")
      .normalize("NFC")
      .toLocaleLowerCase()
      .includes(needle),
  );
  if (sort !== "recommended")
    results.sort((a, b) =>
      sort === "price_low"
        ? Number(a.price) - Number(b.price)
        : Number(b.price) - Number(a.price),
    );
  const visible = results.slice(0, limit);
  return (
    <div className="mechanic-service-list">
      <div className="mechanic-list-controls">
        <label className="mechanic-search">
          <Search size={18} />
          <span className="sr-only">
            <Text bn="মেকানিক সেবা খুঁজুন" en="Search mechanic services" />
          </span>
          <input
            type="search"
            value={query}
            placeholder={
              lang === "bn"
                ? "সেবার নাম বা সমস্যার ধরন লিখুন…"
                : "Search a service or describe the issue…"
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(8);
            }}
          />
        </label>
        <label className="mechanic-sort">
          <SlidersHorizontal size={17} />
          <span className="sr-only">
            <Text bn="সেবা সাজান" en="Sort services" />
          </span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setLimit(8);
            }}
          >
            <option value="recommended">
              <Text bn="সাধারণ ক্রম" en="Default order" />
            </option>
            <option value="price_low">
              <Text bn="কম দাম আগে" en="Price: low to high" />
            </option>
            <option value="price_high">
              <Text bn="বেশি দাম আগে" en="Price: high to low" />
            </option>
          </select>
        </label>
      </div>
      <div className="mechanic-list-status">
        <p role="status">
          {lang === "bn"
            ? results.length +
              "টি সেবার মধ্যে " +
              visible.length +
              "টি দেখানো হচ্ছে"
            : "Showing " +
              visible.length +
              " of " +
              results.length +
              " services"}
        </p>
        {(query || sort !== "recommended") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSort("recommended");
              setLimit(8);
            }}
          >
            <Text bn="ফিল্টার মুছুন" en="Clear filters" />
          </button>
        )}
      </div>
      {visible.length ? (
        <div className="offering-grid">
          {visible.map((o) => (
            <OfferingCard key={o.id} offering={o} />
          ))}
        </div>
      ) : (
        <div className="mechanic-search-empty">
          <Search size={30} />
          <h3>
            <Text bn="মিল পাওয়া যায়নি" en="No matching services" />
          </h3>
          <p>
            <Text
              bn="অন্য শব্দ দিয়ে খুঁজুন বা ফিল্টার মুছে সব সেবা দেখুন।"
              en="Try a different search or clear the filters to see services."
            />
          </p>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setQuery("");
              setSort("recommended");
              setLimit(8);
            }}
          >
            <Text bn="সব সেবা দেখুন" en="Show services" />
          </button>
        </div>
      )}
      {visible.length < results.length && (
        <div className="mechanic-show-more">
          <button
            className="button secondary"
            type="button"
            onClick={() => setLimit((n) => n + 8)}
          >
            <Text bn="আরও সেবা দেখুন" en="Show more services" />
            <ArrowDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
