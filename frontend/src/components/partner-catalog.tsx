"use client";
import { UiText } from "@/components/ui-text";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { api, Offering, PageResult } from "@/lib/api";
import { ScheduleEditor } from "./schedule-editor";
import { FoodOptionEditor } from "./food-option-editor";
import { PartnerRestaurants } from "./partner-restaurants";
import { ShopProductEditor } from "./shop-product-editor";
export function PartnerCatalog() {
  const [items, setItems] = useState<Offering[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<PageResult<Offering>>(
        `partner-offerings/?page=${page}`,
      );
      setItems(result.results);
      setNext(!!result.next);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
  }, [load]);
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
      <h2>
        <UiText text={"Your catalog & inventory"} />
      </h2>
      <p className="subtle">
        <UiText
          text={
            "Approved organization owners can update their own items. Contact administration to onboard a merchant or add a new catalog item."
          }
        />
      </p>
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
          <UiText text={"No catalog items are assigned to your business."} />
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
