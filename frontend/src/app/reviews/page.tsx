"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp, Text } from "@/components/provider";

type Review = {
  id: number;
  order: string | null;
  booking: string | null;
  rating: number;
  comment: string;
  created_at: string;
};
type Purchase = { id: string; label: string; created_at: string };

export default function ReviewsPage() {
  const { user, toast } = useApp();
  const [reviews, setReviews] = useState<PageResult<Review> | null>(null);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("order");
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchases, setPurchases] = useState<PageResult<Purchase> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [history, eligible] = await Promise.all([
        api<PageResult<Review>>(`reviews/?page=${page}`),
        api<PageResult<Purchase>>(
          `reviews/eligible_purchases/?kind=${kind}&page=${purchasePage}`,
        ),
      ]);
      setReviews(history);
      setPurchases(eligible);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load reviews");
    } finally {
      setLoading(false);
    }
  }, [user, page, kind, purchasePage]);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api("reviews/", "POST", {
        [kind]: String(data.get("reference")).trim(),
        rating: Number(data.get("rating")),
        comment: data.get("comment"),
      });
      form.reset();
      toast("Review submitted / রিভিউ জমা হয়েছে");
      if (page !== 1 || purchasePage !== 1) {
        setPage(1);
        setPurchasePage(1);
      } else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit review");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>
          <UiText text={"Reviews"} />
        </h1>
        <Link className="button" href="/login">
          <UiText text={"Sign in"} />
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>
        <Text bn="আপনার রিভিউ" en="Your reviews" />
      </h1>
      <p>
        <UiText
          text={
            "Review your delivered orders or completed service bookings. Each purchase can receive one review."
          }
        />
      </p>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      <form className="form-panel" onSubmit={submit}>
        <label className="field">
          <UiText text={"Purchase type"} />
          <select
            name="kind"
            value={kind}
            disabled={busy || loading}
            onChange={(e) => {
              setKind(e.target.value);
              setPurchasePage(1);
            }}
          >
            <option value="order">
              <UiText text={"Delivered order"} />
            </option>
            <option value="booking">
              <UiText text={"Completed service booking"} />
            </option>
          </select>
        </label>
        <label className="field">
          <Text
            bn="সম্পন্ন অর্ডার বা বুকিং বেছে নিন"
            en="Select completed purchase"
          />
          <select
            key={`${kind}-${purchasePage}`}
            name="reference"
            required
            defaultValue=""
            disabled={busy || loading}
          >
            <option value="">
              <UiText text={"Select purchase"} />
            </option>
            {purchases?.results.map((purchase) => (
              <option key={purchase.id} value={purchase.id}>
                {purchase.label} ·{" "}
                {new Date(purchase.created_at).toLocaleDateString()} ·{" "}
                {purchase.id.slice(0, 8)}
              </option>
            ))}
          </select>
          {!loading && !purchases?.results.length && (
            <span>
              <UiText text={"No purchases awaiting a review on this page."} />
            </span>
          )}
        </label>
        <div className="record-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy || loading || purchasePage === 1}
            onClick={() => setPurchasePage(purchasePage - 1)}
          >
            <UiText text={"Previous purchases"} />
          </button>
          <span>
            <UiText text={"Page"} />
            {purchasePage}
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={busy || loading || !purchases?.next}
            onClick={() => setPurchasePage(purchasePage + 1)}
          >
            <UiText text={"Older purchases"} />
          </button>
        </div>
        <label className="field">
          <UiText text={"Rating"} />
          <select name="rating" defaultValue="5">
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} / 5
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <UiText text={"Your experience"} />
          <textarea name="comment" required maxLength={2000} />
        </label>
        <button
          className="button"
          disabled={busy || loading || !purchases?.results.length}
        >
          {busy ? (
            <UiText text={"Submitting…"} />
          ) : (
            <UiText text={"Submit review"} />
          )}
        </button>
      </form>
      <h2>
        <UiText text={"Review history"} />
      </h2>
      {loading ? (
        <p>
          <UiText text={"Loading…"} />
        </p>
      ) : (
        !reviews?.results.length && (
          <p>
            <UiText text={"No reviews on this page."} />
          </p>
        )
      )}
      {reviews?.results.map((review) => (
        <article className="record" key={review.id}>
          <strong>{review.rating} / 5</strong>
          <p>{review.comment}</p>
          <p>{review.order || review.booking}</p>
          <p>{new Date(review.created_at).toLocaleString()}</p>
        </article>
      ))}
      <div className="record-actions">
        <button
          className="button secondary"
          disabled={busy || loading || page === 1}
          onClick={() => setPage(page - 1)}
        >
          <UiText text={"Previous"} />
        </button>
        <button
          className="button secondary"
          disabled={busy || loading || !reviews?.next}
          onClick={() => setPage(page + 1)}
        >
          <UiText text={"Next"} />
        </button>
      </div>
    </div>
  );
}
