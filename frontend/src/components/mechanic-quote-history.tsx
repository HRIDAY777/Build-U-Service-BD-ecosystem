"use client";
import { useState } from "react";
import { api, PageResult } from "@/lib/api";
import { Text, useApp } from "./provider";
import { UiText } from "./ui-text";
import type { MechanicQuoteData } from "./mechanic-quote";

type Event = { id: number; recorded_at: string; quote: MechanicQuoteData };
export function MechanicQuoteHistory({ id }: { id: string }) {
  const { lang } = useApp();
  const [data, setData] = useState<PageResult<Event> | null>(null);
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load(number: number) {
    setBusy(true);
    setError("");
    setData(null);
    try {
      setData(
        await api<PageResult<Event>>(
          `bookings/${id}/mechanic_quote_history/?page=${number}`,
        ),
      );
      setPage(number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mechanic-quote-history">
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={() => void load(1)}
      >
        <Text
          bn={busy ? "ইতিহাস লোড হচ্ছে…" : "কোটেশনের ইতিহাস দেখুন"}
          en={busy ? "Loading history…" : "View quotation history"}
        />
      </button>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      {data && (
        <>
          <h4>
            <Text
              bn="খরচ ও সিদ্ধান্তের ইতিহাস"
              en="Cost and decision history"
            />
          </h4>
          <p className="subtle">
            <Text
              bn="সর্বশেষ পরিবর্তন আগে দেখানো হচ্ছে। পুরোনো প্রস্তাব এখানে গ্রহণ করা যাবে না।"
              en="Latest changes appear first. Historical proposals cannot be accepted here."
            />
          </p>
          {!data.results.length && (
            <p>
              <Text
                bn="এখনও কোটেশনের ইতিহাস নেই।"
                en="No quotation history yet."
              />
            </p>
          )}
          {data.results.map((event) => (
            <article className="record" key={event.id}>
              <strong>
                <Text
                  bn={
                    event.quote.status === "accepted"
                      ? "গ্রাহক সম্মতি দিয়েছেন"
                      : event.quote.status === "rejected"
                        ? "গ্রাহক প্রত্যাখ্যান করেছেন"
                        : "কোটেশন পাঠানো হয়েছে"
                  }
                  en={
                    event.quote.status === "accepted"
                      ? "Customer accepted"
                      : event.quote.status === "rejected"
                        ? "Customer rejected"
                        : "Quotation sent"
                  }
                />
              </strong>
              <p>
                {new Date(event.recorded_at).toLocaleString(
                  lang === "bn" ? "bn-BD" : "en-GB",
                  { timeZone: "Asia/Dhaka" },
                )}
              </p>
              <p>
                <Text bn="অতিরিক্ত মোট:" en="Additional total:" /> ৳
                {event.quote.extra_total}
              </p>
              <ul>
                {event.quote.items?.map((item, index) => (
                  <li key={index}>
                    {item.description} · {item.quantity} × ৳{item.unit_price} =
                    ৳{item.total}
                  </li>
                ))}
              </ul>
              {event.quote.note && <p>{event.quote.note}</p>}
            </article>
          ))}
          <div className="record-actions">
            <button
              type="button"
              className="button secondary"
              disabled={busy || page === 1}
              onClick={() => void load(page - 1)}
            >
              <Text bn="আগের পৃষ্ঠা" en="Previous page" />
            </button>
            <span>
              <Text bn="পৃষ্ঠা" en="Page" /> {page}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={busy || !data.next}
              onClick={() => void load(page + 1)}
            >
              <Text bn="পরের পৃষ্ঠা" en="Next page" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
