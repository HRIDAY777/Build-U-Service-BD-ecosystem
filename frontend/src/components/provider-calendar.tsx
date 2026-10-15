"use client";
import { UiText } from "@/components/ui-text";

import { useState } from "react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";

function dhakaToday() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function shiftDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
type Job = {
  id: string;
  service: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
};
export function ProviderCalendar() {
  const { lang } = useApp();
  const [date, setDate] = useState(dhakaToday);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function changeDate(value: string) {
    setDate(value);
    setJobs(null);
    setError("");
  }
  async function load() {
    setBusy(true);
    setError("");
    setJobs(null);
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
            changeDate(e.target.value);
          }}
        />
      </label>
      <div className="search-row">
        <button type="button" disabled={!date || busy} onClick={() => changeDate(shiftDays(date, -7))}><Text bn="আগের সপ্তাহ" en="Previous week" /></button>
        <button type="button" disabled={busy} onClick={() => changeDate(dhakaToday())}><Text bn="আজ থেকে" en="From today" /></button>
        <button type="button" disabled={!date || busy} onClick={() => changeDate(shiftDays(date, 7))}><Text bn="পরের সপ্তাহ" en="Next week" /></button>
      </div>
      <button
        type="button"
        className="button secondary"
        disabled={!date || busy}
        onClick={load}
      >
        <UiText text={"ক্যালেন্ডার দেখুন / View calendar"} />
      </button>
      {busy && <p role="status"><Text bn="ক্যালেন্ডার লোড হচ্ছে…" en="Loading calendar…" /></p>}
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      {jobs && (
        <>
          <p>
            <UiText text={"বাংলাদেশ সময় / Bangladesh time ·"} />
            {new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).formatRange(new Date(`${date}T00:00:00+06:00`), new Date(`${shiftDays(date, 6)}T00:00:00+06:00`))}
          </p>
          {jobs.length ? (
            jobs.map((job) => (
              <article className="record" key={job.id}>
                <strong>{job.service}</strong>
                <p>
                  {new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
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
