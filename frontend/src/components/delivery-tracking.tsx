"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";

type Address = {
  recipient: string;
  phone: string;
  line: string;
  area: string;
  instructions?: string;
};
type Parcel = {
  id: string;
  status: string;
  description: string;
  pickup: Address;
  dropoff: Address;
  fee: string;
  weight_kg: string;
  package_type: string;
  fragile: boolean;
  pickup_at: string | null;
  instructions: string;
  rider_name: string;
  received_by: string;
  delivery_note: string;
  failure_reason: string;
  completed_at: string | null;
  created_at: string;
  available_actions: string[];
  can_assign: boolean;
  quantity: number;
  cod_amount: string;
  cod_collected: string;
  cash_reconciled_at: string | null;
  can_reconcile_cash: boolean;
  can_reject_assignment: boolean;
  feedback: { rating: number; comment: string } | null;
  can_review: boolean;
};
type History = { before: string; after: string; created_at: string };
const labels: Record<string, string> = {
  requested: "অনুরোধ জমা / Requested",
  confirmed: "নিশ্চিত / Confirmed",
  assigned: "রাইডার নির্ধারিত / Assigned",
  pickup_pending: "কাজ গ্রহণ / Pickup pending",
  picked_up: "পার্সেল নেওয়া হয়েছে / Picked up",
  in_transit: "পথে / In transit",
  out_for_delivery: "গন্তব্যের পথে / Out for delivery",
  delivered: "পৌঁছে গেছে / Delivered",
  failed: "ডেলিভারি ব্যর্থ / Failed",
  returned: "ফেরত দেওয়া হয়েছে / Returned",
  cancelled: "বাতিল / Cancelled",
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function DeliveryList() {
  const { user } = useApp();
  const [storedResult, setResult] = useState<PageResult<Parcel> | null>(null);
  const [resultScope, setResultScope] = useState("");
  const requestNumber = useRef(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const scope = `${user?.id}:${page}:${status}`;
  const result = resultScope === scope ? storedResult : null;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    const current = ++requestNumber.current;
    setLoading(true);
    setError("");
    try {
      const records = await api<PageResult<Parcel>>(
        `deliveries/?page=${page}&status=${status}`,
      );
      if (current === requestNumber.current) {
        setResult(records);
        setResultScope(`${user.id}:${page}:${status}`);
      }
    } catch (e) {
      if (current === requestNumber.current) setError(message(e));
    } finally {
      if (current === requestNumber.current) setLoading(false);
    }
  }, [user, page, status]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!user) return null;
  return (
    <section className="section">
      <h2>পার্সেল ট্র্যাকিং / Parcel tracking</h2>
      <p>
        আপনার অনুমতি অনুযায়ী বুকিংগুলো দেখানো হচ্ছে। অবস্থানটি সর্বশেষ
        স্ট্যাটাস; এটি লাইভ GPS নয়।
      </p>
      <form className="search-row" action="/delivery/track">
        <label className="field">
          বুকিং রেফারেন্স / Booking reference
          <input
            name="reference"
            required
            pattern="[0-9a-fA-F-]{36}"
            maxLength={36}
          />
        </label>
        <button className="button">ট্র্যাক করুন / Track</button>
      </form>
      <div className="record-actions">
        <label className="field">
          স্ট্যাটাস / Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">সব / All</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          রিফ্রেশ / Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">লোড হচ্ছে / Loading…</p>
      ) : (
        result && (
          <>
            <p>{result.count}টি বুকিং / bookings</p>
            {!result.results.length && (
              <p>কোনো বুকিং নেই / No matching bookings.</p>
            )}
            {result.results.map((parcel) => (
              <article className="record" key={parcel.id}>
                <h3>
                  <Link href={`/delivery/${parcel.id}`}>
                    {parcel.description}
                  </Link>
                </h3>
                <p className="status">
                  {labels[parcel.status] || parcel.status}
                </p>
                <p>
                  {parcel.pickup.area} → {parcel.dropoff.area} · ৳{parcel.fee}
                </p>
                <p className="delivery-reference">{parcel.id}</p>
                <Link className="text-link" href={`/delivery/${parcel.id}`}>
                  বিস্তারিত ও ট্র্যাকিং / Details and tracking
                </Link>
              </article>
            ))}
            <div className="record-actions">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                আগের / Previous
              </button>
              <span>
                <UiText text={"Page"} />
                {page}
              </span>
              <button
                className="button secondary"
                disabled={!result.next}
                onClick={() => setPage(page + 1)}
              >
                পরের / Next
              </button>
            </div>
          </>
        )
      )}
    </section>
  );
}

