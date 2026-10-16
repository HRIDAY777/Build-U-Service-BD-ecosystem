"use client";
import { UiText } from "@/components/ui-text";
import { Text } from "@/components/provider";
import {
  TicketCategory,
  TicketRouting,
  ticketCategories,
  ticketPriorities,
} from "@/components/support-routing";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "@/components/provider";

type Ticket = {
  id: number;
  subject: string;
  message: string;
  response: string;
  status: string;
  created_at: string;
  is_owner: boolean;
  can_respond: boolean;
  can_route: boolean;
  category: string;
  priority: string;
  assigned_to: number | null;
  assigned_name: string;
};
type Message = {
  id: number;
  sender_role: string;
  body: string;
  created_at: string;
};

function Conversation({
  ticket,
  busy,
  submit,
}: {
  ticket: Ticket;
  busy: boolean;
  submit: (e: FormEvent<HTMLFormElement>, path: string) => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [messages, setMessages] = useState<PageResult<Message> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let current = true;
    setLoading(true);
    setError("");
    api<PageResult<Message>>(`tickets/${ticket.id}/messages/?page=${page}`)
      .then((data) => {
        if (current) setMessages(data);
      })
      .catch((e) => {
        if (current)
          setError(e instanceof Error ? e.message : "Unable to load messages");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [ticket, page, revision, open]);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <UiText text={"Conversation / কথোপকথন"} />
      </summary>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      {loading ? (
        <p>
          <UiText text={"Loading…"} />
        </p>
      ) : (
        !messages?.results.length && (
          <p>
            <UiText text={"No follow-up messages yet."} />
          </p>
        )
      )}
      {messages?.results.map((message) => (
        <div className="record" key={message.id}>
          <strong>
            {message.sender_role === "team" ? (
              <UiText text={"Support team / সাপোর্ট টিম"} />
            ) : (
              <UiText text={"Customer / গ্রাহক"} />
            )}
          </strong>
          <p>{new Date(message.created_at).toLocaleString()}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
        </div>
      ))}
      <div className="record-actions">
        <button
          className="button secondary"
          disabled={loading || page === 1}
          onClick={() => setPage(page - 1)}
        >
          <UiText text={"Newer messages"} />
        </button>
        <button
          className="button secondary"
          disabled={loading || !messages?.next}
          onClick={() => setPage(page + 1)}
        >
          <UiText text={"Older messages"} />
        </button>
      </div>
      {ticket.is_owner && ticket.status !== "resolved" && (
        <form
          onSubmit={async (e) => {
            await submit(e, `tickets/${ticket.id}/follow_up/`);
            setPage(1);
            setRevision((value) => value + 1);
          }}
        >
          <label className="field">
            <UiText text={"Add details / আরও বিস্তারিত"} />
            <textarea name="body" required maxLength={5000} />
          </label>
          <button className="button" disabled={busy}>
            <UiText text={"Send follow-up / পাঠান"} />
          </button>
        </form>
      )}
    </details>
  );
}

export default function SupportPage() {
  const { user, toast } = useApp();
  const [tickets, setTickets] = useState<PageResult<Ticket> | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({
    status: "",
    category: "",
    priority: "",
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setTickets(
        await api<PageResult<Ticket>>(
          `tickets/?page=${page}&${new URLSearchParams(filter)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load tickets");
    } finally {
      setLoading(false);
    }
  }, [user, page, filter]);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>, path: string) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api(path, "POST", Object.fromEntries(new FormData(form)));
      form.reset();
      toast("Saved / সংরক্ষিত হয়েছে");
      if (path === "tickets/" && page !== 1) setPage(1);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save ticket");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>
          <UiText text={"Support / সহায়তা"} />
        </h1>
        <Link className="button" href="/login">
          <UiText text={"Sign in"} />
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>
        <UiText text={"Support / সহায়তা"} />
      </h1>
      <p>
        <UiText
          text={
            "Send your question and follow the team’s reply. Reopen a resolved ticket if you still need help."
          }
        />
      </p>
      {error && (
        <p role="alert" className="error">
          <UiText text={error} />
        </p>
      )}
      <form className="form-panel" onSubmit={(e) => submit(e, "tickets/")}>
        <label className="field">
          <UiText text={"Subject / বিষয়"} />
          <input name="subject" required maxLength={180} />
        </label>
        <TicketCategory />
        <label className="field">
          <UiText text={"How can we help? / বিস্তারিত"} />
          <textarea name="message" required maxLength={5000} />
        </label>
        <button className="button" disabled={busy}>
          <UiText text={"Open ticket"} />
        </button>
      </form>
      <h2>
        <UiText text={"Tickets / অনুরোধসমূহ"} />
      </h2>
      <div className="search-row">
        {(
          [
            [
              "status",
              "অবস্থা",
              "Status",
              [
                ["open", "নতুন", "Open"],
                ["in_progress", "চলমান", "In progress"],
                ["resolved", "সমাধান হয়েছে", "Resolved"],
              ],
            ],
            ["category", "সমস্যার ধরন", "Issue category", ticketCategories],
            ["priority", "জরুরিতা", "Priority", ticketPriorities],
          ] as [keyof typeof filter, string, string, string[][]][]
        ).map(([key, bn, en, options]) => (
          <label className="field" key={key}>
            <Text bn={bn} en={en} />
            <select
              value={filter[key]}
              onChange={(e) => {
                setFilter({ ...filter, [key]: e.target.value });
                setPage(1);
              }}
            >
              <option value="">
                <Text bn="সব" en="All" />
              </option>
              {options.map(([value, labelBn, labelEn]) => (
                <option key={value} value={value}>
                  <Text bn={labelBn} en={labelEn} />
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {loading ? (
        <p>
          <UiText text={"Loading…"} />
        </p>
      ) : (
        !tickets?.results.length && (
          <p>
            <UiText text={"No tickets on this page."} />
          </p>
        )
      )}
      {tickets?.results.map((ticket) => (
        <article className="record" key={ticket.id}>
          <h3>
            #{ticket.id} · {ticket.subject}
          </h3>
          <span className="status">{ticket.status.replaceAll("_", " ")}</span>
          <p>
            {[
              ticketCategories.find((item) => item[0] === ticket.category),
              ticketPriorities.find((item) => item[0] === ticket.priority),
            ]
              .filter(Boolean)
              .map((item) => (
                <span key={item![0]}>
                  <Text bn={item![1]} en={item![2]} /> ·{" "}
                </span>
              ))}
            <Text bn="দায়িত্বে:" en="Assigned:" />{" "}
            {ticket.assigned_name || (
              <Text bn="সাপোর্ট টিম" en="Support team" />
            )}
          </p>
          {ticket.can_route && ticket.status !== "resolved" && (
            <TicketRouting
              key={`${ticket.id}-${ticket.category}-${ticket.priority}-${ticket.assigned_to}`}
              id={ticket.id}
              category={ticket.category}
              priority={ticket.priority}
              assignedTo={ticket.assigned_to}
              onSaved={() => void load()}
            />
          )}
          <p>{new Date(ticket.created_at).toLocaleString()}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{ticket.message}</p>
          <h4>
            <UiText text={"Team reply / টিমের উত্তর"} />
          </h4>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {ticket.response || "Awaiting a response / উত্তরের অপেক্ষায়"}
          </p>
          <Conversation ticket={ticket} busy={busy} submit={submit} />
          {ticket.can_respond && ticket.status !== "resolved" && (
            <form onSubmit={(e) => submit(e, `tickets/${ticket.id}/respond/`)}>
              <label className="field">
                <UiText text={"Reply for customer"} />
                <textarea name="response" required maxLength={5000} />
              </label>
              <label className="field">
                <UiText text={"Status"} />
                <select name="status">
                  <option value="in_progress">
                    <UiText text={"In progress"} />
                  </option>
                  <option value="resolved">
                    <UiText text={"Resolved"} />
                  </option>
                </select>
              </label>
              <button className="button" disabled={busy || loading}>
                <UiText text={"Send reply"} />
              </button>
            </form>
          )}
          {ticket.is_owner && ticket.status === "resolved" && (
            <form onSubmit={(e) => submit(e, `tickets/${ticket.id}/reopen/`)}>
              <button className="button secondary" disabled={busy || loading}>
                <UiText text={"Reopen my ticket / আবার সহায়তা চাই"} />
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
          <UiText text={"Previous"} />
        </button>
        <span>
          <UiText text={"Page"} />
          {page}
        </span>
        <button
          className="button secondary"
          disabled={busy || loading || !tickets?.next}
          onClick={() => setPage(page + 1)}
        >
          <UiText text={"Next"} />
        </button>
      </div>
    </div>
  );
}
