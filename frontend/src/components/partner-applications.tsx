"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, Division, PageResult } from "@/lib/api";
import { useApp } from "./provider";

type Document = {
  id: number;
  title: string;
  expires_on: string | null;
  active: boolean;
  review_status: "pending" | "accepted" | "rejected";
  review_note: string;
  reviewed_at: string | null;
  expiry?: {
    status: string;
    days_remaining: number | null;
    as_of: string;
    renewal_needed: boolean;
  };
};
type Application = {
  id: string;
  is_owner: boolean;
  division: number;
  business_name: string;
  phone: string;
  area: string;
  address: string;
  details: string;
  status: string;
  review_note: string;
  organization: number | null;
  renewal_of: string | null;
  documents: Document[];
};
const statuses: Record<string, [string, string]> = {
  submitted: ["জমা হয়েছে", "Submitted"],
  reviewing: ["পর্যালোচনায়", "Under review"],
  needs_changes: ["সংশোধন প্রয়োজন", "Changes requested"],
  approved: ["অনুমোদিত", "Approved"],
  rejected: ["অনুমোদন হয়নি", "Rejected"],
  cancelled: ["বাতিল", "Cancelled"],
};

export function PartnerApplications() {
  const { user } = useApp();
  return <PartnerApplicationsBody key={user?.id || 0} />;
}

