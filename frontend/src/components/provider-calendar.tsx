"use client";
import { UiText } from "@/components/ui-text";

import { useState } from "react";
import { api } from "@/lib/api";
type Job = {
  id: string;
  service: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
};
export function ProviderCalendar() {
  const [date, setDate] = useState("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setJobs(
        (await api<{ results: Job[] }>(`bookings/calendar/?date=${date}`))
          .results,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Work calendar">
      <h2>
        <UiText text={"কাজের ক্যালেন্ডার / Work calendar"} />
      </h2>
      <label className="field">
        <UiText text={"সাত দিনের শুরু / Start of seven days"} />
        <input
          type="date"
          disabled={busy}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setJobs(null);
          }}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={!date || busy}
        onClick={load}
      >
        <UiText text={"ক্যালেন্ডার দেখুন / View calendar"} />
      </button>
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      {jobs && (
        <>
          <p>
            <UiText text={"বাংলাদেশ সময় / Bangladesh time ·"} />
            {date}
          </p>
          {jobs.length ? (
            jobs.map((job) => (
              <article className="record" key={job.id}>
                <strong>{job.service}</strong>
                <p>
                  {new Intl.DateTimeFormat("bn-BD", {
                    timeZone: "Asia/Dhaka",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(job.scheduled_at))}{" "}
                  · {job.duration_minutes}
                  <UiText text={"মিনিট ·"} />
                  <UiText text={job.status} />
                </p>
              </article>
            ))
          ) : (
            <p>
              <UiText
                text={
                  "এই সাত দিনে চলমান কাজ নেই / No active appointments in these seven days."
                }
              />
            </p>
          )}
        </>
      )}
    </section>
  );
}
