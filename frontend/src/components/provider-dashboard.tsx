"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import {
  MechanicSummary,
  MechanicReportView,
  MechanicReportEditor,
  type MechanicReport,
  type MechanicDetails,
} from "./mechanic-details";
import { ScheduleEditor } from "./schedule-editor";
import { MechanicPhoto } from "./mechanic-photo";
import { ProviderCalendar } from "./provider-calendar";
import { useCallback, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";

type Job = {
  has_problem_photo?: boolean;
  id: string;
  service: string;
  scheduled_at: string;
  duration_minutes: number;
  service_details?: MechanicDetails;
  mechanic_report?: MechanicReport;
  status: string;
  address: { recipient: string; phone: string; line: string; area: string };
  notes: string;
  available_actions: string[];
};
type Profile = {
  name: string;
  available: boolean;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
};
const labels: Record<string, string> = {
  assigned: "নিয়োগ দেওয়া হয়েছে",
  on_the_way: "রওনা হয়েছি",
  arrived: "পৌঁছেছি",
  in_progress: "কাজ চলছে",
  waiting_for_parts: "যন্ত্রাংশের অপেক্ষা",
  completed: "কাজ সম্পন্ন",
  failed: "কাজ সম্পন্ন করা যায়নি",
  cancelled: "বাতিল",
  confirmed: "নিশ্চিত",
};
export function ProviderDashboard() {
  const { user } = useApp();
  const [stored, setStored] = useState<{
    owner: number;
    profile: Profile;
    jobs: PageResult<Job>;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = user?.roles.includes("Provider");
  const data = stored?.owner === user?.id && allowed ? stored : null;
  const load = useCallback(async () => {
    if (!user || !allowed) return;
    const [profile, jobs] = await Promise.all([
      api<Profile>("bookings/provider_profile/"),
      api<PageResult<Job>>(
        `bookings/?assigned_to_me=1&page=${page}&status=${encodeURIComponent(status)}`,
      ),
    ]);
    return { owner: user.id, profile, jobs };
  }, [user, allowed, page, status]);
  useEffect(() => {
    let current = true;
    void load()
      .then((value) => {
        if (current && value) {
          setStored(value);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(String(e.message));
      });
    return () => {
      current = false;
    };
  }, [load]);
  async function act(path?: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      if (path)
        await api(
          path,
          path.endsWith("provider_profile/") ? "PATCH" : "POST",
          body,
        );
      const value = await load();
      if (value) setStored(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>
          <UiText text={"প্রোভাইডার পোর্টাল"} />
        </h1>
        <Link className="button" href="/login">
          <UiText text={"লগইন করুন"} />
        </Link>
      </div>
    );
  if (!allowed)
    return (
      <div className="page-wrap">
        <h1>
          <UiText text={"প্রোভাইডার হিসেবে যুক্ত হোন"} />
        </h1>
        <p>
          <UiText
            text={"অনুমোদিত Provider অ্যাকাউন্ট দিয়ে কাজ পরিচালনা করুন।"}
          />
        </p>
        <Link className="button" href="/contact?interest=provider">
          <UiText text={"আবেদন করুন"} />
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>
        <UiText text={"প্রোভাইডার পোর্টাল / Provider workspace"} />
      </h1>
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      {data ? (
        <>
          <h2>{data.profile.name}</h2>
          <div className="stat-grid">
            <article className="record">
              <UiText text={"চলমান কাজ"} />
              <strong>{data.profile.active_jobs}</strong>
            </article>
            <article className="record">
              <UiText text={"সম্পন্ন কাজ"} />
              <strong>{data.profile.completed_jobs}</strong>
            </article>
            <article className="record">
              <UiText text={"অসম্পন্ন কাজ"} />
              <strong>{data.profile.failed_jobs}</strong>
            </article>
          </div>
          <label className="field">
            <span>
              <input
                type="checkbox"
                checked={data.profile.available}
                disabled={busy}
                onChange={(e) =>
                  void act("bookings/provider_profile/", {
                    available: e.target.checked,
                  })
                }
              />{" "}
              <UiText text={"নতুন কাজ নিতে প্রস্তুত"} />
            </span>
          </label>
          <p className="subtle">
            <UiText
              text={
                "বন্ধ করলে নতুন নিয়োগ দেওয়া যাবে না। আগে নেওয়া কাজগুলো সম্পন্ন করতে পারবেন। একই সময়ে একাধিক কাজের নিয়োগ আটকানো হয়।"
              }
            />
          </p>
        </>
      ) : (
        <p role="status">
          <UiText text={"তথ্য লোড হচ্ছে…"} />
        </p>
      )}
      <div className="search-row">
        <label className="field">
          <UiText text={"কাজের অবস্থা"} />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              <UiText text={"সব কাজ"} />
            </option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                <UiText text={label} />
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void act()}
        >
          <UiText text={"রিফ্রেশ"} />
        </button>
      </div>
      {data?.jobs.results.map((job) => (
        <article className="record" key={job.id}>
          <h2>{job.service}</h2>
          <p>
            <UiText text={labels[job.status] || job.status} /> ·{" "}
            {new Date(job.scheduled_at).toLocaleString("bn-BD", {
              timeZone: "Asia/Dhaka",
            })}
          </p>
          <p>
            {job.duration_minutes}
            <UiText text={"মিনিট / minutes · বাংলাদেশ সময় / Bangladesh time"} />
          </p>
          <small>
            <UiText text={"বুকিং:"} />
            {job.id}
          </small>
          <p>
            {job.address.recipient}
            <br />
            {job.address.line}, {job.address.area}
          </p>
          <a className="text-link" href={`tel:${job.address.phone}`}>
            <UiText text={"কল করুন:"} />
            {job.address.phone}
          </a>
          {job.notes && (
            <p>
              <UiText text={"নির্দেশনা:"} />
              {job.notes}
            </p>
          )}
          <MechanicSummary details={job.service_details} />
          <MechanicReportView report={job.mechanic_report} />
          <MechanicPhoto id={job.id} hasPhoto={job.has_problem_photo} />
          {job.service_details?.vehicle_type &&
            ["in_progress", "waiting_for_parts"].includes(job.status) && (
              <MechanicReportEditor
                id={job.id}
                report={job.mechanic_report}
                onSaved={() => void act()}
              />
            )}
          <div className="search-row">
            {job.available_actions.map((state) => (
              <button
                className="button secondary"
                key={state}
                disabled={busy}
                onClick={() =>
                  void act(`bookings/${job.id}/transition/`, { status: state })
                }
              >
                <UiText text={labels[state] || state} />
              </button>
            ))}
          </div>
        </article>
      ))}
      {data && !data.jobs.count && (
        <p>
          <UiText text={"এই অবস্থায় কোনো নিয়োগকৃত কাজ নেই।"} />
        </p>
      )}
      <ScheduleEditor
        key={`schedule-${user.id}`}
        endpoint="bookings/provider_profile/"
        provider
      />
      <ProviderCalendar key={`calendar-${user.id}`} />
      <div className="search-row">
        <button
          className="button secondary"
          disabled={page === 1 || busy}
          onClick={() => setPage((p) => p - 1)}
        >
          <UiText text={"আগের পৃষ্ঠা"} />
        </button>
        <span>
          <UiText text={"পৃষ্ঠা"} />
          {page}
        </span>
        <button
          className="button secondary"
          disabled={!data?.jobs.next || busy}
          onClick={() => setPage((p) => p + 1)}
        >
          <UiText text={"পরের পৃষ্ঠা"} />
        </button>
      </div>
      <p>
        <Link href="/support">
          <UiText text={"সাপোর্টের সাহায্য নিন"} />
        </Link>
      </p>
    </div>
  );
}

export function ProviderPicker({ bookingId }: { bookingId: string }) {
  const { user } = useApp();
  const [stored, setStored] = useState<{
    owner: number;
    booking: string;
    workers: { id: number; name: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    if (!user) return;
    void (async () => {
      let page = 1;
      const workers: { id: number; name: string }[] = [];
      while (true) {
        const result = await api<PageResult<{ id: number; name: string }>>(
          `bookings/providers/?${new URLSearchParams({ page: String(page), booking: bookingId })}`,
        );
        workers.push(...result.results);
        if (!result.next) break;
        page++;
      }
      if (current) { setStored({ owner: user.id, booking: bookingId, workers }); setError(""); }
    })().catch((e) => {
      if (current) setError(String(e.message));
    });
    return () => {
      current = false;
    };
  }, [user, bookingId]);
  const workers = stored?.owner === user?.id && stored?.booking === bookingId ? stored?.workers || [] : [];
  return (
    <label className="field">
      <UiText text={"প্রোভাইডার বাছুন"} />
      <select name="worker" required defaultValue="">
        <option value="">
          <UiText text={"নাম বাছুন"} />
        </option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      {error && (
        <small role="alert">
          <UiText text={error} />
        </small>
      )}
    </label>
  );
}
