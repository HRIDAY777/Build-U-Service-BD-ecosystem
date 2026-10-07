"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp, Text } from "./provider";
import { PartnerCatalog } from "./partner-catalog";
type RecordItem = {
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
  items?: { name: string; quantity: number }[];
  description?: string;
  scheduled_at?: string;
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
export function Account({ operations = false }: { operations?: boolean }) {
  const { user, refresh, toast } = useApp();
  const [tab, setTab] = useState("orders");
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
  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      if (["orders", "bookings", "deliveries"].includes(tab))
        setRecords((await api<PageResult<RecordItem>>(`${tab}/`)).results);
      if (tab === "support")
        setTickets(
          (
            await api<
              PageResult<{
                id: number;
                subject: string;
                status: string;
                response: string;
              }>
            >("tickets/")
          ).results,
        );
      if (tab === "notifications")
        setNotifications(
          (
            await api<
              PageResult<{
                id: number;
                title: string;
                body: string;
                read: boolean;
              }>
            >("notifications/")
          ).results,
        );
      if (!operations) setStats(await api("dashboard/"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load records");
    } finally {
      setLoading(false);
    }
  }, [user, tab, operations]);
  useEffect(() => {
    load();
  }, [load]);
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
          <p>Sign in to view your orders, bookings and requests.</p>
          <Link href="/login" className="button">
            লগইন / Sign in
          </Link>
        </div>
      </div>
    );
  return (
    <div className="page-wrap">
      <div className="record-head">
        <div>
          <span className="eyebrow">
            {operations ? "OPERATIONS WORKSPACE" : "YOUR U SERVICE"}
          </span>
          <h1>
            {operations
              ? "Operations"
              : `স্বাগতম, ${user.first_name || user.username}`}
          </h1>
        </div>
        <button
          className="button secondary"
          onClick={async () => {
            await api("auth/logout/", "POST");
            await refresh();
          }}
        >
          Sign out
        </button>
      </div>
      {operations ? (
        <p className="page-intro">
          Records are restricted to your permissions and assignments. Each
          status change is validated and audited.{" "}
          <a className="text-link" href="/admin/">
            Central administration ↗
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
              <span>{label}</span>
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
            ? ["catalog"]
            : ["support", "notifications", "assistant", "preferences"]),
        ].map((t) => (
          <button
            key={t}
            className={`filter ${tab === t ? "active" : ""}`}
            onClick={() => {
              setTab(t);
              setHistory(null);
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button className="filter" onClick={() => load()} disabled={loading}>
          Refresh
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {tab === "catalog" && <PartnerCatalog />}
      {loading ? (
        <p role="status">Loading your records…</p>
      ) : (
        ["orders", "bookings", "deliveries"].includes(tab) && (
          <>
            {!records.length && (
              <div className="empty">
                <p>No {tab} yet.</p>
                <Link
                  className="button"
                  href={tab === "deliveries" ? "/delivery" : "/catalog"}
                >
                  Explore services
                </Link>
              </div>
            )}
            {records.map((r) => (
              <article className="record" key={r.id}>
                <div className="record-head">
                  <div>
                    <h3>
                      {r.service ||
                        r.items
                          ?.map((i) => `${i.name} × ${i.quantity}`)
                          .join(", ") ||
                        r.description ||
                        r.division_slug}
                    </h3>
                    <p>
                      {new Date(r.created_at).toLocaleString()} ·{" "}
                      {r.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span className="status">
                    {r.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p>
                  ৳{r.total || r.price || r.fee}{" "}
                  {r.payment_status ? `· Payment: ${r.payment_status}` : ""}
                </p>
                {r.scheduled_at && (
                  <p>
                    Appointment: {new Date(r.scheduled_at).toLocaleString()}
                  </p>
                )}
                <div className="record-actions">
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
                        Pay securely
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
                    Status history
                  </button>
                  {tab === "orders" && (
                    <a
                      className="button secondary"
                      href={`/api/v1/orders/${r.id}/invoice/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Invoice
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
                        Cancel request
                      </button>
                    )}
                  {operations &&
                    nextStates[r.status]
                      ?.filter((s) =>
                        tab === "bookings"
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
                      <input
                        name="worker"
                        type="number"
                        min="1"
                        required
                        placeholder="Worker user ID"
                        aria-label="Worker user ID"
                      />
                      <button className="button" disabled={busy}>
                        Assign
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
                        Upload prescription (PDF, JPEG, PNG; up to 5 MB)
                        <input
                          type="file"
                          name="document"
                          accept="application/pdf,image/jpeg,image/png"
                          required
                        />
                      </label>
                      <button className="button" disabled={busy}>
                        Submit for review
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
                      Download prescription
                    </a>
                    <label className="field">
                      Review note
                      <input name="note" required />
                    </label>
                    <label className="field">
                      Decision
                      <select name="decision">
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </label>
                    <button className="button" disabled={busy}>
                      Save authorized review
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
                      <input
                        name="reference"
                        required
                        placeholder="Cash deposit reference"
                        aria-label="Cash deposit reference"
                      />
                      <button className="button" disabled={busy}>
                        Reconcile COD
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
          <h3>Status history</h3>
          {history.length ? (
            history.map((h, i) => (
              <p key={i}>
                {new Date(h.created_at).toLocaleString()} ·{" "}
                {h.before || "Created"} → {h.after}
              </p>
            ))
          ) : (
            <p>No status changes recorded yet.</p>
          )}
          <button className="button secondary" onClick={() => setHistory(null)}>
            Close
          </button>
        </div>
      )}
      {tab === "support" && (
        <>
          <form className="form-panel" onSubmit={support}>
            <h2>How can we help?</h2>
            <label className="field">
              Subject
              <input name="subject" required maxLength={180} />
            </label>
            <label className="field">
              Message
              <textarea name="message" required maxLength={4000} />
            </label>
            <button className="button" disabled={busy}>
              Open support ticket
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
          {!notifications.length && <p>No notifications yet.</p>}
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
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {tab === "assistant" && (
        <form className="form-panel" onSubmit={assistant}>
          <h2>U Service assistant</h2>
          <p className="subtle">
            Answers use approved public knowledge. This assistant cannot change
            orders, approve medicine, or process payments.
          </p>
          <label className="field">
            Your question
            <textarea name="message" required maxLength={1500} />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Looking it up…" : "Ask assistant"}
          </button>
          {answer && <div className="chat-answer">{answer}</div>}
        </form>
      )}
      {tab === "preferences" && (
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
          <h2>Your privacy choices</h2>
          <label className="field">
            <span>
              <input
                type="checkbox"
                name="marketing_consent"
                style={{ width: "auto", minHeight: 0 }}
              />{" "}
              I want to receive promotional messages.
            </span>
          </label>
          <button className="button">Save preference</button>
          <p style={{ marginTop: 20 }}>
            <a className="text-link" href="/api/v1/addresses/export/">
              Export profile and saved addresses
            </a>
          </p>
          <p className="subtle">
            To request account deletion or a full data export, open a support
            ticket. Financial records may require retention.
          </p>
        </form>
      )}
    </div>
  );
}
