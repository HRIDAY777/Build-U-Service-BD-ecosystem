"use client";
import { useState } from "react";
import { api } from "@/lib/api";
type Times = {
  mode: "manual" | "hours" | "closed";
  slots: { start: string; end: string }[];
  duration_minutes: number;
};
export function BookingTimes({
  id,
  day,
  onSelect,
}: {
  id: number;
  day: string;
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
          `offerings/${id}/booking_times/?date=${encodeURIComponent(day)}`,
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
        {busy
          ? "সময় খোঁজা হচ্ছে… / Loading…"
          : "দিনের সময় দেখুন / View day times"}
      </button>
      <p>
        তারিখ বেছে সময়সূচি দেখুন। টিম প্রোভাইডারের সময় নিশ্চিত করবে। / Choose a
        date to review service hours; the team confirms provider availability.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {times?.mode === "manual" && (
        <p role="status">
          এই সেবার সময়সূচি এখনও নির্ধারিত নয়। পছন্দের সময় দিয়ে অনুরোধ করুন। /
          Schedule is unconfigured; request your preferred time.
        </p>
      )}
      {times?.mode === "closed" && (
        <p role="status">
          এই দিনে সেবার সময় পাওয়া যাচ্ছে না। অন্য দিন বাছুন। / No service times
          on this date. Choose another day.
        </p>
      )}
      {times?.mode === "hours" && (
        <>
          <p>
            {times.duration_minutes} মিনিট / minutes · বাংলাদেশ সময় / Bangladesh
            time
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
