"use client";
import { UiText } from "@/components/ui-text";

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
  "partner.submitted": ["আবেদন জমা", "Application submitted"],
  "partner.updated": ["আবেদন সংশোধন", "Application updated"],
  "partner.cancelled": ["আবেদন বাতিল", "Application cancelled"],
  "partner.document_uploaded": ["নথি জমা", "Document uploaded"],
  "partner.document_withdrawn": ["নথি প্রত্যাহার", "Document withdrawn"],
  "partner.reviewed": ["আবেদনের সিদ্ধান্ত", "Application decision"],
  "partner.document_reviewed": ["নথির সিদ্ধান্ত", "Document decision"],
  "partner.renewal_requested": ["নবায়নের আবেদন", "Renewal requested"],
};
const statuses: Record<string, string> = {
  submitted: "জমা হয়েছে",
  reviewing: "পর্যালোচনায়",
  needs_changes: "সংশোধন প্রয়োজন",
  approved: "অনুমোদিত",
  rejected: "গ্রহণ হয়নি",
  cancelled: "বাতিল",
  accepted: "গ্রহণ হয়েছে",
};

export function PartnerHistory({ applicationId }: { applicationId: string }) {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        {lang === "bn" ? (
          <UiText text={"আবেদনের ইতিহাস"} />
        ) : (
          <UiText text={"Application history"} />
        )}
      </summary>
      {open && <HistoryEvents applicationId={applicationId} />}
    </details>
  );
}

function HistoryEvents({ applicationId }: { applicationId: string }) {
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
        `partner-applications/${applicationId}/history/?page=${page}`,
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
      {loading ? (
        <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>
      ) : error ? (
        <p role="alert">
          <UiText text={error} />
        </p>
      ) : (
        <>
          {!events.length && (
            <p>{t("এখনো ইতিহাস নেই।", "No history recorded yet.")}</p>
          )}
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <UiText
                  text={
                    labels[event.action]?.[lang === "bn" ? 0 : 1] ||
                    event.action
                  }
                />
                {event.status &&
                  ` · ${lang === "bn" ? statuses[event.status] || event.status : event.status}`}
                <p>
                  <time dateTime={event.date}>
                    {new Date(event.date).toLocaleString(
                      lang === "bn" ? "bn-BD" : "en-GB",
                      { timeZone: "Asia/Dhaka" },
                    )}
                  </time>{" "}
                  · {t("বাংলাদেশ সময়", "Bangladesh time")} ·{" "}
                  {t(
                    event.actor === "applicant"
                      ? "আবেদনকারী"
                      : event.actor === "team"
                        ? "টিম"
                        : "সিস্টেম",
                    event.actor,
                  )}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
      <button
        disabled={loading || page === 1}
        onClick={() => setPage((p) => p - 1)}
      >
        {t("আগের ইতিহাস", "Previous history")}
      </button>
      <span> {page} </span>
      <button disabled={loading || !next} onClick={() => setPage((p) => p + 1)}>
        {t("পরের ইতিহাস", "Next history")}
      </button>
      <button disabled={loading} onClick={() => void load()}>
        {t("ইতিহাস আবার দেখুন", "Refresh history")}
      </button>
    </section>
  );
}
