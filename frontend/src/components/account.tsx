"use client";
import { MechanicBookingProgress } from "./mechanic-booking-progress";
import { BookingReschedule } from "./booking-reschedule";
import { MechanicPhoto } from "./mechanic-photo";
import { TranslatedInput } from "@/components/translated-elements";

import { UiText } from "@/components/ui-text";

import Link from "next/link";
import {
  MechanicSummary,
  MechanicReportView,
  type MechanicReport,
  type MechanicDetails,
} from "./mechanic-details";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp, Text } from "./provider";
import { PartnerCatalog } from "./partner-catalog";
import { SecurityHistory } from "./security-history";
import { ProviderPicker } from "./provider-dashboard";
import { LocationPicker, LocalityInput, addressLine } from "./location-picker";
type RecordItem = {
  has_problem_photo?: boolean;
  can_manage_photo?: boolean;
  offering?: number;
  can_reschedule?: boolean;
  id: string;
  status: string;
  total?: string;
  price?: string;
  fee?: string;
  service?: string;
  division_slug?: string;
  created_at: string;
  payment_status?: string;
  payment_method?: string;
  prescription_status?: string;
  items?: {
    name: string;
    quantity: number;
    food_options?: { name: string; name_bn: string }[];
  }[];
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  service_details?: MechanicDetails;
  mechanic_report?: MechanicReport;
  preparation_minutes?: number | null;
  available_actions?: string[];
};
type EventItem = {
  id: string;
  event_type: string;
  title: string;
  event_date: string;
  guest_count: number;
  venue: string;
  area: string;
  budget: string | null;
  quoted_budget: string | null;
  services: string[];
  package_selection: { bundle?: string; tiers?: Record<string, string> };
  notes: string;
  staff_notes: string;
  status: string;
};
const nextStates: Record<string, string[]> = {
  placed: ["accepted", "rejected"],
  accepted: ["preparing", "ready"],
  preparing: ["ready"],
  ready: ["picked_up"],
  picked_up: ["in_transit", "failed"],
  in_transit: ["delivered", "failed"],
  failed: ["returned"],
  pending: ["confirmed"],
  confirmed: ["assigned"],
  assigned: ["on_the_way", "picked_up"],
  on_the_way: ["arrived"],
  arrived: ["in_progress"],
  in_progress: ["completed", "waiting_for_parts", "failed"],
  waiting_for_parts: ["in_progress"],
  requested: ["confirmed"],
};
const eventNextStates: Record<string, string[]> = {
  requested: ["reviewing", "cancelled"],
  reviewing: ["cancelled"],
  quoted: ["cancelled"],
  confirmed: ["completed"],
};
export function Account({ operations = false }: { operations?: boolean }) {
  const { user, refresh, toast, lang } = useApp();
  const [tab, setTab] = useState("orders");
  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<
    { before: string; after: string; created_at: string }[] | null
  >(null);
  const [tickets, setTickets] = useState<
    { id: number; subject: string; status: string; response: string }[]
  >([]);
  const [notifications, setNotifications] = useState<
    { id: number; title: string; body: string; read: boolean }[]
  >([]);
  const [addresses, setAddresses] = useState<
    {
      id: number;
      label: string;
      recipient: string;
      phone: string;
      district: string;
      area: string;
      line: string;
      postal_code: string;
    }[]
  >([]);
  const [editingAddress, setEditingAddress] = useState<number | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const visibleRecords =
    tab === "bookings"
      ? records.filter((record) => {
          const terminal = ["completed", "cancelled", "failed"].includes(
            record.status,
          );
          const matchesStatus =
            bookingFilter === "all" ||
            (bookingFilter === "active"
              ? !terminal
              : record.status === bookingFilter);
          const searchable = [
            record.id,
            record.service,
            record.service_details?.vehicle_model,
            record.service_details?.registration,
          ]
            .filter(Boolean)
            .join(" ")
            .normalize("NFC")
            .toLocaleLowerCase();
          return (
            matchesStatus &&
            searchable.includes(
              bookingQuery.trim().normalize("NFC").toLocaleLowerCase(),
            )
          );
        })
      : records;
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    if (!user) return;
    const version = ++loadVersion.current;
    setError("");
    setLoading(true);
    try {
      if (["orders", "bookings", "deliveries"].includes(tab)) {
        const data = await api<PageResult<RecordItem>>(`${tab}/`);
        if (version !== loadVersion.current) return;
        setRecords(data.results);
      }
      if (tab === "events") {
        const data = await api<PageResult<EventItem>>("events/");
        if (version !== loadVersion.current) return;
        setEvents(data.results);
      }
      if (tab === "support") {
        const data =
          await api<PageResult<(typeof tickets)[number]>>("tickets/");
        if (version !== loadVersion.current) return;
        setTickets(data.results);
      }
      if (tab === "notifications" || !operations) {
        const data =
          await api<PageResult<(typeof notifications)[number]>>(
            "notifications/",
          );
        if (version !== loadVersion.current) return;
        setNotifications(data.results);
      }
      if (tab === "preferences") {
        const data =
          await api<PageResult<(typeof addresses)[number]>>("addresses/");
        if (version !== loadVersion.current) return;
        setAddresses(data.results);
      }
      if (!operations) {
        const data = await api<Record<string, number | string>>("dashboard/");
        if (version !== loadVersion.current) return;
        setStats(data);
      }
    } catch (e) {
      if (version === loadVersion.current)
        setError(e instanceof Error ? e.message : "Unable to load records");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [user, tab, operations]);
  const invalidateLoad = useCallback(() => {
    ++loadVersion.current;
  }, []);
  useEffect(() => {
    load();
    return invalidateLoad;
  }, [load, invalidateLoad]);
  async function act(path: string, body: unknown) {
    setError("");
    setBusy(true);
    try {
      await api(path, "POST", body);
      toast("Updated / আপডেট হয়েছে");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  async function support(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await act("tickets/", Object.fromEntries(new FormData(form)));
    form.reset();
  }
  async function assistant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        answer: string;
        sources: { title: string }[];
      }>(
        "assistant/",
        "POST",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setAnswer(
        `${result.answer}\n\n${result.sources.map((s) => s.title).join(" · ")}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assistant unavailable");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page-wrap">
        <div className="empty">
          <h1>
            <Text
              bn="আপনার অ্যাকাউন্টে প্রবেশ করুন"
              en="Your everyday, all together"
            />
          </h1>
          <Link href="/project-account" className="text-link">
            <Text
              bn="প্রজেক্ট ও বিনিয়োগ অ্যাকাউন্ট"
              en="Project & investment account"
            />
          </Link>
          <p>
            <UiText
              text={"Sign in to view your orders, bookings and requests."}
            />
          </p>
          <Link href="/login" className="button">
            <UiText text={"লগইন / Sign in"} />
          </Link>
        </div>
      </div>
    );
  return (
    <div className="page-wrap">
      <div className="record-head">
        <div>
          <span className="eyebrow">
            {operations ? (
              <UiText text={"OPERATIONS WORKSPACE"} />
            ) : (
              <UiText text={"YOUR U SERVICE"} />
            )}
          </span>
          <h1>
            {operations ? (
              <UiText text={"Operations"} />
            ) : (
              `${lang === "bn" ? "স্বাগতম" : "Welcome"}, ${user.first_name || user.username}`
            )}
          </h1>
        </div>
        <button
          className="button secondary"
          onClick={async () => {
            await api("auth/logout/", "POST");
            await refresh();
          }}
        >
          <UiText text={"Sign out"} />
        </button>
      </div>
      {operations ? (
        <p className="page-intro">
          <UiText
            text={
              "Records are restricted to your permissions and assignments. Each status change is validated and audited."
            }
          />{" "}
          <a className="text-link" href="/admin/">
            <UiText text={"Central administration ↗"} />
          </a>
        </p>
      ) : (
        <div className="stat-grid">
          {[
            ["Orders", stats.orders],
            ["Bookings", stats.bookings],
            ["Deliveries", stats.deliveries],
            ["Loyalty points", stats.loyalty_points],
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <strong>{value ?? "—"}</strong>
              <span>
                <UiText text={String(label)} />
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="tabs">
        {[
          "orders",
          "bookings",
          "deliveries",
          ...(operations
            ? ["catalog", "events"]
            : ["support", "notifications", "assistant", "preferences"]),
        ].map((t) => (
          <button
            key={t}
            className={`filter ${tab === t ? "active" : ""}`}
            onClick={() => {
              setTab(t);
              setBookingQuery("");
              setBookingFilter("all");
              setHistory(null);
            }}
          >
            <UiText text={t.charAt(0).toUpperCase() + t.slice(1)} />
            {t === "notifications" &&
              notifications.filter((notification) => !notification.read)
                .length > 0 && (
                <span className="tab-count" aria-label="unread notifications">
                  {
                    notifications.filter((notification) => !notification.read)
                      .length
                  }
                </span>
              )}
          </button>
        ))}
        <button className="filter" onClick={() => load()} disabled={loading}>
          <UiText text={"Refresh"} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      {tab === "events" && (
        <section>
          <h2>
            <UiText text={"Event requests"} />
          </h2>
          {!events.length && (
            <p className="subtle">
              <UiText text={"No event requests yet."} />
            </p>
          )}
          {events.map((event) => (
            <article className="record" key={event.id}>
              <div className="record-head">
                <div>
                  <h3>{event.title}</h3>
                  <p>
                    <UiText
                      text={
                        event.event_type.charAt(0).toUpperCase() +
                        event.event_type.slice(1)
                      }
                    />{" "}
                    · {event.event_date} · {event.guest_count}
                    <UiText text={"guests"} />
                    <br />
                    {event.venue}, {event.area}
                  </p>
                </div>
                <span className="status">
                  <UiText text={event.status} />
                </span>
              </div>
              <p>
                {event.services.length ? (
                  event.services.map((service, index) => (
                    <span key={service}>
                      {index > 0 && " · "}
                      <UiText text={service} />
                    </span>
                  ))
                ) : (
                  <UiText text="Planning consultation" />
                )}
              </p>
              {event.package_selection?.bundle && (
                <p>
                  <UiText text={"প্যাকেজ / Package:"} />{" "}
                  <UiText
                    text={
                      (
                        {
                          essential: "সাদামাটা আয়োজন / Essential gathering",
                          celebration: "উৎসব আয়োজন / Celebration",
                          wedding:
                            "সম্পূর্ণ বিবাহ পরিকল্পনা / Full wedding planning",
                        } as Record<string, string>
                      )[event.package_selection.bundle] || ""
                    }
                  />
                </p>
              )}
              {Object.entries(event.package_selection?.tiers || {}).map(
                ([service, tier]) => (
                  <p key={service}>
                    <UiText text={service} />:{" "}
                    <UiText
                      text={
                        (
                          {
                            general: "সাধারণ / General",
                            silver: "সিলভার / Silver",
                            gold: "গোল্ডেন / Golden",
                            ultra_gold: "আল্ট্রা গোল্ডেন / Ultra Golden",
                          } as Record<string, string>
                        )[tier] || ""
                      }
                    />
                  </p>
                ),
              )}
              {event.budget !== null && (
                <p>
                  <UiText text={"Customer budget: ৳"} />
                  {event.budget}
                </p>
              )}
              {event.notes && (
                <p>
                  <UiText text={"Planning notes:"} />
                  {event.notes}
                </p>
              )}
              {event.quoted_budget && (
                <p className="notice">
                  <UiText text={"Quoted budget: ৳"} />
                  {event.quoted_budget}
                  {event.staff_notes && (
                    <>
                      <br />
                      {event.staff_notes}
                    </>
                  )}
                </p>
              )}
              {["reviewing", "quoted"].includes(event.status) && (
                <form
                  className="form-grid"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const data = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    await act(`events/${event.id}/quote/`, data);
                  }}
                >
                  <label className="field">
                    <UiText text={"Quote (BDT)"} />
                    <input
                      name="quoted_budget"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                    />
                  </label>
                  <label className="field">
                    <UiText text={"Note for customer"} />
                    <input name="staff_notes" maxLength={2000} />
                  </label>
                  <button className="button" type="submit" disabled={busy}>
                    <UiText text={"Send quote"} />
                  </button>
                </form>
              )}
              <label className="field">
                <UiText text={"Update status"} />
                <select
                  defaultValue=""
                  disabled={
                    busy || !(eventNextStates[event.status] || []).length
                  }
                  onChange={async (e) => {
                    const select = e.currentTarget;
                    if (!select.value) return;
                    const status = select.value;
                    select.value = "";
                    await act(`events/${event.id}/transition/`, {
                      status,
                    });
                  }}
                >
                  <option value="">
                    <UiText text={"Choose next status"} />
                  </option>
                  {(eventNextStates[event.status] || []).map((status) => (
                    <option key={status} value={status}>
                      <UiText text={status} />
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </section>
      )}
      {tab === "catalog" && <PartnerCatalog />}
      {loading ? (
        <p role="status">
          <UiText text={"Loading your records…"} />
        </p>
      ) : (
        ["orders", "bookings", "deliveries"].includes(tab) && (
          <>
            {tab === "bookings" && records.length > 0 && (
              <section
                className="booking-list-tools"
                aria-label={lang === "bn" ? "বুকিং খুঁজুন" : "Find bookings"}
              >
                <div className="booking-list-inputs">
                  <label>
                    <Text bn="বুকিং খুঁজুন" en="Find a booking" />
                    <input
                      type="search"
                      value={bookingQuery}
                      onChange={(event) => setBookingQuery(event.target.value)}
                      placeholder={
                        lang === "bn"
                          ? "সেবা, যানবাহন বা বুকিং নম্বর"
                          : "Service, vehicle or booking ID"
                      }
                    />
                  </label>
                  <label>
                    <Text bn="বুকিংয়ের অবস্থা" en="Booking status" />
                    <select
                      value={bookingFilter}
                      onChange={(event) => setBookingFilter(event.target.value)}
                    >
                      {[
                        ["all", "সব বুকিং", "All bookings"],
                        ["active", "চলমান বুকিং", "Active bookings"],
                        [
                          "waiting_for_parts",
                          "যন্ত্রাংশের অপেক্ষায়",
                          "Waiting for parts",
                        ],
                        ["completed", "সম্পন্ন", "Completed"],
                        ["cancelled", "বাতিল", "Cancelled"],
                        ["failed", "অসম্পূর্ণ", "Failed"],
                      ].map(([value, bn, en]) => (
                        <option key={value} value={value}>
                          {lang === "bn" ? bn : en}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p role="status">
                  <Text
                    bn={`লোড হওয়া ${records.length.toLocaleString("bn-BD")}টি বুকিংয়ের মধ্যে ${visibleRecords.length.toLocaleString("bn-BD")}টি দেখানো হচ্ছে।`}
                    en={`Showing ${visibleRecords.length} of ${records.length} loaded bookings.`}
                  />
                </p>
                {(bookingQuery || bookingFilter !== "all") && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setBookingQuery("");
                      setBookingFilter("all");
                    }}
                  >
                    <Text bn="সব বুকিং দেখুন" en="Show all bookings" />
                  </button>
                )}
                {visibleRecords.length === 0 && (
                  <p>
                    <Text
                      bn="এই খোঁজে কোনো বুকিং পাওয়া যায়নি। অন্য নাম বা অবস্থা বেছে নিন।"
                      en="No bookings match. Try another name or status."
                    />
                  </p>
                )}
              </section>
            )}
            {!records.length && (
              <div className="empty">
                <p>
                  <Text
                    bn={
                      tab === "bookings"
                        ? "এখনও কোনো বুকিং নেই।"
                        : tab === "deliveries"
                          ? "এখনও কোনো ডেলিভারি নেই।"
                          : "এখনও কোনো অর্ডার নেই।"
                    }
                    en={
                      tab === "bookings"
                        ? "No bookings yet."
                        : tab === "deliveries"
                          ? "No deliveries yet."
                          : "No orders yet."
                    }
                  />
                </p>
                <Link
                  className="button"
                  href={tab === "deliveries" ? "/delivery" : "/catalog"}
                >
                  <UiText text={"Explore services"} />
                </Link>
              </div>
            )}
            {visibleRecords.map((r) => (
              <article
                className={`record ${tab === "bookings" && r.service_details?.vehicle_type ? "mechanic-booking-record" : ""}`}
                key={r.id}
              >
                <div className="record-head">
                  <div>
                    <h3>
                      {r.service ||
                        r.items
                          ?.map(
                            (i) =>
                              `${i.name} ${(i.food_options || []).map((option) => (lang === "bn" ? option.name_bn || option.name : option.name)).join(", ")} × ${i.quantity}`,
                          )
                          .join(", ") ||
                        r.description ||
                        r.division_slug}
                    </h3>
                    <p>
                      {new Date(r.created_at).toLocaleString(
                        lang === "bn" ? "bn-BD" : "en-GB",
                        { timeZone: "Asia/Dhaka" },
                      )}{" "}
                      · {r.id}
                    </p>
                  </div>
                  <span className="status">
                    <UiText text={r.status} />
                  </span>
                </div>
                <p>
                  ৳{r.total || r.price || r.fee}{" "}
                  {r.payment_status && (
                    <>
                      {" "}
                      · <Text bn="পেমেন্ট:" en="Payment:" />{" "}
                      <UiText text={r.payment_status} />
                    </>
                  )}
                </p>
                {r.scheduled_at && (
                  <p>
                    <UiText text={"Appointment:"} />
                    {new Date(r.scheduled_at).toLocaleString(
                      lang === "bn" ? "bn-BD" : "en-GB",
                      { timeZone: "Asia/Dhaka" },
                    )}
                  </p>
                )}
                {r.duration_minutes != null && (
                  <p>
                    <UiText text={"কাজের সময় / Duration:"} />
                    {r.duration_minutes}
                    <UiText
                      text={"মিনিট / minutes · বাংলাদেশ সময় / Bangladesh time"}
                    />
                  </p>
                )}
                {r.preparation_minutes != null && (
                  <p>
                    <UiText
                      text={
                        "খাবার প্রস্তুতির আনুমানিক সময় / Estimated food preparation:"
                      }
                    />{" "}
                    {r.preparation_minutes}
                    <UiText text={"মিনিট / minutes"} />
                  </p>
                )}
                {tab === "bookings" && r.service_details?.vehicle_type && (
                  <MechanicBookingProgress status={r.status} />
                )}
                <MechanicSummary details={r.service_details} />
                {tab === "bookings" && r.service_details?.vehicle_type && (
                  <MechanicPhoto
                    id={r.id}
                    hasPhoto={r.has_problem_photo}
                    editable={r.can_manage_photo}
                    onSaved={load}
                  />
                )}
                <MechanicReportView report={r.mechanic_report} />
                {tab === "bookings" &&
                  r.service_details?.vehicle_type &&
                  r.can_reschedule &&
                  r.offering && (
                    <BookingReschedule
                      id={r.id}
                      offering={r.offering}
                      onSaved={load}
                    />
                  )}
                <div className="record-actions">
                  {tab === "deliveries" && (
                    <Link
                      className="button secondary"
                      href={`/delivery/${r.id}`}
                    >
                      <UiText
                        text={"বিস্তারিত ও পরিচালনা / Delivery details"}
                      />
                    </Link>
                  )}
                  {!operations &&
                    r.payment_method === "sslcommerz" &&
                    r.payment_status !== "paid" &&
                    r.status === "placed" && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const result = await api<{ redirect_url: string }>(
                              `payments/${r.id}/start/`,
                              "POST",
                            );
                            window.location.assign(result.redirect_url);
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Payment unavailable",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <UiText text={"Pay securely"} />
                      </button>
                    )}
                  <button
                    className="button secondary"
                    onClick={async () => {
                      try {
                        setHistory(await api(`${tab}/${r.id}/history/`));
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    <UiText text={"Status history"} />
                  </button>
                  {tab === "orders" && (
                    <a
                      className="button secondary"
                      href={`/api/v1/orders/${r.id}/invoice/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <UiText text={"Invoice"} />
                    </a>
                  )}
                  {!operations &&
                    [
                      "placed",
                      "prescription_pending",
                      "pending",
                      "requested",
                    ].includes(r.status) && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          act(`${tab}/${r.id}/transition/`, {
                            status: "cancelled",
                          })
                        }
                      >
                        <UiText text={"Cancel request"} />
                      </button>
                    )}
                  {operations &&
                    (tab === "deliveries"
                      ? r.available_actions
                      : nextStates[r.status]
                    )
                      ?.filter((s) =>
                        tab === "deliveries"
                          ? !["delivered", "failed"].includes(s)
                          : tab === "bookings"
                            ? s !== "picked_up"
                            : s !== "on_the_way",
                      )
                      .map((s) => (
                        <button
                          className="button secondary"
                          key={s}
                          disabled={busy}
                          onClick={() =>
                            act(`${tab}/${r.id}/transition/`, { status: s })
                          }
                        >
                          {s.replaceAll("_", " ")}
                        </button>
                      ))}
                </div>
                {operations &&
                  [
                    "accepted",
                    "preparing",
                    "ready",
                    "confirmed",
                    "assigned",
                  ].includes(r.status) && (
                    <form
                      className="search-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(
                          `${tab}/${r.id}/assign/`,
                          Object.fromEntries(new FormData(e.currentTarget)),
                        );
                      }}
                    >
                      {tab === "bookings" ? (
                        <ProviderPicker bookingId={String(r.id)} />
                      ) : (
                        <TranslatedInput
                          name="worker"
                          type="number"
                          min="1"
                          required
                          placeholder="Worker user ID"
                          aria-label="Worker user ID"
                        />
                      )}
                      <button className="button" disabled={busy}>
                        <UiText text={"Assign"} />
                      </button>
                    </form>
                  )}
                {tab === "orders" &&
                  r.status === "prescription_pending" &&
                  !operations &&
                  r.prescription_status !== "pending" && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        await act(`orders/${r.id}/prescription/`, form);
                      }}
                    >
                      <label className="field">
                        <UiText
                          text={
                            "Upload prescription (PDF, JPEG, PNG; up to 5 MB)"
                          }
                        />
                        <input
                          type="file"
                          name="document"
                          accept="application/pdf,image/jpeg,image/png"
                          required
                        />
                      </label>
                      <button className="button" disabled={busy}>
                        <UiText text={"Submit for review"} />
                      </button>
                    </form>
                  )}
                {operations && r.prescription_status === "pending" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(
                        `orders/${r.id}/review-prescription/`,
                        Object.fromEntries(new FormData(e.currentTarget)),
                      );
                    }}
                  >
                    <a
                      className="text-link"
                      href={`/api/v1/orders/${r.id}/prescription-file/`}
                    >
                      <UiText text={"Download prescription"} />
                    </a>
                    <label className="field">
                      <UiText text={"Review note"} />
                      <input name="note" required />
                    </label>
                    <label className="field">
                      <UiText text={"Decision"} />
                      <select name="decision">
                        <option value="approved">
                          <UiText text={"Approve"} />
                        </option>
                        <option value="rejected">
                          <UiText text={"Reject"} />
                        </option>
                      </select>
                    </label>
                    <button className="button" disabled={busy}>
                      <UiText text={"Save authorized review"} />
                    </button>
                  </form>
                )}
                {operations &&
                  tab === "orders" &&
                  r.status === "delivered" &&
                  r.payment_status === "unpaid" && (
                    <form
                      className="search-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(
                          `orders/${r.id}/reconcile-cod/`,
                          Object.fromEntries(new FormData(e.currentTarget)),
                        );
                      }}
                    >
                      <TranslatedInput
                        name="reference"
                        required
                        placeholder="Cash deposit reference"
                        aria-label="Cash deposit reference"
                      />
                      <button className="button" disabled={busy}>
                        <UiText text={"Reconcile COD"} />
                      </button>
                    </form>
                  )}
              </article>
            ))}
          </>
        )
      )}
      {history && (
        <div className="record">
          <h3>
            <UiText text={"Status history"} />
          </h3>
          {history.length ? (
            history.map((h, i) => (
              <p key={i}>
                {new Date(h.created_at).toLocaleString()} ·{" "}
                {h.before || "Created"} → {h.after}
              </p>
            ))
          ) : (
            <p>
              <UiText text={"No status changes recorded yet."} />
            </p>
          )}
          <button className="button secondary" onClick={() => setHistory(null)}>
            <UiText text={"Close"} />
          </button>
        </div>
      )}
      {tab === "support" && (
        <>
          <form className="form-panel" onSubmit={support}>
            <h2>
              <UiText text={"How can we help?"} />
            </h2>
            <label className="field">
              <UiText text={"Subject"} />
              <input name="subject" required maxLength={180} />
            </label>
            <label className="field">
              <UiText text={"Message"} />
              <textarea name="message" required maxLength={4000} />
            </label>
            <button className="button" disabled={busy}>
              <UiText text={"Open support ticket"} />
            </button>
          </form>
          <div style={{ marginTop: 25 }}>
            {tickets.map((t) => (
              <div className="record" key={t.id}>
                <h3>{t.subject}</h3>
                <span className="status">{t.status}</span>
                <p>
                  {t.response || "Awaiting a response from the support team."}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "notifications" && (
        <>
          {!!notifications.some((n) => !n.read) && (
            <button
              className="button secondary"
              onClick={async () => {
                await api("notifications/mark_all_read/", "POST");
                load();
              }}
            >
              <UiText text={"Mark all as read / সবগুলো পড়া হয়েছে"} />
            </button>
          )}
          {!notifications.length && (
            <p>
              <UiText text={"No notifications yet."} />
            </p>
          )}
          {notifications.map((n) => (
            <div className="record" key={n.id}>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              {!n.read && (
                <button
                  className="button secondary"
                  onClick={async () => {
                    await api(`notifications/${n.id}/`, "PATCH", {
                      read: true,
                    });
                    load();
                  }}
                >
                  <UiText text={"Mark as read"} />
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {tab === "assistant" && (
        <form className="form-panel" onSubmit={assistant}>
          <h2>
            <UiText text={"U Service assistant"} />
          </h2>
          <p className="subtle">
            <UiText
              text={
                "Answers use approved public knowledge. This assistant cannot change orders, approve medicine, or process payments."
              }
            />
          </p>
          <label className="field">
            <UiText text={"Your question"} />
            <textarea name="message" required maxLength={1500} />
          </label>
          <button className="button" disabled={busy}>
            <UiText text={busy ? "Looking it up…" : "Ask assistant"} />
          </button>
          {answer && <div className="chat-answer">{answer}</div>}
        </form>
      )}
      {tab === "preferences" && (
        <>
          <form
            className="form-panel"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                await api("auth/me/", "PATCH", {
                  marketing_consent: data.has("marketing_consent"),
                });
                toast("Preference saved");
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <h2>
              <UiText text={"Your privacy choices"} />
            </h2>
            <p className="notice">
              {user.email_verified ? (
                <UiText text={"Email verified"} />
              ) : (
                <UiText text={"Your email is not verified yet."} />
              )}
            </p>
            {!user.email_verified && (
              <button
                type="button"
                className="button secondary"
                onClick={async () => {
                  try {
                    await api("auth/email-verification/", "POST");
                    toast("Verification email sent");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to send verification email",
                    );
                  }
                }}
              >
                <UiText text={"Send verification email"} />
              </button>
            )}
            <label className="field">
              <span>
                <input
                  type="checkbox"
                  name="marketing_consent"
                  style={{ width: "auto", minHeight: 0 }}
                />{" "}
                <UiText text={"I want to receive promotional messages."} />
              </span>
            </label>
            <button className="button">
              <UiText text={"Save preference"} />
            </button>
            <p style={{ marginTop: 20 }}>
              <a className="text-link" href="/api/v1/addresses/export/">
                <UiText text={"Export profile and saved addresses"} />
              </a>
            </p>
            <p className="subtle">
              <UiText
                text={
                  "Deletion requests are reviewed by the team. Financial records may require retention."
                }
              />
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                setError("");
                try {
                  await api("auth/delete-request/", "POST", {
                    reason:
                      "Customer requested account deletion from Preferences.",
                  });
                  toast(
                    "Deletion request submitted / মুছে ফেলার অনুরোধ পাঠানো হয়েছে",
                  );
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to submit deletion request",
                  );
                }
              }}
            >
              <UiText text={"Request account deletion"} />
            </button>
          </form>
          <SecurityHistory key={user.id} />
          <div className="form-panel" style={{ marginTop: 20 }}>
            <h2>
              <UiText text={"Saved addresses"} />
            </h2>
            {!addresses.length && (
              <p className="subtle">
                <UiText text={"No saved addresses yet."} />
              </p>
            )}
            {addresses.map((a) => (
              <div className="record" key={a.id}>
                <div className="record-head">
                  <div>
                    <h3>{a.label}</h3>
                    <p>
                      {a.recipient} · {a.phone}
                      <br />
                      {a.line}, {a.area}
                    </p>
                  </div>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setEditingAddress(a.id)}
                    >
                      <UiText text={"Edit"} />
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={async () => {
                        try {
                          await api(`addresses/${a.id}/`, "DELETE");
                          await load();
                        } catch (e) {
                          setError(String(e));
                        }
                      }}
                    >
                      <UiText text={"Remove"} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <form
              key={editingAddress ?? "new-address"}
              onSubmit={async (e) => {
                e.preventDefault();
                const addressForm = e.currentTarget;
                const data = Object.fromEntries(new FormData(addressForm));
                data.line = addressLine(
                  String(data.line),
                  String(data.geo_address || ""),
                );
                delete data.geo_address;
                try {
                  await api(
                    editingAddress
                      ? `addresses/${editingAddress}/`
                      : "addresses/",
                    editingAddress ? "PATCH" : "POST",
                    data,
                  );
                  addressForm.reset();
                  setEditingAddress(null);
                  await load();
                  toast(
                    editingAddress
                      ? "Address updated / ঠিকানা আপডেট হয়েছে"
                      : "Address saved / ঠিকানা সংরক্ষিত",
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to save address",
                  );
                }
              }}
            >
              <div className="form-grid">
                <label className="field">
                  <span>
                    <UiText text={"Label"} />
                  </span>
                  <TranslatedInput
                    name="label"
                    required
                    maxLength={60}
                    placeholder="Home"
                    defaultValue={
                      addresses.find((a) => a.id === editingAddress)?.label ??
                      ""
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    <UiText text={"Recipient"} />
                  </span>
                  <input
                    name="recipient"
                    required
                    maxLength={120}
                    defaultValue={
                      addresses.find((a) => a.id === editingAddress)
                        ?.recipient ?? ""
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    <UiText text={"Phone"} />
                  </span>
                  <TranslatedInput
                    name="phone"
                    required
                    pattern="\+?[0-9]{10,15}"
                    type="tel"
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                    defaultValue={
                      addresses.find((a) => a.id === editingAddress)?.phone ??
                      ""
                    }
                  />
                </label>
                <LocationPicker
                  districtField
                  defaultDistrict={
                    addresses.find((a) => a.id === editingAddress)?.district ||
                    ""
                  }
                />
                <label className="field">
                  <span>
                    <UiText text={"Area"} />
                  </span>
                  <LocalityInput
                    name="area"
                    required
                    defaultValue={
                      addresses.find((a) => a.id === editingAddress)?.area ?? ""
                    }
                  />
                </label>
                <label className="field wide">
                  <span>
                    <UiText text={"Address line"} />
                  </span>
                  <input
                    name="line"
                    required
                    maxLength={500}
                    defaultValue={
                      addresses.find((a) => a.id === editingAddress)?.line ?? ""
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    <UiText text={"Postal code"} />
                  </span>
                  <input
                    name="postal_code"
                    maxLength={10}
                    defaultValue={
                      addresses.find((a) => a.id === editingAddress)
                        ?.postal_code ?? ""
                    }
                  />
                </label>
              </div>
              <button className="button">
                {editingAddress ? (
                  <UiText text={"Update address"} />
                ) : (
                  <UiText text={"Save address"} />
                )}
              </button>
              {editingAddress && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setEditingAddress(null)}
                >
                  <UiText text={"Cancel"} />
                </button>
              )}
            </form>
          </div>
          <form
            className="form-panel"
            style={{ marginTop: 20 }}
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const form = e.currentTarget;
              try {
                await api(
                  "auth/password/",
                  "POST",
                  Object.fromEntries(new FormData(form)),
                );
                toast("Password changed / পাসওয়ার্ড বদলানো হয়েছে");
                form.reset();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Unable to change password",
                );
              }
            }}
          >
            <h2>
              <UiText text={"Change password"} />
            </h2>
            <label className="field">
              <UiText text={"Current password"} />
              <input
                name="old_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              <UiText text={"New password"} />
              <input
                name="new_password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
            <button className="button">
              <UiText text={"Update password"} />
            </button>
          </form>
          <div className="form-panel" style={{ marginTop: 20 }}>
            <h2>
              <UiText text={"Sign out everywhere"} />
            </h2>
            <p className="subtle">
              <UiText
                text={
                  "End all active sessions for this account, including this device."
                }
              />
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                setError("");
                try {
                  await api("auth/logout-all/", "POST");
                  window.location.assign("/login");
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to sign out everywhere",
                  );
                }
              }}
            >
              <UiText text={"Sign out everywhere"} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
