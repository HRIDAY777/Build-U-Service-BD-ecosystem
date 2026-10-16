"use client";
import { UiText } from "@/components/ui-text";

import { useState } from "react";
import { api } from "@/lib/api";
import { Text } from "./provider";
type Times = {
  mode: "manual" | "hours" | "closed";
  slots: { start: string; end: string }[];
  duration_minutes: number;
  availability_checked?: boolean;
};
export function BookingTimes({
  id,
  day,
  area = "",
  onSelect,
}: {
  id: number;
  day: string;
  area?: string;
  onSelect: (value: string) => void;
}) {
  const [times, setTimes] = useState<Times | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    setTimes(null);
    try {
      setTimes(
        await api<Times>(
          `offerings/${id}/booking_times/?date=${encodeURIComponent(day)}${area ? `&area=${encodeURIComponent(area)}` : ""}`,
        ),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Suggested booking times">
      <button
        type="button"
        className="button secondary"
        disabled={!day || busy}
        onClick={load}
      >
        {busy ? (
          <UiText text={"সময় খোঁজা হচ্ছে… / Loading…"} />
        ) : (
          <UiText text={"দিনের সময় দেখুন / View day times"} />
        )}
      </button>
      <p>
        <Text bn={area ? "এলাকা ও কর্মীর বর্তমান সময় মিলিয়ে সম্ভাব্য সময় দেখুন। এটি সময় সংরক্ষণ করে না; টিম নিশ্চিত করবে।" : "তারিখ বেছে সেবার সময় দেখুন। নিচে সার্ভিস এরিয়া বাছলে কর্মীর উপলব্ধতাও যাচাই হবে।"} en={area ? "Review times against the area and current provider availability. This does not reserve a slot; the team confirms it." : "Choose a date to review service hours. Select a service zone below to also check provider availability."} />
      </p>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      {times?.mode === "manual" && (
        <p role="status">
          <UiText
            text={
              "এই সেবার সময়সূচি এখনও নির্ধারিত নয়। পছন্দের সময় দিয়ে অনুরোধ করুন। / Schedule is unconfigured; request your preferred time."
            }
          />
        </p>
      )}
      {times?.mode === "closed" && (
        <p role="status">
          <UiText
            text={
              "এই দিনে সেবার সময় পাওয়া যাচ্ছে না। অন্য দিন বাছুন। / No service times on this date. Choose another day."
            }
          />
        </p>
      )}
      {times?.mode === "hours" && (
        <>
          {times.availability_checked && !times.slots.length && <p role="status"><Text bn="এই এলাকায় ওই দিনের সময়গুলোতে উপযুক্ত কর্মী পাওয়া যাচ্ছে না। অন্য দিন বাছুন বা সাপোর্টে জানান।" en="No eligible providers are currently available for these times in this area. Choose another day or contact support." /></p>}
          <p>
            {times.duration_minutes}{" "}
            <UiText text={"মিনিট / minutes · বাংলাদেশ সময় / Bangladesh time"} />
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {times.slots.map((slot) => (
              <button
                className="button secondary"
                type="button"
                key={slot.start}
                onClick={() => onSelect(slot.start.slice(0, 16))}
              >
                {slot.start.slice(11, 16)}–{slot.end.slice(11, 16)}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
