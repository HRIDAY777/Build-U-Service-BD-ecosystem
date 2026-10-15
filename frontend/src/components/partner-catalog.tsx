"use client";
import { UiText } from "@/components/ui-text";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { api, Offering, PageResult } from "@/lib/api";
import { ScheduleEditor } from "./schedule-editor";
import { FoodOptionEditor } from "./food-option-editor";
import { PartnerRestaurants } from "./partner-restaurants";
import { ShopProductEditor } from "./shop-product-editor";
import { ShopProductCreate } from "./shop-product-create";
import { Text } from "./provider";
export function PartnerCatalog() {
  const [items, setItems] = useState<Offering[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ q: "", state: "" });
  const [revision, setRevision] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<PageResult<Offering>>(
        `partner-offerings/?${new URLSearchParams({ ...filters, page: String(page) })}`,
      );
      setItems(result.results);
      setNext(!!result.next);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);
  useEffect(() => {
    void load();
  }, [load, revision]);
  async function update(
    e: FormEvent<HTMLFormElement>,
    id: number,
    stock = false,
  ) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(
        `partner-offerings/${id}/${stock ? "stock/" : ""}`,
        stock ? "POST" : "PATCH",
        data,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PartnerRestaurants />
      <ShopProductCreate onCreated={() => {
        setPage(1);
        setFilters({ q: "", state: "" });
        setRevision((value) => value + 1);
      }} />
      <h2>
        <UiText text={"Your catalog & inventory"} />
      </h2>
      <p className="subtle">
        <Text bn="অনুমোদিত দোকানের মালিক নিজের পণ্য সম্পাদনা ও নতুন U Shop পণ্য যোগ করতে পারেন। অন্য বিভাগের নতুন আইটেমের জন্য প্রশাসনের সঙ্গে যোগাযোগ করুন।" en="Approved owners can edit their items and add U Shop products. Contact administration for new items in other divisions." />
      </p>
      <form key={revision} className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setPage(1);
        setFilters({ q: String(data.get("q") || ""), state: String(data.get("state") || "") });
      }}>
        <label className="field"><Text bn="নাম, SKU বা বারকোড দিয়ে খুঁজুন" en="Search by name, SKU or barcode" /><input name="q" maxLength={180} /></label>
        <label className="field"><Text bn="পণ্যের অবস্থা" en="Product status" /><select name="state"><option value=""><Text bn="সব পণ্য" en="All products" /></option><option value="active"><Text bn="সক্রিয়" en="Active" /></option><option value="draft"><Text bn="খসড়া / নিষ্ক্রিয়" en="Draft / inactive" /></option></select></label>
        <button className="button" disabled={loading}><Text bn="পণ্য খুঁজুন" en="Find products" /></button>
      </form>
      {error && (
        <p className="error">
          <UiText text={error} />
        </p>
      )}
      {loading && (
        <p role="status">
          <UiText text={"তালিকা লোড হচ্ছে / Loading catalog…"} />
        </p>
      )}
      {!loading && !items.length && (
        <p>
          <Text bn="এই তালিকায় কোনো পণ্য পাওয়া যায়নি। প্রয়োজন হলে খোঁজার লেখা বা অবস্থার ফিল্টার বদলান।" en="No products found in this list. Try changing the search or status filter." />
        </p>
      )}
      {items.map((item) => (
        <div key={item.id} className="record">
          <h3>
            {item.name} · {item.merchant}
          </h3>
          <form className="form-grid" onSubmit={(e) => update(e, item.id)}>
            <label className="field">
              <UiText text={"English name"} />
              <input name="name" defaultValue={item.name} required />
            </label>
            <label className="field">
              <UiText text={"বাংলা নাম"} />
              <input name="name_bn" defaultValue={item.name_bn} required />
            </label>
            <label className="field">
              <UiText text={"Price (BDT)"} />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item.price}
                required
              />
            </label>
            <div>
              <button className="button" disabled={busy}>
                <UiText text={"Save details"} />
              </button>
            </div>
          </form>
          <p>
            <UiText text={"Available stock:"} />
            {item.stock}
          </p>
          {item.division_slug === "shop" && (
            <ShopProductEditor id={item.id} onChanged={() => void load()} />
          )}
          <form
            className="form-grid"
            onSubmit={(e) => update(e, item.id, true)}
          >
            <label className="field">
              <UiText text={"Stock adjustment (+ / −)"} />
              <input
                name="delta"
                type="number"
                min="-100000"
                max="100000"
                required
              />
            </label>
            {!!item.variants?.length && (
              <label className="field">
                <UiText text={"Variant / ভ্যারিয়েন্ট"} />
                <select name="variant_id" required defaultValue="">
                  <option value="" disabled>
                    <UiText text={"Choose a variant / ভ্যারিয়েন্ট বাছুন"} />
                  </option>
                  {item.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label} · {variant.stock}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <UiText text={"Reason"} />
              <input name="reason" required maxLength={100} />
            </label>
            <button className="button secondary" disabled={busy}>
              <UiText text={"Record adjustment"} />
            </button>
          </form>
          {["services", "electrician", "mechanic"].includes(
            item.division_slug,
          ) && (
            <ScheduleEditor
              endpoint={`partner-offerings/${item.id}/service_schedule/`}
            />
          )}
          {item.division_slug === "food" && <FoodOptionEditor id={item.id} />}
        </div>
      ))}
      <nav className="search-row" aria-label="Partner catalog pages">
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          <UiText text={"আগের পৃষ্ঠা / Previous page"} />
        </button>
        <span>
          <UiText text={"পৃষ্ঠা / Page"} />
          {page}
        </span>
        <button
          type="button"
          disabled={loading || busy || !next}
          onClick={() => setPage((value) => value + 1)}
        >
          <UiText text={"পরের পৃষ্ঠা / Next page"} />
        </button>
      </nav>
    </>
  );
}
