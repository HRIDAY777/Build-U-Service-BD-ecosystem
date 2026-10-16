"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";
import { UiText } from "./ui-text";
import { MechanicQuoteHistory } from "./mechanic-quote-history";

export type MechanicQuoteData = {
  revision?: string;
  status?: string;
  items?: {
    description: string;
    quantity: number;
    unit_price: string;
    total?: string;
  }[];
  note?: string;
  extra_total?: string;
};

export function MechanicQuote({
  id,
  quote,
  editor = false,
  customer = false,
  onSaved,
}: {
  id: string;
  quote?: MechanicQuoteData;
  editor?: boolean;
  customer?: boolean;
  onSaved: () => void;
}) {
  const { lang } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [items, setItems] = useState(
    quote?.items?.map((item) => ({ ...item })) || [
      { description: "", quantity: 1, unit_price: "0.00" },
    ],
  );
  async function send(method: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(`bookings/${id}/mechanic_quote/`, method, body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!quote?.revision && !editor) return null;
  return (
    <section className="mechanic-summary mechanic-quote">
      <h3>
        <Text
          bn="মেরামত ও যন্ত্রাংশের কোটেশন"
          en="Repair and parts quotation"
        />
      </h3>
      <p className="subtle">
        <Text
          bn="এটি বুকিংয়ের মূল সেবা মূল্যের অতিরিক্ত খরচ। সম্মতি দিলে পেমেন্ট হয় না।"
          en="These costs are additional to the original service fee. Acceptance does not make a payment."
        />
      </p>
      {quote?.revision && (
        <>
          <p>
            <Text bn="সিদ্ধান্ত:" en="Decision:" />{" "}
            <Text
              bn={
                quote.status === "accepted"
                  ? "সম্মত"
                  : quote.status === "rejected"
                    ? "প্রত্যাখ্যাত"
                    : "সম্মতির অপেক্ষায়"
              }
              en={
                quote.status === "accepted"
                  ? "Accepted"
                  : quote.status === "rejected"
                    ? "Rejected"
                    : "Awaiting acceptance"
              }
            />
          </p>
          <ul>
            {quote.items?.map((item, i) => (
              <li key={i}>
                {item.description} · {item.quantity} × ৳{item.unit_price} = ৳
                {item.total}
              </li>
            ))}
          </ul>
          <p>
            <strong>
              <Text bn="অতিরিক্ত মোট:" en="Additional total:" /> ৳
              {quote.extra_total}
            </strong>
          </p>
          {quote.note && <p>{quote.note}</p>}
          <MechanicQuoteHistory key={`${quote.revision}-${quote.status}`} id={id} />
          {customer && quote.status === "pending" && (
            <div className="search-row">
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void send("POST", {
                    revision: quote.revision,
                    decision: "accepted",
                  })
                }
              >
                <Text bn="খরচে সম্মতি দিন" en="Accept these costs" />
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void send("POST", {
                    revision: quote.revision,
                    decision: "rejected",
                  })
                }
              >
                <Text bn="প্রত্যাখ্যান করুন" en="Reject quote" />
              </button>
            </div>
          )}
        </>
      )}
      {editor && (
        <form
          className="form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void send("PUT", {
              revision: quote?.revision || "",
              items: items.map(({ description, quantity, unit_price }) => ({
                description,
                quantity,
                unit_price,
              })),
              note: form.get("note"),
            });
          }}
        >
          {items.map((item, i) => (
            <fieldset key={i} disabled={busy}>
              <legend>
                <Text bn="খরচের বিবরণ" en="Cost item" /> {i + 1}
              </legend>
              <label className="field">
                <Text bn="কাজ বা যন্ত্রাংশ" en="Work or part" />
                <input
                  required
                  maxLength={180}
                  value={item.description}
                  onChange={(e) =>
                    setItems(
                      items.map((v, n) =>
                        n === i ? { ...v, description: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                <Text bn="পরিমাণ" en="Quantity" />
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  step={1}
                  value={item.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((v, n) =>
                        n === i
                          ? { ...v, quantity: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                <Text bn="প্রতি একক মূল্য (৳)" en="Unit price (BDT)" />
                <input
                  type="number"
                  required
                  min={0}
                  max={99999999}
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) =>
                    setItems(
                      items.map((v, n) =>
                        n === i ? { ...v, unit_price: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              {items.length > 1 && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setItems(items.filter((_, n) => n !== i))}
                >
                  <Text bn="বাদ দিন" en="Remove item" />
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={busy || items.length >= 20}
            onClick={() =>
              setItems([
                ...items,
                { description: "", quantity: 1, unit_price: "0.00" },
              ])
            }
          >
            <Text bn="আরও খরচ যোগ করুন" en="Add cost item" />
          </button>
          <label className="field">
            <Text bn="ব্যাখ্যা" en="Explanation" />
            <textarea
              name="note"
              maxLength={1000}
              defaultValue={quote?.note || ""}
            />
          </label>
          <p className="subtle">
            <Text
              bn="প্রতিবার সংশোধিত কোটেশন পাঠালে গ্রাহকের নতুন সম্মতি প্রয়োজন হবে।"
              en="Every revised quotation requires fresh customer acceptance."
            />
          </p>
          <button className="button" disabled={busy}>
            {busy ? (
              lang === "bn" ? (
                "পাঠানো হচ্ছে…"
              ) : (
                "Sending…"
              )
            ) : (
              <Text bn="কোটেশন পাঠান" en="Send quotation" />
            )}
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
    </section>
  );
}