export function DeliveryTracking({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useApp();
  const [record, setParcel] = useState<Parcel | null>(null);
  const [recordScope, setRecordScope] = useState("");
  const parcel = recordScope === `${user?.id}:${id}` ? record : null;
  const [history, setHistory] = useState<History[]>([]);
  const [riders, setRiders] = useState<{ id: number; name: string }[]>([]);
  const [riderPage, setRiderPage] = useState(1);
  const [moreRiders, setMoreRiders] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [record, timeline] = await Promise.all([
        api<Parcel>(`deliveries/${id}/`),
        api<History[]>(`deliveries/${id}/history/`),
      ]);
      setParcel(record);
      setRecordScope(`${user.id}:${id}`);
      setHistory(timeline);
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }, [id, user]);
  useEffect(() => {
    void load();
  }, [load]);
  const canAssign = !!parcel?.can_assign;
  useEffect(() => {
    if (!canAssign || !user) return;
    let active = true;
    api<PageResult<{ id: number; name: string }>>(
      `deliveries/riders/?page=${riderPage}`,
    )
      .then((result) => {
        if (active) {
          setRiders(result.results);
          setMoreRiders(!!result.next);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [canAssign, user, riderPage]);
  async function act(path: string, payload: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(`deliveries/${id}/${path}/`, "POST", payload);
      if (path === "reject_assignment") {
        router.push("/rider");
        return;
      }
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function update(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act("transition", Object.fromEntries(new FormData(e.currentTarget)));
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>পার্সেল ট্র্যাকিং</h1>
        <p>ব্যক্তিগত বুকিং দেখতে লগইন করুন।</p>
        <Link className="button" href="/login">
          লগইন / Sign in
        </Link>
      </div>
    );
  return (
    <div className="page-wrap delivery-tracking-page">
      <Link href="/delivery" className="text-link">
        ← ডেলিভারি / Deliveries
      </Link>
      <h1>পার্সেল ট্র্যাকিং / Parcel tracking</h1>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!parcel ? (
        <button className="button secondary" onClick={() => void load()}>
          লোড / Retry
        </button>
      ) : (
        <>
          <article className="record">
            <h2>{parcel.description}</h2>
            <p className="delivery-reference">রেফারেন্স: {parcel.id}</p>
            <p className="status">{labels[parcel.status]}</p>
            <p>বুকিং: {new Date(parcel.created_at).toLocaleString()}</p>
            <p>
              ওজন / Weight: {parcel.weight_kg} kg · {parcel.package_type}
              {" · "}
              {parcel.quantity}টি পার্সেল
              {parcel.fragile ? " · ভঙ্গুর / Fragile" : ""}
            </p>
            <p>
              <strong>সার্ভিস চার্জ / Service fee: ৳{parcel.fee}</strong>
            </p>
            <p>
              বুকিং রেকর্ডটি অর্থ পরিশোধের রসিদ নয়। অনলাইন পেমেন্ট যুক্ত নয়।
            </p>
            <p>
              পার্সেল COD: ৳{parcel.cod_amount} · সংগ্রহের রেকর্ড: ৳
              {parcel.cod_collected}
              <br />
              হিসাব যাচাই:{" "}
              {parcel.cash_reconciled_at
                ? new Date(parcel.cash_reconciled_at).toLocaleString()
                : "এখনও হয়নি / Not reconciled"}
              <br />
              এটি প্রেরককে টাকা পাঠানোর প্রমাণ নয়।
            </p>
            {parcel.pickup_at && (
              <p>
                পছন্দের পিকআপ সময়: {new Date(parcel.pickup_at).toLocaleString()}{" "}
                · অপারেশন টিমের নিশ্চিতকরণ প্রয়োজন
              </p>
            )}
            {parcel.instructions && <p>নির্দেশনা: {parcel.instructions}</p>}
            <div className="form-grid">
              {[
                ["পিকআপ / Pickup", parcel.pickup],
                ["গন্তব্য / Destination", parcel.dropoff],
              ].map(([title, address]) => {
                const a = address as Address;
                return (
                  <section key={title as string}>
                    <h3>{title as string}</h3>
                    <p>
                      {a.recipient}
                      <br />
                      {a.line}
                      <br />
                      {a.area}
                      <br />
                      <a href={`tel:${a.phone}`}>{a.phone}</a>
                      {a.instructions && (
                        <>
                          <br />
                          {a.instructions}
                        </>
                      )}
                    </p>
                    <a
                      className="text-link"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.line}, ${a.area}, Bangladesh`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ম্যাপে ঠিকানা / Open address in maps
                    </a>
                  </section>
                );
              })}
            </div>
            <p>
              রাইডার:{" "}
              {parcel.rider_name || "এখনও নির্ধারিত হয়নি / Not assigned"}
            </p>
            {parcel.received_by && (
              <p>
                গ্রহণ করেছেন: {parcel.received_by}
                <br />
                {parcel.completed_at &&
                  new Date(parcel.completed_at).toLocaleString()}
                <br />
                {parcel.delivery_note}
              </p>
            )}
            {parcel.failure_reason && (
              <p>ব্যর্থতার কারণ: {parcel.failure_reason}</p>
            )}
            <div className="record-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void load()}
              >
                রিফ্রেশ / Refresh status
              </button>
              <a
                className="button secondary"
                href={`/api/v1/deliveries/${id}/receipt/`}
                target="_blank"
                rel="noreferrer"
              >
                বুকিং রসিদ / Booking receipt
              </a>
              <Link className="button secondary" href="/support">
                সহায়তা / Support
              </Link>
            </div>
          </article>
          {parcel.feedback && (
            <article className="record">
              <h2>ডেলিভারির মূল্যায়ন / Delivery feedback</h2>
              <p>{parcel.feedback.rating}/5</p>
              <p>{parcel.feedback.comment}</p>
            </article>
          )}
          {parcel.can_review && (
            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  "feedback",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              <h2>ডেলিভারির মূল্যায়ন / Rate your delivery</h2>
              <label className="field">
                রেটিং / Rating
                <select name="rating" required defaultValue="">
                  <option value="">বেছে নিন / Select</option>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option value={value} key={value}>
                      {value}/5
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                মন্তব্য / Comment
                <textarea name="comment" maxLength={1000} />
              </label>
              <button className="button" disabled={busy}>
                <UiText text={"Submit delivery feedback"} />
              </button>
            </form>
          )}
          {canAssign && (
            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  "assign",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              <h2>রাইডার নির্ধারণ / Assign rider</h2>
              <label className="field">
                সক্রিয় রাইডার / Active rider
                <select name="worker" required defaultValue="">
                  <option value="">বেছে নিন / Select</option>
                  {riders.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              {!riders.length && (
                <p>
                  এই পাতায় সক্রিয় রাইডার নেই। অ্যাডমিন থেকে ব্যবহারকারীকে Rider
                  গ্রুপে যুক্ত করুন।
                </p>
              )}
              <div className="record-actions">
                <button
                  type="button"
                  disabled={riderPage === 1}
                  onClick={() => setRiderPage(riderPage - 1)}
                >
                  <UiText text={"Previous riders"} />
                </button>
                <button
                  type="button"
                  disabled={!moreRiders}
                  onClick={() => setRiderPage(riderPage + 1)}
                >
                  <UiText text={"More riders"} />
                </button>
              </div>
              <button className="button" disabled={busy || !riders.length}>
                <UiText text={"Assign rider"} />
              </button>
            </form>
          )}
          {parcel.can_reject_assignment && (
            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  "reject_assignment",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              <h2>কাজ প্রত্যাখ্যান / Reject new assignment</h2>
              <label className="field">
                কারণ / Reason
                <textarea name="reason" required maxLength={500} />
              </label>
              <button className="button secondary" disabled={busy}>
                <UiText text={"Reject assignment"} />
              </button>
            </form>
          )}
          {parcel.can_reconcile_cash && (
            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  "reconcile_cash",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              <h2>COD জমার হিসাব / Reconcile COD deposit</h2>
              <label className="field">
                জমার রেফারেন্স / Deposit reference
                <input name="reference" required maxLength={100} />
              </label>
              <label className="field">
                জমার পরিমাণ / Amount
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={parcel.cod_collected}
                  required
                />
              </label>
              <p>
                শুধু বাস্তবে জমা পাওয়া COD-এর হিসাব নিশ্চিত করুন। প্রেরককে টাকা
                পাঠানো এখানে রেকর্ড হচ্ছে না।
              </p>
              <button className="button" disabled={busy}>
                <UiText text={"Confirm cash deposit"} />
              </button>
            </form>
          )}
          <div className="record-actions">
            {parcel.available_actions
              .filter((s) => !["delivered", "failed"].includes(s))
              .map((status) => (
                <button
                  className="button secondary"
                  key={status}
                  disabled={busy}
                  onClick={() => void act("transition", { status })}
                >
                  {labels[status]}
                </button>
              ))}
          </div>
          {parcel.available_actions.includes("delivered") && (
            <form className="form-panel" onSubmit={update}>
              <h2>ডেলিভারি সম্পন্ন / Complete delivery</h2>
              <input name="status" type="hidden" value="delivered" />
              {Number(parcel.cod_amount) > 0 ? (
                <label className="field">
                  সংগ্রহ করা পার্সেল COD / Collected COD (৳)
                  <input
                    name="cod_collected"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder={parcel.cod_amount}
                  />
                </label>
              ) : (
                <input name="cod_collected" type="hidden" value="0" />
              )}
              <label className="field">
                যিনি গ্রহণ করেছেন / Received by
                <input name="received_by" required maxLength={120} />
              </label>
              <label className="field">
                ডেলিভারি নোট / Delivery note
                <textarea name="delivery_note" maxLength={1000} />
              </label>
              <button className="button" disabled={busy}>
                <UiText text={"Confirm handover"} />
              </button>
            </form>
          )}
          {parcel.available_actions.includes("failed") && (
            <form className="form-panel" onSubmit={update}>
              <h2>ডেলিভারি ব্যর্থ / Report failed delivery</h2>
              <input name="status" type="hidden" value="failed" />
              <label className="field">
                কারণ / Reason
                <textarea name="failure_reason" required maxLength={1000} />
              </label>
              <button className="button secondary" disabled={busy}>
                <UiText text={"Report failure"} />
              </button>
            </form>
          )}
          <section className="record">
            <h2>স্ট্যাটাসের ইতিহাস / Status history</h2>
            <p>সর্বশেষ অপারেশন আপডেট; লাইভ GPS অবস্থান নয়।</p>
            <ol>
              {history.map((event, index) => (
                <li key={index}>
                  <strong>{labels[event.after] || event.after}</strong> ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
