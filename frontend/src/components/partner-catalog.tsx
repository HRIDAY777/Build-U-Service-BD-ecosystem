"use client";
import { UiText } from "@/components/ui-text";

import { useEffect, useState, FormEvent } from "react";
import { api, Offering, PageResult } from "@/lib/api";
import { PartnerRestaurants } from "./partner-restaurants";
export function PartnerCatalog() {
  const [items, setItems] = useState<Offering[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setItems((await api<PageResult<Offering>>("partner-offerings/")).results);
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    load();
  }, []);
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
      {error && <p className="error">{error}</p>}
      {!items.length && (
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
              বাংলা নাম
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
            <label className="field">
              <UiText text={"Reason"} />
              <input name="reason" required maxLength={100} />
            </label>
            <button className="button secondary" disabled={busy}>
              <UiText text={"Record adjustment"} />
            </button>
          </form>
        </div>
      ))}
    </>
  );
}
