"use client";
import { UiText } from "@/components/ui-text";

import { useState } from "react";
import { api } from "@/lib/api";

type Schedule = {
  weekly_hours: Record<string, { open: string; close: string }[]>;
  leave_dates: string[];
  duration_minutes?: number;
};
const days = [
  "সোমবার / Monday",
  "মঙ্গলবার / Tuesday",
  "বুধবার / Wednesday",
  "বৃহস্পতিবার / Thursday",
  "শুক্রবার / Friday",
  "শনিবার / Saturday",
  "রবিবার / Sunday",
];
export function ScheduleEditor({
  endpoint,
  provider = false,
}: {
  endpoint: string;
  provider?: boolean;
}) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    setBusy(true);
    setMessage("");
    try {
      const result = await api<Schedule>(endpoint);
      setSchedule(result);
      setEnabled(Object.keys(result.weekly_hours).length > 0);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!schedule) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await api<Schedule>(endpoint, provider ? "PATCH" : "PUT", {
        weekly_hours: enabled ? schedule.weekly_hours : {},
        leave_dates: schedule.leave_dates,
        ...(!provider ? { duration_minutes: schedule.duration_minutes } : {}),
      });
      setSchedule(result);
      setMessage("সময়সূচি সংরক্ষিত হয়েছে / Schedule saved");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  function slots(day: string, value: { open: string; close: string }[]) {
    if (schedule)
      setSchedule({
        ...schedule,
        weekly_hours: { ...schedule.weekly_hours, [day]: value },
      });
  }
  return (
    <section aria-label="Schedule settings">
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={load}
      >
        <UiText text={"সময় ও ছুটি পরিচালনা / Manage schedule"} />
      </button>
      {message && (
        <p role="status">
          <UiText text={message} />
        </p>
      )}
      {schedule && (
        <fieldset disabled={busy}>
          <legend>
            <UiText text={"বাংলাদেশ সময় / Bangladesh time (Asia/Dhaka)"} />
          </legend>
          <p>
            <UiText
              text={
                "সময়সূচি চালু থাকলে ফাঁকা দিন বন্ধ থাকবে। সময়সূচি না থাকলে সময় ম্যানুয়ালি নিশ্চিত করতে হবে। / Empty days are closed when enabled. Unconfigured times require manual confirmation."
              }
            />
          </p>
          {provider && (
            <p>
              <UiText
                text={
                  "নতুন নিয়োগে সময় ও ছুটির নিয়ম প্রযোজ্য। আগে নেওয়া কাজ বদলাতে সমন্বয়কারীর সাথে যোগাযোগ করুন। / Existing assignments remain scheduled; contact coordination to change them."
                }
              />
            </p>
          )}
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (
                  e.target.checked &&
                  Object.keys(schedule.weekly_hours).length === 0
                )
                  setSchedule({ ...schedule, weekly_hours: { "0": [] } });
              }}
            />
            <UiText
              text={"সাপ্তাহিক সময়সূচি ব্যবহার করুন / Use weekly hours"}
            />
          </label>
          {!provider && (
            <label className="field">
              <UiText text={"কাজের সময় (মিনিট) / Duration (minutes)"} />
              <input
                type="number"
                min={1}
                max={1440}
                value={schedule.duration_minutes ?? 60}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    duration_minutes: Number(e.target.value),
                  })
                }
              />
            </label>
          )}
          {enabled &&
            days.map((day, index) => (
              <fieldset key={day}>
                <legend>
                  <UiText text={day} />
                </legend>
                {(schedule.weekly_hours[String(index)] || []).map((slot, n) => (
                  <div className="form-grid" key={n}>
                    <label className="field">
                      <UiText text={"শুরুর সময় / Start"} />
                      <input
                        type="time"
                        value={slot.open}
                        onChange={(e) =>
                          slots(
                            String(index),
                            schedule.weekly_hours[String(index)].map((s, i) =>
                              i === n ? { ...s, open: e.target.value } : s,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      <UiText text={"শেষের সময় / End"} />
                      <input
                        type="time"
                        disabled={slot.close === "24:00"}
                        value={slot.close === "24:00" ? "00:00" : slot.close}
                        onChange={(e) =>
                          slots(
                            String(index),
                            schedule.weekly_hours[String(index)].map((s, i) =>
                              i === n ? { ...s, close: e.target.value } : s,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={slot.close === "24:00"}
                        onChange={(e) =>
                          slots(
                            String(index),
                            schedule.weekly_hours[String(index)].map((s, i) =>
                              i === n
                                ? {
                                    ...s,
                                    close: e.target.checked ? "24:00" : "18:00",
                                  }
                                : s,
                            ),
                          )
                        }
                      />
                      <UiText text={"দিনের শেষ পর্যন্ত / Until midnight"} />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        slots(
                          String(index),
                          schedule.weekly_hours[String(index)].filter(
                            (_, i) => i !== n,
                          ),
                        )
                      }
                    >
                      <UiText text={"সরান / Remove"} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={
                    (schedule.weekly_hours[String(index)] || []).length >= 8
                  }
                  onClick={() =>
                    slots(String(index), [
                      ...(schedule.weekly_hours[String(index)] || []),
                      { open: "09:00", close: "18:00" },
                    ])
                  }
                >
                  <UiText text={"সময় যোগ করুন / Add hours"} />
                </button>
              </fieldset>
            ))}
          <p>
            <UiText
              text={
                "শেষের সময় শুরুর আগে হলে পরের দিন পর্যন্ত গণনা হবে। / Earlier end times continue into the next day."
              }
            />
          </p>
          <label className="field">
            <UiText text={"ছুটির তারিখ / Leave date"} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={
              !date ||
              schedule.leave_dates.includes(date) ||
              schedule.leave_dates.length >= 366
            }
            onClick={() => {
              setSchedule({
                ...schedule,
                leave_dates: [...schedule.leave_dates, date].sort(),
              });
              setDate("");
            }}
          >
            <UiText text={"ছুটি যোগ করুন / Add leave"} />
          </button>
          <ul>
            {schedule.leave_dates.map((day) => (
              <li key={day}>
                {day}{" "}
                <button
                  type="button"
                  onClick={() =>
                    setSchedule({
                      ...schedule,
                      leave_dates: schedule.leave_dates.filter(
                        (d) => d !== day,
                      ),
                    })
                  }
                >
                  <UiText text={"সরান / Remove"} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="button" onClick={save}>
            <UiText text={"সময়সূচি সংরক্ষণ / Save schedule"} />
          </button>
        </fieldset>
      )}
    </section>
  );
}