function PartnerApplicationsBody() {
  const { user, lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [items, setItems] = useState<Application[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [reviewer, setReviewer] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", kind: "" });
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    if (!user) return;
    const current = ++sequence.current;
    setLoading(true);
    try {
      const results = await Promise.all([
        api<PageResult<Application>>(
          `partner-applications/?${new URLSearchParams({ page: String(page), ...filters })}`,
        ),
        api<PageResult<Division>>("divisions/"),
        api<{ review: boolean }>("partner-applications/capabilities/"),
      ]);
      if (current !== sequence.current) return;
      setItems(results[0].results);
      setCount(results[0].count);
      setNext(Boolean(results[0].next));
      setDivisions(results[1].results);
      setReviewer(results[2].review);
    } catch (failure) {
      if (current === sequence.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load applications",
        );
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [user, page, filters]);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);

  async function save(path: string, body?: unknown, method = "POST") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(path, method, body);
      setMessage(t("সংরক্ষণ হয়েছে।", "Saved."));
      await load();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>, item?: Application) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    if (
      await save(
        item ? `partner-applications/${item.id}/` : "partner-applications/",
        { ...fields, division: Number(fields.division) },
        item ? "PATCH" : "POST",
      )
    ) {
      if (!item) form.reset();
    }
  }
  function businessFields(item?: Application) {
    return (
      <>
        <label>
          {t("সেবার বিভাগ", "Business division")}
          <select name="division" required defaultValue={item?.division || ""}>
            <option value="" disabled={Boolean(item?.renewal_of)}>
              {t("বাছুন", "Select")}
            </option>
            {divisions.map((d) => (
              <option
                key={d.id}
                value={d.id}
                disabled={Boolean(item?.renewal_of) && d.id !== item?.division}
              >
                {lang === "bn" ? d.name_bn : d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("ব্যবসার নাম", "Business name")}
          <input
            name="business_name"
            readOnly={Boolean(item?.renewal_of)}
            required
            maxLength={160}
            defaultValue={item?.business_name}
          />
        </label>
        <label>
          {t("মোবাইল", "Mobile number")}
          <input
            name="phone"
            required
            maxLength={20}
            defaultValue={item?.phone}
          />
        </label>
        <label>
          {t("এলাকা", "Area")}
          <input
            name="area"
            readOnly={Boolean(item?.renewal_of)}
            required
            maxLength={100}
            defaultValue={item?.area}
          />
        </label>
        <label>
          {t("সম্পূর্ণ ঠিকানা", "Full address")}
          <textarea
            name="address"
            readOnly={Boolean(item?.renewal_of)}
            required
            maxLength={500}
            defaultValue={item?.address}
          />
        </label>
        <label>
          {t("ব্যবসার বিবরণ", "Business details")}
          <textarea
            name="details"
            maxLength={5000}
            defaultValue={item?.details}
          />
        </label>
      </>
    );
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>{t("পার্টনার আবেদন", "Partner applications")}</h1>
        <Link href="/login" className="button">
          {t("লগইন করুন", "Sign in")}
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>{t("পার্টনার আবেদন ও নথি", "Partner applications & documents")}</h1>
      <p>
        {t(
          "নথি শুধু আপনি ও অনুমোদিত পর্যালোচক দেখতে পারবেন। ব্যবসার অনুমোদন বিশেষ লাইসেন্স বা আইনগত ছাড়পত্রের বিকল্প নয়।",
          "Documents are private to you and authorized reviewers. Business approval does not replace specialist licensing or legal clearance.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <details>
        <summary>{t("নতুন আবেদন", "New application")}</summary>
        <form className="form-panel" onSubmit={(e) => void submit(e)}>
          <fieldset disabled={busy || loading}>
            {businessFields()}
            <button className="button" type="submit">
              {t("আবেদন জমা দিন", "Submit application")}
            </button>
          </fieldset>
        </form>
      </details>
      <form
        className="form-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setPage(1);
          setFilters({
            search: String(data.get("search") || "").trim(),
            status: String(data.get("status") || ""),
            kind: String(data.get("kind") || ""),
          });
        }}
      >
        <fieldset disabled={busy || loading}>
          <label>
            {t(
              "ব্যবসা, এলাকা, মোবাইল বা রেফারেন্স খুঁজুন",
              "Search business, area, phone or reference",
            )}
            <input name="search" maxLength={160} />
          </label>
          <label>
            {t("আবেদনের অবস্থা", "Application status")}
            <select name="status">
              <option value="">{t("সব অবস্থা", "All statuses")}</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[lang === "bn" ? 0 : 1]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("আবেদনের ধরন", "Application type")}
            <select name="kind">
              <option value="">{t("সব আবেদন", "All applications")}</option>
              <option value="initial">
                {t("নতুন ব্যবসা", "Initial application")}
              </option>
              <option value="renewal">{t("নবায়ন", "Renewal")}</option>
            </select>
          </label>
          <button>{t("বাছাই করুন", "Apply filters")}</button>
          <button
            type="reset"
            onClick={() => {
              setPage(1);
              setFilters({ search: "", status: "", kind: "" });
            }}
          >
            {t("বাছাই মুছুন", "Clear filters")}
          </button>
        </fieldset>
      </form>
      <p>
        {t("মোট আবেদন", "Matching applications")}: {count}
      </p>
      <button
        disabled={busy || loading}
        onClick={() => {
          setError("");
          void load();
        }}
      >
        {t("আবার দেখুন", "Refresh")}
      </button>
      {loading && <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>}
      {!loading && !items.length && (
        <p>
          {filters.search || filters.status || filters.kind
            ? t(
                "বাছাই অনুযায়ী কোনো আবেদন পাওয়া যায়নি।",
                "No matching applications.",
              )
            : t("কোনো আবেদন নেই।", "No applications yet.")}
        </p>
      )}
      {items.map((item) => {
        const editable =
          item.is_owner && ["submitted", "needs_changes"].includes(item.status);
        const status = statuses[item.status];
        return (
          <section
            className="form-panel"
            key={`${item.id}-${item.status}-${item.documents.length}`}
            style={{ marginTop: 20 }}
          >
            <h2>{item.business_name}</h2>
            {item.renewal_of && (
              <p>{t("নথি নবায়নের আবেদন", "Document renewal application")}</p>
            )}
            <p>{status ? status[lang === "bn" ? 0 : 1] : item.status}</p>
            <p>
              {item.address} · {item.phone}
            </p>
            <p>{item.details}</p>
            {item.review_note && <p>{item.review_note}</p>}
            {item.organization && (
              <Link href="/portal">
                {t("পার্টনার পোর্টাল খুলুন", "Open partner portal")}
              </Link>
            )}
            {item.is_owner && item.status === "approved" && (
              <button
                disabled={busy || loading}
                onClick={() =>
                  void save(`partner-applications/${item.id}/renew/`).then(
                    (ok) => {
                      if (ok) setPage(1);
                    },
                  )
                }
              >
                {t("নবায়নের আবেদন খুলুন", "Open renewal application")}
              </button>
            )}
            {editable && (
              <details>
                <summary>
                  {t("সংশোধন ও পুনরায় জমা", "Edit and resubmit")}
                </summary>
                <form onSubmit={(e) => void submit(e, item)}>
                  <fieldset disabled={busy}>
                    {businessFields(item)}
                    <button className="button">
                      {t("সংরক্ষণ ও জমা", "Save and submit")}
                    </button>
                  </fieldset>
                </form>
              </details>
            )}
            <h3>{t("ব্যবসার নথি", "Business documents")}</h3>
            {item.documents.map((doc) => (
              <div key={doc.id} style={{ marginBottom: 16 }}>
                <a
                  href={`/api/v1/partner-applications/${item.id}/documents/${doc.id}/download/`}
                >
                  {doc.title}
                </a>{" "}
                {doc.expires_on && ` · ${doc.expires_on}`}{" "}
                {doc.active && doc.expiry && (
                  <p>
                    {doc.expiry.status === "expired"
                      ? t("মেয়াদ শেষ—নবায়ন প্রয়োজন", "Expired — renewal needed")
                      : doc.expiry.status === "due_today"
                        ? t(
                            "আজ মেয়াদ শেষ—নবায়ন প্রয়োজন",
                            "Expires today — renewal needed",
                          )
                        : doc.expiry.status === "expiring_soon"
                          ? t(
                              `আর ${doc.expiry.days_remaining} দিন—নবায়নের প্রস্তুতি নিন`,
                              `${doc.expiry.days_remaining} days remaining — prepare renewal`,
                            )
                          : doc.expiry.status === "not_provided"
                            ? t(
                                "মেয়াদের তথ্য দেওয়া হয়নি",
                                "Expiry date not provided",
                              )
                            : t(
                                `মেয়াদ বাকি ${doc.expiry.days_remaining} দিন`,
                                `${doc.expiry.days_remaining} days remaining`,
                              )}
                  </p>
                )}
                {!doc.active && t("(প্রত্যাহার করা)", "(Withdrawn)")}{" "}
                <p>
                  {doc.review_status === "accepted"
                    ? t("নথি গ্রহণ করা হয়েছে", "Document accepted")
                    : doc.review_status === "rejected"
                      ? t("নথি গ্রহণ হয়নি", "Document rejected")
                      : t("নথির যাচাই বাকি", "Document awaiting review")}
                </p>
                {doc.review_note && <p>{doc.review_note}</p>}
                {doc.reviewed_at && (
                  <p>
                    {t("যাচাইয়ের সময়", "Reviewed at")}:{" "}
                    {new Date(doc.reviewed_at).toLocaleString(
                      lang === "bn" ? "bn-BD" : "en-GB",
                      { timeZone: "Asia/Dhaka" },
                    )}
                  </p>
                )}
                {reviewer &&
                  !item.is_owner &&
                  item.status === "reviewing" &&
                  doc.active && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save(
                          `partner-applications/${item.id}/documents/${doc.id}/review/`,
                          Object.fromEntries(
                            new FormData(e.currentTarget).entries(),
                          ),
                        );
                      }}
                    >
                      <fieldset disabled={busy}>
                        <label>
                          {t("নথির সিদ্ধান্ত", "Document decision")}
                          <select
                            name="status"
                            defaultValue={
                              doc.review_status === "accepted"
                                ? "accepted"
                                : "rejected"
                            }
                          >
                            <option value="accepted">
                              {t("গ্রহণ করুন", "Accept")}
                            </option>
                            <option value="rejected">
                              {t("গ্রহণ করবেন না", "Reject")}
                            </option>
                          </select>
                        </label>
                        <label>
                          {t("নথি যাচাইয়ের মন্তব্য", "Document review note")}
                          <textarea
                            name="note"
                            required
                            maxLength={2000}
                            defaultValue={doc.review_note}
                          />
                        </label>
                        <button>
                          {t(
                            "নথির সিদ্ধান্ত সংরক্ষণ",
                            "Save document decision",
                          )}
                        </button>
                      </fieldset>
                    </form>
                  )}
                {editable && doc.active && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void save(
                        `partner-applications/${item.id}/documents/${doc.id}/withdraw/`,
                      )
                    }
                  >
                    {t("প্রত্যাহার", "Withdraw")}
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  if (!data.get("expires_on")) data.delete("expires_on");
                  void save(
                    `partner-applications/${item.id}/document/`,
                    data,
                  ).then((ok) => {
                    if (ok) form.reset();
                  });
                }}
              >
                <fieldset disabled={busy}>
                  <label>
                    {t("নথির নাম", "Document title")}
                    <input name="title" required maxLength={160} />
                  </label>
                  <label>
                    {t("পিডিএফ (সর্বোচ্চ ৫ এমবি)", "PDF (maximum 5 MB)")}
                    <input
                      type="file"
                      name="file"
                      accept="application/pdf"
                      required
                    />
                  </label>
                  <label>
                    {t("মেয়াদ শেষ (ঐচ্ছিক)", "Expiry date (optional)")}
                    <input type="date" name="expires_on" />
                  </label>
                  <button>{t("নথি জমা দিন", "Upload document")}</button>
                </fieldset>
              </form>
            )}
            {editable && (
              <button
                disabled={busy}
                onClick={() =>
                  void save(`partner-applications/${item.id}/cancel/`)
                }
              >
                {t("আবেদন বাতিল", "Cancel application")}
              </button>
            )}
            {reviewer &&
              !item.is_owner &&
              ["submitted", "reviewing"].includes(item.status) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(
                      `partner-applications/${item.id}/review/`,
                      Object.fromEntries(
                        new FormData(e.currentTarget).entries(),
                      ),
                    );
                  }}
                >
                  <fieldset disabled={busy}>
                    <label>
                      {t("পর্যালোচনার সিদ্ধান্ত", "Review decision")}
                      <select name="status">
                        {(item.status === "submitted"
                          ? ["reviewing"]
                          : ["needs_changes", "approved", "rejected"]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {statuses[s][lang === "bn" ? 0 : 1]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("আবেদনকারীকে মন্তব্য", "Note to applicant")}
                      <textarea name="review_note" required maxLength={2000} />
                    </label>
                    <label>
                      {t(
                        "যাচাইয়ের রেফারেন্স (অনুমোদনে আবশ্যক)",
                        "Verification reference (required for approval)",
                      )}
                      <input name="verification_reference" maxLength={160} />
                    </label>
                    <button>{t("সিদ্ধান্ত সংরক্ষণ", "Save decision")}</button>
                  </fieldset>
                </form>
              )}
          </section>
        );
      })}
      <div>
        <button
          disabled={page === 1 || busy || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          {t("আগের পাতা", "Previous page")}
        </button>{" "}
        <span>{page}</span>{" "}
        <button
          disabled={!next || busy || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          {t("পরের পাতা", "Next page")}
        </button>
      </div>
    </div>
  );
}
