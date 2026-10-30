"use client";
import { UiText } from "@/components/ui-text";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";

type Event = { id: number; action: string; created_at: string };
const labels: Record<string, [string, string]> = {
  "account.registered": ["অ্যাকাউন্ট তৈরি", "Account created"],
  "account.login": ["সফল লগইন", "Successful sign-in"],
  "account.logout": ["সাইন আউট", "Signed out"],
  "account.password_changed": ["পাসওয়ার্ড পরিবর্তন", "Password changed"],
  "account.password_reset": ["পাসওয়ার্ড পুনরুদ্ধার", "Password reset"],
  "account.logout_all": ["সব সেশন থেকে সাইন আউট", "Signed out everywhere"],
  "account.email_verified": ["ইমেইল যাচাই", "Email verified"],
  "account.deletion_requested": [
    "অ্যাকাউন্ট মুছে ফেলার অনুরোধ",
    "Account deletion requested",
  ],
  "account.profile_updated": ["প্রোফাইল আপডেট", "Profile updated"],
};

export function SecurityHistory() {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<Event[]>([]);
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
        `auth/security-history/?page=${page}`,
      );
      if (current !== sequence.current) return;
      setEvents(result.results);
      setNext(Boolean(result.next));
    } catch (failure) {
      if (current === sequence.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load security history",
        );
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [page]);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  return (
    <section
      className="form-panel"
      style={{ marginTop: 20 }}
      aria-label={t("নিরাপত্তা ইতিহাস", "Security history")}
    >
      <h2>{t("নিরাপত্তা ইতিহাস", "Security history")}</h2>
      <p>
        {t(
          "আপনার অ্যাকাউন্টের রেকর্ড করা সফল কাজগুলো। এটি সব ব্যর্থ লগইন চেষ্টা বা ডিভাইসের তালিকা নয়।",
          "Recorded successful account actions. This is not a list of all failed sign-in attempts or devices.",
        )}
      </p>
      <button
        className="button outline"
        type="button"
        disabled={loading}
        onClick={() => void load()}
      >
        {t("ইতিহাস হালনাগাদ", "Refresh history")}
      </button>
      {loading ? (
        <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>
      ) : error ? (
        <p role="alert">
          <UiText text={error} />
        </p>
      ) : (
        <>
          {!events.length && (
            <p>{t("এখনো কোনো ঘটনা রেকর্ড হয়নি।", "No events recorded yet.")}</p>
          )}
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <strong>
                  <UiText
                    text={
                      labels[event.action]?.[lang === "bn" ? 0 : 1] ||
                      event.action
                    }
                  />
                </strong>
                <p>
                  <time dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleString(
                      lang === "bn" ? "bn-BD" : "en-BD",
                      { timeZone: "Asia/Dhaka" },
                    )}
                  </time>{" "}
                  · {t("বাংলাদেশ সময়", "Bangladesh time")}
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
