"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { useCallback, useEffect, useState, FormEvent } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "@/components/provider";

type ReturnItem = {
  id: number;
  order: string;
  reason: string;
  status: string;
  review_note: string;
};
const next: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved: ["received"],
  received: ["closed"],
};

export default function ReturnsPage() {
  const { user, toast } = useApp();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [orders, setOrders] = useState<{ id: string; total: string }[]>([]);
  const [page, setPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasMoreOrders, setHasMoreOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [returns, purchases] = await Promise.all([
        api<PageResult<ReturnItem>>(`returns/?page=${page}`),
        api<PageResult<{ id: string; total: string }>>(
          `returns/eligible_orders/?page=${orderPage}`,
        ),
      ]);
      setItems(returns.results);
      setHasNext(Boolean(returns.next));
      setOrders(purchases.results);
      setHasMoreOrders(Boolean(purchases.next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load returns");
    } finally {
      setLoading(false);
    }
  }, [user, page, orderPage]);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api("returns/", "POST", Object.fromEntries(new FormData(form)));
      form.reset();
      if (page !== 1 || orderPage !== 1) {
        setPage(1);
        setOrderPage(1);
      } else await load();
      toast("Return request submitted / ফেরতের অনুরোধ পাঠানো হয়েছে");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit return");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>Returns / পণ্য ফেরত</h1>
        <Link className="button" href="/login">
          <UiText text={"Sign in"} />
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>Returns / পণ্য ফেরত</h1>
      <p>
        <UiText
          text={
            "Request review of a delivered shop order. Approval does not issue a refund automatically; the team will arrange the next steps."
          }
        />
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="form-panel" onSubmit={submit}>
        <label className="field">
          <UiText text={"Delivered shop order"} />
          <select
            key={orderPage}
            name="order"
            required
            defaultValue=""
            disabled={busy || loading}
          >
            <option value="">
              <UiText text={"Select order"} />
            </option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id} · ৳{order.total}
              </option>
            ))}
          </select>
        </label>
        <div className="record-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy || loading || orderPage === 1}
            onClick={() => setOrderPage(orderPage - 1)}
          >
            <UiText text={"Previous orders"} />
          </button>
          <span>
            <UiText text={"Order page"} />
            {orderPage}
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={busy || loading || !hasMoreOrders}
            onClick={() => setOrderPage(orderPage + 1)}
          >
            <UiText text={"Older orders"} />
          </button>
        </div>
        <label className="field">
          Reason / কারণ
          <textarea name="reason" required maxLength={2000} />
        </label>
        <button className="button" disabled={busy || loading || !orders.length}>
          <UiText text={"Request return"} />
        </button>
      </form>
      <h2>
        <UiText text={"Return requests"} />
      </h2>
      {loading ? (
        <p>
          <UiText text={"Loading…"} />
        </p>
      ) : (
        !items.length && (
          <p>
            <UiText text={"No return requests on this page."} />
          </p>
        )
      )}
      {items.map((item) => (
        <article className="record" key={item.id}>
          <h3>
            <UiText text={"Order"} />
            {item.order}
          </h3>
          <span className="status">{item.status}</span>
          <p>{item.reason}</p>
          {item.review_note && <p>{item.review_note}</p>}
          {user.is_staff && (next[item.status] || []).length > 0 && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                setBusy(true);
                setError("");
                try {
                  await api(`returns/${item.id}/transition/`, "POST", data);
                  await load();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to update return",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                <UiText text={"Next status"} />
                <select name="status">
                  {next[item.status].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <UiText text={"Note for customer"} />
                <textarea name="review_note" maxLength={2000} />
              </label>
              <button className="button secondary" disabled={busy}>
                <UiText text={"Update return"} />
              </button>
            </form>
          )}
        </article>
      ))}
      <div className="record-actions">
        <button
          className="button secondary"
          disabled={busy || loading || page === 1}
          onClick={() => setPage(page - 1)}
        >
          <UiText text={"Previous requests"} />
        </button>
        <span>
          <UiText text={"Page"} />
          {page}
        </span>
        <button
          className="button secondary"
          disabled={busy || loading || !hasNext}
          onClick={() => setPage(page + 1)}
        >
          <UiText text={"Next requests"} />
        </button>
      </div>
    </div>
  );
}
