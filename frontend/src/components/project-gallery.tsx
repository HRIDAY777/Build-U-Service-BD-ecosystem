"use client";
import { UiText } from "@/components/ui-text";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";
import { ManagedProject } from "./project-account";
import { Photo } from "./photo";

export function ProjectGallery() {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ManagedProject[]>([]);
  const [next, setNext] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const categories: Record<string, [string, string]> = {
    construction: ["নির্মাণ", "Construction"],
    electrical: ["ইলেকট্রিক্যাল", "Electrical"],
    solar: ["সোলার", "Solar"],
    finishing: ["ফিনিশিং", "Finishing"],
  };
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setItems([]);
    setNext(false);
    api<PageResult<ManagedProject>>(
      `managed-projects/?page=${page}&category=${category}`,
    )
      .then((data) => {
        if (active) {
          setItems(data.results);
          setNext(!!data.next);
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Failed to load projects");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, page, retry]);
  return (
    <section
      className="investor-gallery"
      id="project-gallery"
      aria-busy={loading}
    >
      <h2>{t("কাজের নমুনা ও প্রকল্পের আপডেট", "Project gallery & updates")}</h2>
      <p>
        {t(
          "প্রকাশিত প্রকল্পের বিবরণ ও টিমের আপডেট দেখুন। ‘ডেমো’ লেখা প্রকল্পগুলো কাল্পনিক নমুনা; এগুলো আসল বিনিয়োগ বা সম্পন্ন কাজের প্রমাণ নয়।",
          "Browse published project details and team updates. Projects labelled DEMO are fictional examples, not evidence of actual investments or completed work.",
        )}
      </p>
      <p>
        <Link className="button" href="/project-account">
          {t("আমার প্রজেক্ট অ্যাকাউন্ট / আবেদন", "My project account / apply")}
        </Link>
      </p>
      <label className="field">
        {t("কাজের ধরন", "Project category")}
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("সব প্রকল্প", "All projects")}</option>
          {[
            ["construction", "নির্মাণ"],
            ["electrical", "ইলেকট্রিক্যাল"],
            ["solar", "সোলার"],
            ["finishing", "ফিনিশিং"],
          ].map(([v, bn]) => (
            <option key={v} value={v}>
              {t(bn, categories[v]?.[1] || v)}
            </option>
          ))}
        </select>
      </label>
      {loading && <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>}
      {error && (
        <p role="alert">
          <UiText text={error} />
          <button
            type="button"
            className="button outline"
            onClick={() => setRetry((value) => value + 1)}
          >
            {t("আবার চেষ্টা করুন", "Try again")}
          </button>
        </p>
      )}
      {!loading && !error && !items.length && (
        <p>
          {t(
            "এই বিভাগে প্রকাশিত প্রকল্প নেই।",
            "No published projects in this category.",
          )}
        </p>
      )}
      <div className="project-plan-grid">
        {items.map((p) => (
          <article className="project-plan" key={p.id}>
            {p.image && (
              <Photo
                src={p.image}
                alt={lang === "bn" ? p.title_bn || p.title : p.title}
              />
            )}
            <h3>{lang === "bn" ? p.title_bn || p.title : p.title}</h3>
            <small>
              {p.area} ·{" "}
              {categories[p.category]
                ? t(...categories[p.category])
                : p.category}
            </small>
            <p>
              {lang === "bn"
                ? p.description_bn || p.description
                : p.description}
            </p>
            <label>
              {t("কাজের অগ্রগতি", "Progress")} ·{" "}
              {p.progress.toLocaleString(lang === "bn" ? "bn-BD" : "en-BD")}%
              <progress value={p.progress} max={100} />
            </label>
            {!p.updates.length && (
              <p>
                {t(
                  "এখনো কোনো প্রকাশিত আপডেট নেই।",
                  "No published updates yet.",
                )}
              </p>
            )}
            {p.updates.map((u) => (
              <details key={u.id}>
                <summary>
                  {new Date(`${u.date}T00:00:00+06:00`).toLocaleDateString(
                    lang === "bn" ? "bn-BD" : "en-GB",
                    {
                      timeZone: "Asia/Dhaka",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}{" "}
                  · {lang === "bn" ? u.title_bn || u.title : u.title}
                </summary>
                <p>
                  {lang === "bn"
                    ? u.description_bn || u.description
                    : u.description}
                </p>
              </details>
            ))}
          </article>
        ))}
      </div>
      <button
        className="button outline"
        disabled={page === 1 || loading}
        onClick={() => setPage(page - 1)}
      >
        {t("আগের", "Previous")}
      </button>{" "}
      {page.toLocaleString(lang === "bn" ? "bn-BD" : "en-BD")}{" "}
      <button
        className="button outline"
        disabled={!next || loading}
        onClick={() => setPage(page + 1)}
      >
        {t("পরের", "Next")}
      </button>
    </section>
  );
}
