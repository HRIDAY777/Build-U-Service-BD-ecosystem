"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";

type Event = {
  id: number;
  action: string;
  date: string;
  actor: string;
  status: string | null;
};
const labels: Record<string, [string, string]> = {
  "project.application.submitted": ["আবেদন জমা হয়েছে", "Application submitted"],
  "project.application.reviewed": [
    "আবেদনের অবস্থা পরিবর্তন",
    "Application status changed",
  ],
  "project.application.cancelled": [
    "আবেদন বাতিল হয়েছে",
    "Application cancelled",
  ],
  "project.application.acknowledged": [
    "চুক্তিতে সম্মতি দেওয়া হয়েছে",
    "Agreement acknowledged",
  ],
  "project.agreement.uploaded": [
    "চুক্তির নথি আপলোড হয়েছে",
    "Agreement uploaded",
  ],
  "project.ledger.recorded": ["লেনদেন রেকর্ড হয়েছে", "Transaction recorded"],
};
const statusLabels: Record<string, string> = {
  submitted: "জমা হয়েছে",
  reviewing: "পর্যালোচনা চলছে",
  approved: "অনুমোদিত",
  active: "চলমান",
  completed: "সম্পন্ন",
  rejected: "অনুমোদিত হয়নি",
  cancelled: "বাতিল",
};

export function ProjectHistory({ applicationId }: { applicationId: string }) {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await api<PageResult<Event>>(
        `project-applications/${applicationId}/history/?page=${page}`,
      );
      if (current !== sequence.current) return;
      setEvents(result.results);
      setNext(Boolean(result.next));
    } catch (failure) {
      if (current === sequence.current)
        setError(
          failure instanceof Error ? failure.message : "Unable to load history",
        );
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [applicationId, page]);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  return (
    <section aria-label={t("আবেদনের ইতিহাস", "Application history")}>
      <h3>{t("আবেদনের ইতিহাস", "Application history")}</h3>
      {loading ? (
        <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => void load()}>
            {t("আবার চেষ্টা", "Retry")}
          </button>
        </p>
      ) : (
        <>
          {!events.length && (
            <p>{t("এখনো ইতিহাস নেই।", "No history recorded yet.")}</p>
          )}
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <strong>
                  {labels[event.action]?.[lang === "bn" ? 0 : 1] ||
                    event.action}
                </strong>
                {event.status && (
                  <>
                    {" "}
                    ·{" "}
                    {t(
                      statusLabels[event.status] || event.status,
                      event.status,
                    )}
                  </>
                )}
                <p>
                  <time dateTime={event.date}>
                    {new Date(event.date).toLocaleString(
                      lang === "bn" ? "bn-BD" : "en-BD",
                      { timeZone: "Asia/Dhaka" },
                    )}
                  </time>{" "}
                  · {t("বাংলাদেশ সময়", "Bangladesh time")} ·{" "}
                  {t(
                    (
                      {
                        customer: "গ্রাহক",
                        team: "টিম",
                        system: "সিস্টেম",
                      } as Record<string, string>
                    )[event.actor] || event.actor,
                    event.actor,
                  )}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
      <button
        type="button"
        disabled={page === 1 || loading}
        onClick={() => setPage(page - 1)}
      >
        {t("আগের", "Previous")}
      </button>{" "}
      <span>{page}</span>{" "}
      <button
        type="button"
        disabled={!next || loading}
        onClick={() => setPage(page + 1)}
      >
        {t("পরের", "Next")}
      </button>
    </section>
  );
}
