"use client";
import { useState } from "react";
import { api, PageResult } from "@/lib/api";
import { Text } from "./provider";
import { UiText } from "./ui-text";

export const ticketCategories = [
  ["general", "সাধারণ", "General"],
  ["order", "অর্ডার", "Order"],
  ["booking", "সেবা বুকিং", "Booking"],
  ["delivery", "ডেলিভারি", "Delivery"],
  ["payment", "পেমেন্ট", "Payment"],
  ["account", "অ্যাকাউন্ট", "Account"],
];
export const ticketPriorities = [
  ["low", "কম", "Low"],
  ["normal", "সাধারণ", "Normal"],
  ["high", "বেশি", "High"],
  ["urgent", "জরুরি", "Urgent"],
];
export function TicketCategory() {
  return (
    <label className="field">
      <Text bn="সমস্যার ধরন" en="Issue category" />
      <select name="category" defaultValue="general">
        {ticketCategories.map(([value, bn, en]) => (
          <option key={value} value={value}>
            <Text bn={bn} en={en} />
          </option>
        ))}
      </select>
    </label>
  );
}
export function TicketRouting({
  id,
  category,
  priority,
  assignedTo,
  onSaved,
}: {
  id: number;
  category: string;
  priority: string;
  assignedTo: number | null;
  onSaved: () => void;
}) {
  const [workers, setWorkers] = useState<{ id: number; name: string }[] | null>(
    null,
  );
  const [next, setNext] = useState(false),
    [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load(number: number) {
    setBusy(true);
    setError("");
    try {
      const data = await api<PageResult<{ id: number; name: string }>>(
        `tickets/responders/?page=${number}`,
      );
      setWorkers((old) =>
        number === 1 ? data.results : [...(old || []), ...data.results],
      );
      setNext(!!data.next);
      setPage(number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="support-routing"
      onToggle={(e) => {
        if (e.currentTarget.open && workers === null && !busy) void load(1);
      }}
    >
      <summary>
        <Text
          bn="দায়িত্ব ও জরুরিতা নির্ধারণ"
          en="Assign responsibility and priority"
        />
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            await api(`tickets/${id}/route_ticket/`, "POST", {
              category: form.get("category"),
              priority: form.get("priority"),
              assigned_to: form.get("assigned_to")
                ? Number(form.get("assigned_to"))
                : null,
            });
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <Text bn="সমস্যার ধরন" en="Issue category" />
          <select name="category" defaultValue={category}>
            {ticketCategories.map(([v, bn, en]) => (
              <option key={v} value={v}>
                <Text bn={bn} en={en} />
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <Text bn="জরুরিতা" en="Priority" />
          <select name="priority" defaultValue={priority}>
            {ticketPriorities.map(([v, bn, en]) => (
              <option key={v} value={v}>
                <Text bn={bn} en={en} />
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <Text bn="দায়িত্বপ্রাপ্ত কর্মী" en="Assigned team member" />
          <select
            name="assigned_to"
            key={`${page}-${assignedTo}`}
            defaultValue={assignedTo || ""}
            disabled={!workers || busy}
          >
            <option value="">
              <Text bn="কাউকে বরাদ্দ দেওয়া হয়নি" en="Unassigned" />
            </option>
            {!!assignedTo && !workers?.some((w) => w.id === assignedTo) && (
              <option value={assignedTo}>
                <Text bn="বর্তমান কর্মী" en="Current assignee" />
              </option>
            )}
            {workers?.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </label>
        {next && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void load(page + 1)}
          >
            <Text bn="আরও কর্মী দেখুন" en="Load more team members" />
          </button>
        )}
        {error && (
          <p className="error" role="alert">
            <UiText text={error} />
          </p>
        )}
        {!workers && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void load(1)}
          >
            <Text bn="কর্মীর তালিকা লোড করুন" en="Load team members" />
          </button>
        )}
        <button className="button" disabled={busy || !workers}>
          <Text bn="দায়িত্ব সংরক্ষণ" en="Save routing" />
        </button>
      </form>
    </details>
  );
}
