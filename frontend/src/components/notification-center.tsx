"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";

type Notice = {
  id: number;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export function NotificationCenter({
  onChange,
}: {
  onChange: () => Promise<void>;
}) {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Notice[]>([]);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setFailed(false);
    setItems([]);
    setNext(false);
    try {
      const data = await api<PageResult<Notice>>(`notifications/?page=${page}`);
      if (current !== sequence.current) return;
      setItems(data.results);
      setNext(Boolean(data.next));
    } catch {
      if (current === sequence.current) setFailed(true);
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

  async function mark(notice?: Notice) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setActionFailed(false);
    try {
      if (notice) {
        await api(`notifications/${notice.id}/`, "PATCH", {
          read: !notice.read,
        });
        setItems((previous) =>
          previous.map((item) =>
            item.id === notice.id ? { ...item, read: !notice.read } : item,
          ),
        );
      } else {
        await api("notifications/mark_all_read/", "POST");
        setItems((previous) =>
          previous.map((item) => ({ ...item, read: true })),
        );
      }
      await onChange();
    } catch {
      setActionFailed(true);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="form-panel"
      aria-label={t("নোটিফিকেশন কেন্দ্র", "Notification center")}
    >
      <h2>{t("আপনার নোটিফিকেশন", "Your notifications")}</h2>
      <p>
        {t(
          "নতুন ও পুরোনো বার্তা দেখুন। সবগুলো পড়া চিহ্নিত করলে সব পৃষ্ঠার বার্তায় প্রযোজ্য হবে।",
          "Review new and older messages. Mark all as read applies to every page.",
        )}
      </p>
      <button
        className="button outline"
        disabled={loading || busy}
        onClick={() => void load()}
      >
        {t("হালনাগাদ করুন", "Refresh notifications")}
      </button>{" "}
      <button
        className="button secondary"
        disabled={loading || busy || failed || !items.length}
        onClick={() => void mark()}
      >
        {t("সবগুলো পড়া হয়েছে", "Mark all as read")}
      </button>
      {actionFailed && (
        <p role="alert">
          {t(
            "পরিবর্তন সংরক্ষণ হয়নি। আবার বাটনে চাপ দিয়ে চেষ্টা করুন।",
            "The change could not be saved. Use the button again to retry.",
          )}
        </p>
      )}
      {loading ? (
        <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>
      ) : failed ? (
        <div role="alert">
          <p>
            {t(
              "বার্তাগুলো লোড হয়নি। আবার চেষ্টা করুন।",
              "Messages could not be loaded. Please try again.",
            )}
          </p>
          <button className="button outline" onClick={() => void load()}>
            {t("আবার চেষ্টা", "Retry")}
          </button>
        </div>
      ) : (
        <>
          {!items.length && (
            <p>{t("এখনো কোনো নোটিফিকেশন নেই।", "No notifications yet.")}</p>
          )}
          {items.map((notice) => (
            <article className="record" key={notice.id}>
              <span className="status">
                {notice.read ? t("পড়া হয়েছে", "Read") : t("পড়া হয়নি", "Unread")}
              </span>
              <h3>{notice.title}</h3>
              <p>{notice.body}</p>
              <p>
                <time dateTime={notice.created_at}>
                  {new Date(notice.created_at).toLocaleString(
                    lang === "bn" ? "bn-BD" : "en-BD",
                    { timeZone: "Asia/Dhaka" },
                  )}{" "}
                  · {t("বাংলাদেশ সময়", "Bangladesh time")}
                </time>
              </p>
              <button
                className="button outline"
                disabled={busy}
                onClick={() => void mark(notice)}
              >
                {notice.read
                  ? t("না-পড়া চিহ্নিত করুন", "Mark as unread")
                  : t("পড়া হয়েছে", "Mark as read")}
              </button>
            </article>
          ))}
        </>
      )}
      <nav aria-label={t("নোটিফিকেশনের পৃষ্ঠা", "Notification pages")}>
        <button
          className="button outline"
          disabled={page === 1 || loading || busy}
          onClick={() => {
            setActionFailed(false);
            setPage((value) => value - 1);
          }}
        >
          {t("আগের", "Previous")}
        </button>{" "}
        <span>
          {t("পৃষ্ঠা", "Page")}{" "}
          {page.toLocaleString(lang === "bn" ? "bn-BD" : "en-BD")}
        </span>{" "}
        <button
          className="button outline"
          disabled={!next || loading || busy || failed}
          onClick={() => {
            setActionFailed(false);
            setPage((value) => value + 1);
          }}
        >
          {t("পরের", "Next")}
        </button>
      </nav>
    </section>
  );
}
