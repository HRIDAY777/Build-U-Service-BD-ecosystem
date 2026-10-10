"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, PageResult, Offering } from "@/lib/api";
import { useApp, Text } from "@/components/provider";
import { offeringPhoto } from "@/lib/photos";
import { Photo } from "@/components/photo";

type WishlistItem = {
  id: number;
  offering: number;
  offering_detail: Offering;
  price_alert: boolean;
  restock_alert: boolean;
};

export default function WishlistPage() {
  const { user, toast, add } = useApp();
  const [stored, setStored] = useState<{
    owner: number;
    items: WishlistItem[];
  } | null>(null);
  const items = stored?.owner === user?.id ? stored?.items || [] : [];
  const [share, setShare] = useState<{ owner: number; url: string } | null>(
    null,
  );
  const shareUrl = share?.owner === user?.id ? share?.url : "";
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("");
  const [sort, setSort] = useState("saved");
  const [busy, setBusy] = useState<number | null>(null);
  async function setAlert(
    item: WishlistItem,
    key: "price_alert" | "restock_alert",
  ) {
    setBusy(item.id);
    try {
      await api(`wishlist/${item.id}/`, "PATCH", { [key]: !item[key] });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update alert");
    } finally {
      setBusy(null);
    }
  }
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all: WishlistItem[] = [];
      let page = 1;
      while (true) {
        const result = await api<PageResult<WishlistItem>>(
          `wishlist/?page=${page}`,
        );
        all.push(...result.results);
        if (!result.next) break;
        page++;
      }
      setStored({ owner: user.id, items: all });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load wishlist");
    }
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <main className="page-wrap">
        <h1>
          <UiText text={"Wishlist"} />
        </h1>
        <p>
          <UiText text={"Sign in to save products and services."} />
        </p>
        <Link href="/login" className="button">
          <UiText text={"Sign in"} />
        </Link>
      </main>
    );
  }
  const visible = items
    .filter(({ offering_detail: o }) => {
      const text = `${o.name} ${o.name_bn} ${o.merchant}`.toLocaleLowerCase();
      return (
        text.includes(query.toLocaleLowerCase()) &&
        (!division || o.division_slug === division)
      );
    })
    .sort((a, b) =>
      sort === "price"
        ? Number(a.offering_detail.current_price ?? a.offering_detail.price) -
          Number(b.offering_detail.current_price ?? b.offering_detail.price)
        : sort === "name"
          ? a.offering_detail.name.localeCompare(b.offering_detail.name)
          : b.id - a.id,
    );
  return (
    <main className="page-wrap">
      <span className="eyebrow">
        <UiText text={"YOUR SAVED ITEMS"} />
      </span>
      <h1>
        <Text bn="পছন্দের তালিকা" en="Wishlist" />
      </h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="search-row">
        <button
          className="button secondary"
          disabled={sharing || !items.length}
          onClick={async () => {
            if (!user) return;
            setSharing(true);
            try {
              const result = await api<{ path: string }>(
                "wishlist/share/",
                "POST",
              );
              setShare({
                owner: user.id,
                url: `${window.location.origin}${result.path}`,
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন");
            } finally {
              setSharing(false);
            }
          }}
        >
          তালিকা শেয়ার করুন
        </button>
        <button
          className="button secondary"
          disabled={sharing}
          onClick={async () => {
            setSharing(true);
            try {
              await api("wishlist/share/", "DELETE");
              setShare(null);
              toast("শেয়ার লিংক বন্ধ হয়েছে");
            } catch (e) {
              setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন");
            } finally {
              setSharing(false);
            }
          }}
        >
          শেয়ার লিংক বন্ধ করুন
        </button>
      </div>
      {shareUrl && (
        <label className="field">
          এই লিংক যাকে দেবেন, তিনি তালিকার পণ্যগুলো দেখতে পারবেন।
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <a className="text-link" href={shareUrl}>
            শেয়ার পেজ দেখুন
          </a>
        </label>
      )}
      <p className="subtle">
        দাম কমা ও স্টক ফেরার খবর অ্যাকাউন্টের নোটিফিকেশনে দেখুন।{" "}
        <Link href="/account">অ্যাকাউন্ট খুলুন</Link>
      </p>
      <div className="wishlist-toolbar">
        <label className="field">
          <Text bn="তালিকায় খুঁজুন" en="Search saved items" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="পণ্য, সেবা বা দোকানের নাম"
          />
        </label>
        <label className="field">
          <Text bn="বিভাগ" en="Division" />
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="">সব বিভাগ</option>
            <option value="shop">
              <UiText text={"Shop"} />
            </option>
            <option value="food">
              <UiText text={"Food"} />
            </option>
            <option value="pharmacy">
              <UiText text={"Pharmacy"} />
            </option>
            <option value="services">
              <UiText text={"Services"} />
            </option>
            <option value="electrician">
              <UiText text={"Electrician"} />
            </option>
            <option value="mechanic">
              <UiText text={"Mechanic"} />
            </option>
          </select>
        </label>
        <label className="field">
          <Text bn="সাজান" en="Sort" />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="saved">সাম্প্রতিক সংরক্ষণ</option>
            <option value="name">নাম</option>
            <option value="price">কম দাম আগে</option>
          </select>
        </label>
      </div>
      {stored?.owner !== user.id && !error && (
        <p role="status">তালিকা লোড হচ্ছে…</p>
      )}
      {stored?.owner === user.id && !items.length && (
        <div className="empty wishlist-empty">
          <h2>আপনার পছন্দের তালিকা এখনও খালি</h2>
          <p>
            ক্যাটালগে হৃদয় চিহ্নে ক্লিক করে পণ্য বা সেবা এখানে সংরক্ষণ করুন।
          </p>
          <Link href="/catalog" className="button">
            ক্যাটালগ দেখুন
          </Link>
        </div>
      )}
      {items.length > 0 && !visible.length && (
        <p className="subtle">এই ফিল্টারে কোনো সংরক্ষিত আইটেম পাওয়া যায়নি।</p>
      )}
      <div className="offering-grid">
        {visible.map((item) => (
          <article className="record wishlist-record" key={item.id}>
            {offeringPhoto(item.offering_detail) && (
              <Photo
                src={offeringPhoto(item.offering_detail)}
                alt={item.offering_detail.name}
              />
            )}
            <h3>{item.offering_detail.name}</h3>
            <p>
              {item.offering_detail.merchant} · ৳
              {Number(
                item.offering_detail.current_price ??
                  item.offering_detail.price,
              ).toLocaleString()}{" "}
              ·{" "}
              {["electrician", "mechanic", "services"].includes(
                item.offering_detail.division_slug,
              )
                ? "সেবা বুকিং"
                : item.offering_detail.stock
                  ? "স্টকে আছে"
                  : "স্টক শেষ"}
            </p>
            <div className="wishlist-alerts">
              <label>
                <input
                  type="checkbox"
                  checked={item.price_alert}
                  disabled={busy === item.id}
                  onChange={() => void setAlert(item, "price_alert")}
                />{" "}
                দাম কমলে জানাবেন
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.restock_alert}
                  disabled={busy === item.id}
                  onChange={() => void setAlert(item, "restock_alert")}
                />{" "}
                স্টক এলে জানাবেন
              </label>
            </div>
            <Link
              className="button secondary"
              href={`/catalog/${item.offering_detail.id}`}
            >
              <UiText text={"View item"} />
            </Link>{" "}
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/catalog/${item.offering_detail.id}`,
                  );
                  toast("শেয়ার লিংক কপি হয়েছে / Link copied");
                } catch {
                  setError(
                    "লিংক কপি করা যায়নি। বিস্তারিত পেজ খুলে ঠিকানাটি কপি করুন।",
                  );
                }
              }}
            >
              শেয়ার
            </button>{" "}
            {item.offering_detail.variants?.length || item.offering_detail.food_option_groups?.length ? (
              <Link
                className="button"
                href={`/catalog/${item.offering_detail.id}`}
              >
                সাইজ / অপশন বাছুন
              </Link>
            ) : (
              !["electrician", "mechanic", "services"].includes(
                item.offering_detail.division_slug,
              ) && (
                <button
                  className="button"
                  disabled={!item.offering_detail.stock}
                  onClick={() => {
                    add(item.offering_detail);
                  }}
                >
                  ব্যাগে যোগ করুন
                </button>
              )
            )}{" "}
            <button
              className="button secondary"
              disabled={busy === item.id}
              onClick={async () => {
                setBusy(item.id);
                try {
                  await api(`wishlist/${item.id}/`, "DELETE");
                  toast("Removed / সরানো হয়েছে");
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to remove");
                } finally {
                  setBusy(null);
                }
              }}
            >
              <UiText text={"Remove"} />
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
