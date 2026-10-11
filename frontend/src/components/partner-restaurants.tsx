"use client";
import { UiText } from "@/components/ui-text";

import { FormEvent, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { Text } from "./provider";
import { Restaurant, RestaurantInfo, weekdays } from "./restaurant-info";

function RestaurantSettings({ restaurant }: { restaurant: Restaurant }) {
  const [hours, setHours] = useState(restaurant.weekly_hours);
  const [configured, setConfigured] = useState(Object.keys(hours).length > 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(restaurant);
  const isAllDay = (day: number) =>
    (hours[String(day)] || []).some(
      (slot) => slot.open === "00:00" && slot.close === "24:00",
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await api<Restaurant>(
        `partner-restaurants/${restaurant.id}/`,
        "PATCH",
        {
          accepting_orders: data.has("accepting_orders"),
          minimum_order: data.get("minimum_order"),
          preparation_minutes: Number(data.get("preparation_minutes")),
          weekly_hours: configured
            ? Object.fromEntries(
                weekdays.map((_, day) => [
                  String(day),
                  hours[String(day)] || [],
                ]),
              )
            : {},
        },
      );
      setSaved(result);
      setMessage("সেটিংস সংরক্ষিত হয়েছে / Settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="record">
      <h3>{restaurant.name}</h3>
      <RestaurantInfo restaurant={saved} />
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="check-row">
            <input
              name="accepting_orders"
              type="checkbox"
              defaultChecked={restaurant.accepting_orders}
            />
            <Text bn="নতুন অর্ডার নিন" en="Accept new orders" />
          </label>
          <div className="form-grid">
            <label className="field">
              <Text
                bn="খাবারের ন্যূনতম অর্ডার (৳)"
                en="Minimum food subtotal (BDT)"
              />
              <input
                name="minimum_order"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={restaurant.minimum_order}
              />
            </label>
            <label className="field">
              <Text
                bn="প্রস্তুতির সময় (মিনিট)"
                en="Preparation time (minutes)"
              />
              <input
                name="preparation_minutes"
                type="number"
                min="1"
                max="360"
                required
                defaultValue={restaurant.preparation_minutes}
              />
            </label>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={configured}
              onChange={(e) => setConfigured(e.target.checked)}
            />
            <Text
              bn="সাপ্তাহিক সময়সূচি ব্যবহার করুন"
              en="Use weekly opening hours"
            />
          </label>
          <p className="subtle">
            <Text
              bn="বাংলাদেশ সময়। সময়সূচি চালু থাকলে সময় না দেওয়া দিনগুলো বন্ধ থাকবে। রাত পেরিয়ে খোলা থাকলে বন্ধের সময় পরের দিনের হবে।"
              en="Bangladesh time. Days without periods are closed when scheduling is enabled. Closing before opening means overnight into the following day."
            />
          </p>
          {configured &&
            weekdays.map(([bn, en], day) => (
              <fieldset key={en} className="field-group">
                <legend>
                  <Text bn={bn} en={en} />
                </legend>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={isAllDay(day)}
                    onChange={(e) =>
                      setHours((current) => ({
                        ...current,
                        [String(day)]: e.target.checked
                          ? [{ open: "00:00", close: "24:00" }]
                          : [],
                      }))
                    }
                  />
                  <Text bn="২৪ ঘণ্টা খোলা" en="Open all day" />
                </label>
                {!(hours[String(day)] || []).length && (
                  <p>
                    <Text bn="বন্ধ" en="Closed" />
                  </p>
                )}
                {!isAllDay(day) &&
                  (hours[String(day)] || []).map((slot, index) => (
                    <div className="form-grid" key={index}>
                      {(["open", "close"] as const).map((key) => (
                        <label className="field" key={key}>
                          <Text
                            bn={key === "open" ? "খোলার সময়" : "বন্ধের সময়"}
                            en={
                              key === "open" ? "Opening time" : "Closing time"
                            }
                          />
                          <input
                            type="time"
                            required
                            value={slot[key] === "24:00" ? "00:00" : slot[key]}
                            onChange={(e) =>
                              setHours((current) => ({
                                ...current,
                                [String(day)]: current[String(day)].map(
                                  (entry, i) =>
                                    i === index
                                      ? { ...entry, [key]: e.target.value }
                                      : entry,
                                ),
                              }))
                            }
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          setHours((current) => ({
                            ...current,
                            [String(day)]: current[String(day)].filter(
                              (_, i) => i !== index,
                            ),
                          }))
                        }
                      >
                        <Text bn="সময় সরান" en="Remove period" />
                      </button>
                    </div>
                  ))}
                <button
                  type="button"
                  className="button secondary"
                  disabled={
                    isAllDay(day) || (hours[String(day)] || []).length >= 8
                  }
                  onClick={() =>
                    setHours((current) => ({
                      ...current,
                      [String(day)]: [
                        ...(current[String(day)] || []),
                        { open: "09:00", close: "22:00" },
                      ],
                    }))
                  }
                >
                  <Text bn="খোলার সময় যোগ করুন" en="Add opening period" />
                </button>
              </fieldset>
            ))}
          <button className="button">
            <Text
              bn="রেস্টুরেন্ট সেটিংস সংরক্ষণ"
              en="Save restaurant settings"
            />
          </button>
        </fieldset>
      </form>
      {message && (
        <p role="status">
          <UiText text={message} />
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          <UiText text={error} />
        </p>
      )}
    </article>
  );
}

export function PartnerRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<PageResult<Restaurant>>(`partner-restaurants/?page=${page}`)
      .then((result) => {
        if (active) {
          setRestaurants(result.results);
          setNext(!!result.next);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);
  if (error)
    return (
      <p className="error" role="alert">
        <UiText text={error} />
      </p>
    );
  if (loading)
    return (
      <p role="status">
        <Text bn="রেস্টুরেন্ট লোড হচ্ছে…" en="Loading restaurants…" />
      </p>
    );
  if (!restaurants.length) return null;
  return (
    <section>
      <h2>
        <Text bn="রেস্টুরেন্ট পরিচালনা" en="Restaurant operations" />
      </h2>
      {restaurants.map((restaurant) => (
        <RestaurantSettings key={restaurant.id} restaurant={restaurant} />
      ))}
      <div className="record-actions">
        {page > 1 && (
          <button
            className="button secondary"
            onClick={() => setPage(page - 1)}
          >
            <Text bn="আগের পৃষ্ঠা" en="Previous" />
          </button>
        )}
        {next && (
          <button
            className="button secondary"
            onClick={() => setPage(page + 1)}
          >
            <Text bn="পরের পৃষ্ঠা" en="Next" />
          </button>
        )}
      </div>
    </section>
  );
}
