"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";
import { ShopProductEditor } from "./shop-product-editor";

export function ShopProductCreate() {
  const { lang } = useApp();
  const [shops, setShops] = useState<{ id: number; name: string }[]>([]);
  const [created, setCreated] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    api<{ id: number; name: string }[]>("partner-offerings/new-shop-product/")
      .then((rows) => { if (current) setShops(rows); })
      .catch(() => { if (current) setError(lang === "bn" ? "দোকানের তালিকা লোড হয়নি। পেজটি আবার খুলুন।" : "Could not load shops. Reload this page."); });
    return () => { current = false; };
  }, [lang]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: number; name: string }>(
        "partner-offerings/new-shop-product/", "POST",
        Object.fromEntries(new FormData(form)),
      );
      setCreated(result);
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create product");
    } finally { setBusy(false); }
  }

  if (!shops.length) return error ? <p className="error">{error}</p> : null;
  return <section className="record">
    <h3><Text bn="নতুন U Shop পণ্য" en="New U Shop product" /></h3>
    <p><Text bn="প্রথমে খসড়া তৈরি করুন। তারপর ছবি, দাম, ভ্যারিয়েন্ট ও স্টক ঠিক করে পণ্য সক্রিয় করুন।" en="Create a draft, then add images, pricing, variants and stock before activating it." /></p>
    {error && <p className="error" role="alert">{error}</p>}
    <form className="form-grid" onSubmit={create}>
      <label className="field"><Text bn="আপনার দোকান" en="Your shop" /><select name="organization" required>{shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></label>
      <label className="field"><Text bn="ইংরেজি নাম" en="English name" /><input name="name" required maxLength={180} /></label>
      <label className="field"><Text bn="বাংলা নাম" en="Bangla name" /><input name="name_bn" required maxLength={180} /></label>
      <label className="field"><Text bn="দাম (৳)" en="Price (৳)" /><input name="price" type="number" min="0" step="0.01" required /></label>
      <label className="field"><Text bn="প্রাথমিক স্টক" en="Initial stock" /><input name="stock" type="number" min="0" max="1000000" defaultValue={0} required /></label>
      <label className="field"><Text bn="ইংরেজি বিবরণ" en="English description" /><textarea name="description" required maxLength={5000} /></label>
      <label className="field"><Text bn="বাংলা বিবরণ" en="Bangla description" /><textarea name="description_bn" required maxLength={5000} /></label>
      <button className="button" disabled={busy}><Text bn={busy ? "তৈরি হচ্ছে…" : "খসড়া পণ্য তৈরি করুন"} en={busy ? "Creating…" : "Create draft product"} /></button>
    </form>
    {created && <div role="region" aria-label={lang === "bn" ? "নতুন পণ্য সম্পাদনা" : "Edit new product"}>
      <p role="status"><Text bn="খসড়া তৈরি হয়েছে:" en="Draft created:" /> {created.name}</p>
      <ShopProductEditor key={created.id} id={created.id} />
      <p><Text bn="স্টক সমন্বয়ের জন্য পেজটি আবার খুলে পণ্যটি তালিকায় দেখুন।" en="Reload the page to find this product in the catalog for stock adjustments." /></p>
    </div>}
  </section>;
}
