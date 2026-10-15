"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";

type Option = {
  id: number;
  name: string;
  name_bn: string;
  parent?: number | null;
};

type ShopDetails = {
  id: number;
  category: number | null;
  brand: number | null;
  collections: number[];
  barcode: string;
  name: string;
  name_bn: string;
  description: string;
  description_bn: string;
  price: string;
  sale_price: string | null;
  cost_price: string | null;
  image: string;
  active: boolean;
};

type Variant = {
  id?: number;
  localId: string;
  label: string;
  attributes: Record<string, string | number | boolean>;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  price: string;
  sale_price: string | null;
  cost_price: string | null;
  stock: number;
  active: boolean;
};

type Media = {
  id?: number;
  localId: string;
  kind: "image" | "video";
  url: string;
  alt: string;
  alt_bn: string;
  position: number;
  active: boolean;
};

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function editableVariant(row: Omit<Variant, "localId" | "size" | "color">): Variant {
  return {
    ...row,
    localId: localId("variant"),
    size: String(row.attributes?.size || ""),
    color: String(row.attributes?.color || ""),
  };
}

function editableMedia(row: Omit<Media, "localId">): Media {
  return { ...row, localId: localId("media") };
}

export function ShopProductEditor({
  id,
  onChanged,
}: {
  id: number;
  onChanged?: () => void;
}) {
  const { lang } = useApp();
  const [details, setDetails] = useState<ShopDetails | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [collections, setCollections] = useState<Option[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const orderedCategories = useMemo(() => {
    const parents = categories.filter((category) => category.parent == null);
    const parentIds = new Set(parents.map((category) => category.id));
    return [
      ...parents.flatMap((parent) => [
        parent,
        ...categories.filter((category) => category.parent === parent.id),
      ]),
      ...categories.filter(
        (category) =>
          category.parent != null && !parentIds.has(category.parent),
      ),
    ];
  }, [categories]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [detail, categoryRows, brandRows, collectionRows, variantRows, mediaRows] =
        await Promise.all([
          api<ShopDetails>(`partner-offerings/${id}/shop-details/`),
          api<Option[]>("categories/?division=shop"),
          api<Option[]>("shop-brands/"),
          api<Option[]>("shop-collections/"),
          api<Omit<Variant, "localId" | "size" | "color">[]>(
            `partner-offerings/${id}/shop-variants/`,
          ),
          api<Omit<Media, "localId">[]>(
            `partner-offerings/${id}/shop-media/`,
          ),
        ]);
      setDetails(detail);
      setCategories(categoryRows);
      setBrands(brandRows);
      setCollections(collectionRows);
      setVariants(variantRows.map(editableVariant));
      setMedia(mediaRows.map(editableMedia));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load product settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // The product id is the only load boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<ShopDetails>(
        `partner-offerings/${id}/shop-details/`,
        "PATCH",
        {
          category: form.get("category") ? Number(form.get("category")) : null,
          brand: form.get("brand") ? Number(form.get("brand")) : null,
          collections: form.getAll("collections").map(Number),
          barcode: String(form.get("barcode") || ""),
          name: String(form.get("name") || ""),
          name_bn: String(form.get("name_bn") || ""),
          description: String(form.get("description") || ""),
          description_bn: String(form.get("description_bn") || ""),
          price: String(form.get("price") || "0"),
          sale_price: form.get("sale_price") || null,
          cost_price: form.get("cost_price") || null,
          image: String(form.get("image") || ""),
          active: form.get("active") === "on",
        },
      );
      setDetails(result);
      onChanged?.();
      setMessage(lang === "bn" ? "পণ্যের তথ্য সংরক্ষিত হয়েছে।" : "Product details saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save product");
    } finally {
      setBusy(false);
    }
  }

  async function saveVariants() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<Omit<Variant, "localId" | "size" | "color">[]>(
        `partner-offerings/${id}/shop-variants/`,
        "PUT",
        variants.map((variant) => {
          const attributes = { ...variant.attributes };
          if (variant.size) attributes.size = variant.size;
          else delete attributes.size;
          if (variant.color) attributes.color = variant.color;
          else delete attributes.color;
          return {
            ...(variant.id ? { id: variant.id } : {}),
            label: variant.label,
            attributes,
            sku: variant.sku,
            barcode: variant.barcode,
            price: variant.price,
            sale_price: variant.sale_price,
            cost_price: variant.cost_price,
            stock: variant.stock,
            active: variant.active,
          };
        }),
      );
      setVariants(result.map(editableVariant));
      onChanged?.();
      setMessage(lang === "bn" ? "ভ্যারিয়েন্ট সংরক্ষিত হয়েছে।" : "Variants saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save variants");
    } finally {
      setBusy(false);
    }
  }

  async function saveMedia() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<Omit<Media, "localId">[]>(
        `partner-offerings/${id}/shop-media/`,
        "PUT",
        media.map((entry) => ({
          ...(entry.id ? { id: entry.id } : {}),
          kind: entry.kind,
          url: entry.url,
          alt: entry.alt,
          alt_bn: entry.alt_bn,
          position: entry.position,
          active: entry.active,
        })),
      );
      setMedia(result.map(editableMedia));
      setMessage(lang === "bn" ? "ছবি ও ভিডিও সংরক্ষিত হয়েছে।" : "Media saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save media");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p role="status">
        <Text bn="পণ্যের সেটিংস লোড হচ্ছে…" en="Loading product settings…" />
      </p>
    );
  }
  if (!details) {
    return error ? <p className="error">{error}</p> : null;
  }

  return (
    <details className="shop-partner-editor">
      <summary>
        <Text bn="U Shop পণ্য পরিচালনা" en="Manage U Shop product" />
      </summary>
      {error && <p className="error">{error}</p>}
      {message && <p className="success" role="status">{message}</p>}

      <form className="form-grid shop-product-details" onSubmit={saveDetails}>
        <h4><Text bn="পণ্যের তথ্য" en="Product details" /></h4>
        <label className="field">
          <Text bn="ইংরেজি নাম" en="English name" />
          <input name="name" defaultValue={details.name} required maxLength={180} />
        </label>
        <label className="field">
          <Text bn="বাংলা নাম" en="Bangla name" />
          <input name="name_bn" defaultValue={details.name_bn} required maxLength={180} />
        </label>
        <label className="field">
          <Text bn="ক্যাটাগরি ও সাবক্যাটাগরি" en="Category and subcategory" />
          <select name="category" defaultValue={details.category || ""}>
            <option value=""><Text bn="ক্যাটাগরি নেই" en="No category" /></option>
            {orderedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parent ? "— " : ""}
                {lang === "bn" ? category.name_bn || category.name : category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <Text bn="ব্র্যান্ড" en="Brand" />
          <select name="brand" defaultValue={details.brand || ""}>
            <option value=""><Text bn="ব্র্যান্ড নেই" en="No brand" /></option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {lang === "bn" ? brand.name_bn || brand.name : brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <Text bn="বারকোড" en="Barcode" />
          <input name="barcode" defaultValue={details.barcode} maxLength={80} />
        </label>
        <label className="field">
          <Text bn="নিয়মিত দাম (৳)" en="Regular price (৳)" />
          <input name="price" type="number" min="0" step="0.01" defaultValue={details.price} required />
        </label>
        <label className="field">
          <Text bn="বিক্রয় মূল্য (৳)" en="Sale price (৳)" />
          <input name="sale_price" type="number" min="0" step="0.01" defaultValue={details.sale_price || ""} />
        </label>
        <label className="field">
          <Text bn="ক্রয়মূল্য (৳)" en="Cost price (৳)" />
          <input name="cost_price" type="number" min="0" step="0.01" defaultValue={details.cost_price || ""} />
        </label>
        <label className="field field-wide">
          <Text bn="ইংরেজি বিবরণ" en="English description" />
          <textarea name="description" defaultValue={details.description} required maxLength={5000} />
        </label>
        <label className="field field-wide">
          <Text bn="বাংলা বিবরণ" en="Bangla description" />
          <textarea name="description_bn" defaultValue={details.description_bn} maxLength={5000} />
        </label>
        <label className="field field-wide">
          <Text bn="প্রধান ছবির HTTPS বা /images/ ঠিকানা" en="Primary image HTTPS or /images/ path" />
          <input name="image" defaultValue={details.image} maxLength={1000} />
        </label>
        <fieldset className="field field-wide collection-picker">
          <legend><Text bn="কালেকশন" en="Collections" /></legend>
          {collections.map((collection) => (
            <label key={collection.id}>
              <input type="checkbox" name="collections" value={collection.id} defaultChecked={details.collections.includes(collection.id)} />{" "}
              {lang === "bn" ? collection.name_bn || collection.name : collection.name}
            </label>
          ))}
        </fieldset>
        <label className="field-wide">
          <input type="checkbox" name="active" defaultChecked={details.active} />{" "}
          <Text bn="ক্রেতাদের জন্য সক্রিয়" en="Active for customers" />
        </label>
        <button className="button" disabled={busy}>
          <Text bn="পণ্যের তথ্য সংরক্ষণ" en="Save product details" />
        </button>
      </form>

      <section className="shop-editor-section">
        <div className="shop-editor-heading">
          <div>
            <h4><Text bn="মাপ, রঙ ও ভ্যারিয়েন্ট" en="Size, color and variants" /></h4>
            <p><Text bn="ভ্যারিয়েন্ট থাকলে প্রতিটির নিজস্ব SKU, বারকোড, দাম ও স্টক দিন।" en="Give each variant its own SKU, barcode, price and stock." /></p>
          </div>
          <button type="button" className="button secondary" disabled={busy || variants.filter((row) => row.active).length >= 50 || variants.filter((row) => !row.id).length >= 50} onClick={() => setVariants((rows) => [...rows, editableVariant({ label: "", attributes: {}, sku: "", barcode: "", price: details.price, sale_price: null, cost_price: null, stock: 0, active: true })])}>
            <Text bn="ভ্যারিয়েন্ট যোগ করুন" en="Add variant" />
          </button>
        </div>
        {variants.map((variant, index) => (
          <div className="shop-editor-row" key={variant.localId}>
            <label className="field"><Text bn="লেবেল" en="Label" /><input value={variant.label} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} /></label>
            <label className="field"><Text bn="মাপ" en="Size" /><input value={variant.size} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, size: event.target.value } : row))} /></label>
            <label className="field"><Text bn="রঙ" en="Color" /><input value={variant.color} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, color: event.target.value } : row))} /></label>
            <label className="field"><Text bn="SKU" en="SKU" /><input value={variant.sku} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, sku: event.target.value } : row))} /></label>
            <label className="field"><Text bn="বারকোড" en="Barcode" /><input value={variant.barcode} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, barcode: event.target.value } : row))} /></label>
            <label className="field"><Text bn="দাম" en="Price" /><input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, price: event.target.value } : row))} /></label>
            <label className="field"><Text bn="বিক্রয় মূল্য" en="Sale price" /><input type="number" min="0" step="0.01" value={variant.sale_price || ""} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, sale_price: event.target.value || null } : row))} /></label>
            <label className="field"><Text bn="ক্রয়মূল্য" en="Cost price" /><input type="number" min="0" step="0.01" value={variant.cost_price || ""} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, cost_price: event.target.value || null } : row))} /></label>
            <label className="field"><Text bn="স্টক" en="Stock" /><input type="number" min="0" max="1000000" value={variant.stock} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, stock: Number(event.target.value) } : row))} /></label>
            <label><input type="checkbox" checked={variant.active} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, active: event.target.checked } : row))} />{" "}<Text bn="সক্রিয়" en="Active" /></label>
            <button type="button" className="text-link danger" onClick={() => setVariants((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Text bn="বাদ দিন" en="Remove" /></button>
          </div>
        ))}
        <button type="button" className="button" disabled={busy} onClick={() => void saveVariants()}><Text bn="সব ভ্যারিয়েন্ট সংরক্ষণ" en="Save all variants" /></button>
      </section>

      <section className="shop-editor-section">
        <div className="shop-editor-heading">
          <div>
            <h4><Text bn="পণ্যের ছবি ও ভিডিও" en="Product images and video" /></h4>
            <p><Text bn="সর্বোচ্চ ১২টি HTTPS, /images/ বা /videos/ ঠিকানা দিন।" en="Add up to 12 HTTPS, /images/ or /videos/ paths." /></p>
          </div>
          <button type="button" className="button secondary" disabled={busy || media.length >= 12} onClick={() => setMedia((rows) => [...rows, editableMedia({ kind: "image", url: "", alt: "", alt_bn: "", position: rows.length, active: true })])}>
            <Text bn="মিডিয়া যোগ করুন" en="Add media" />
          </button>
        </div>
        {media.map((entry, index) => (
          <div className="shop-editor-row shop-media-row" key={entry.localId}>
            <label className="field"><Text bn="ধরন" en="Type" /><select value={entry.kind} onChange={(event) => setMedia((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, kind: event.target.value as Media["kind"] } : row))}><option value="image"><Text bn="ছবি" en="Image" /></option><option value="video"><Text bn="ভিডিও" en="Video" /></option></select></label>
            <label className="field field-wide"><Text bn="ঠিকানা" en="URL or path" /><input value={entry.url} onChange={(event) => setMedia((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, url: event.target.value } : row))} /></label>
            <label className="field"><Text bn="ইংরেজি বিকল্প লেখা" en="English alt text" /><input value={entry.alt} onChange={(event) => setMedia((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, alt: event.target.value } : row))} /></label>
            <label className="field"><Text bn="বাংলা বিকল্প লেখা" en="Bangla alt text" /><input value={entry.alt_bn} onChange={(event) => setMedia((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, alt_bn: event.target.value } : row))} /></label>
            <label className="field"><Text bn="ক্রম" en="Order" /><input type="number" min="0" max="32767" value={entry.position} onChange={(event) => setMedia((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, position: Number(event.target.value) } : row))} /></label>
            <label><input type="checkbox" checked={entry.active} onChange={(event) => setMedia((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, active: event.target.checked } : row))} />{" "}<Text bn="সক্রিয়" en="Active" /></label>
            <button type="button" className="text-link danger" onClick={() => setMedia((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Text bn="বাদ দিন" en="Remove" /></button>
          </div>
        ))}
        <button type="button" className="button" disabled={busy} onClick={() => void saveMedia()}><Text bn="ছবি ও ভিডিও সংরক্ষণ" en="Save images and video" /></button>
      </section>
    </details>
  );
}
