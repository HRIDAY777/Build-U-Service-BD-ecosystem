"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Text } from "./provider";
import { UiText } from "./ui-text";
import { BookingTimes } from "./booking-times";

export function BookingReschedule({
  id,
  offering,
  onSaved,
}: {
  id: string;
  offering: number;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`bookings/${id}/reschedule/`, "POST", {
        scheduled_at: new Date(`${time}+06:00`).toISOString(),
      });
      await onSaved();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button className="button secondary" onClick={() => setOpen(true)}>
        <Text bn="বুকিংয়ের সময় পরিবর্তন" en="Change booking time" />
      </button>
    );
  return (
    <form className="booking-reschedule form-panel" onSubmit={submit}>
      <h3>
        <Text bn="নতুন সময় বাছুন" en="Choose a new time" />
      </h3>
      <label>
        <Text
          bn="নতুন তারিখ ও সময় (বাংলাদেশ সময়)"
          en="New date and time (Bangladesh time)"
        />
        <input
          type="datetime-local"
          required
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      <BookingTimes id={offering} day={time.slice(0, 10)} onSelect={setTime} />
      <p>
        <Text
          bn="মেকানিক পথে রওনা হওয়ার আগে সময় পরিবর্তন করা যাবে। নতুন সময় সেবা ও মেকানিকের সময়সূচির সঙ্গে মিলতে হবে।"
          en="You can change the time before the mechanic starts travelling. The new time must fit the service and provider schedules."
        />
      </p>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      <div className="record-actions">
        <button className="button" disabled={busy}>
          <Text
            bn={busy ? "সংরক্ষণ হচ্ছে…" : "নতুন সময় সংরক্ষণ"}
            en={busy ? "Saving…" : "Save new time"}
          />
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => setOpen(false)}
        >
          <Text bn="বন্ধ করুন" en="Close" />
        </button>
      </div>
    </form>
  );
}
