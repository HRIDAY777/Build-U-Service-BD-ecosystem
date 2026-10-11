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
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
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
  }, [category, page]);
  return (
    <section>
      <h2>{t("কাজের নমুনা ও প্রকল্পের আপডেট", "Project gallery & updates")}</h2>
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
              {t(bn, v)}
            </option>
          ))}
        </select>
      </label>
      {loading && <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>}
      {error && (
        <p role="alert">
          <UiText text={error} />
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
              {p.area} · {p.category}
            </small>
            <p>
              {lang === "bn"
                ? p.description_bn || p.description
                : p.description}
            </p>
            <label>
              {t("কাজের অগ্রগতি", "Progress")} · {p.progress}%
              <progress value={p.progress} max={100} />
            </label>
            {p.updates.map((u) => (
              <details key={u.id}>
                <summary>
                  {u.date} · {lang === "bn" ? u.title_bn || u.title : u.title}
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
      {page}{" "}
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
