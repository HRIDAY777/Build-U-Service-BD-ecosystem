"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp } from "./provider";
import { LocationPicker, addressLine } from "./location-picker";
import { ProjectHistory } from "./project-history";

type Update = {
  id: number;
  title: string;
  title_bn: string;
  description: string;
  description_bn: string;
  date: string;
};
export type ManagedProject = {
  id: number;
  title: string;
  title_bn: string;
  category: string;
  area: string;
  description: string;
  description_bn: string;
  image: string;
  progress: number;
  updates: Update[];
};
type Entry = {
  id: number;
  kind: string;
  amount: string;
  reference: string;
  date: string;
  note: string;
};
type Application = {
  id: string;
  kind: string;
  name: string;
  address: string;
  phone: string;
  details: string;
  package: string;
  amount: string;
  months: number;
  expected_total: string;
  status: string;
  project: number | null;
  project_title: string;
  review_note: string;
  agreement_reference: string;
  start_date: string | null;
  accepted_at: string | null;
  is_owner: boolean;
  agreement_download: string;
  agreement_sha256: string;
  signed_name: string;
  created_at: string;
  terms_version: string;
  term: {
    maturity_date: string | null;
    elapsed_months: number;
    remaining_months: number;
    progress_percent: number;
  };
  entries: Entry[];
  payment_summary?: {
    as_of: string;
    net_receipts: string;
    schedule_remaining: string;
    overdue_amount: string;
    overdue_count: number;
    next_unsettled_date: string | null;
    next_unsettled_amount: string | null;
  };
  payment_schedule: {
    date: string;
    amount: string;
    recorded_paid: string;
    remaining: string;
    state: string;
  }[];
  updates: Update[];
};
const packages = ["starter", "basic", "premium", "regular", "growth"];
const packageBn: Record<string, string> = {
  starter: "স্টার্টার",
  basic: "বেসিক",
  premium: "প্রিমিয়াম",
  regular: "রেগুলার",
  growth: "ক্যাপিটাল গ্রোথ",
};
const units: Record<string, number> = {
  starter: 10000,
  basic: 25000,
  premium: 50000,
  regular: 100000,
  growth: 100000,
};
const months: Record<string, number> = {
  starter: 4,
  basic: 6,
  premium: 12,
  regular: 40,
  growth: 40,
};
const statuses: Record<string, string> = {
  submitted: "জমা হয়েছে",
  reviewing: "পর্যালোচনা চলছে",
  approved: "অনুমোদিত",
  active: "চলমান",
  completed: "সম্পন্ন",
  rejected: "অনুমোদিত হয়নি",
  cancelled: "বাতিল",
};

export function ProjectAccount() {
  const { user, lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const money = (value: number | string) =>
    `৳${Number(value).toLocaleString(lang === "bn" ? "bn-BD" : "en-BD", { maximumFractionDigits: 2 })}`;
  const [items, setItems] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", kind: "" });
  const [count, setCount] = useState(0);
  const loadSequence = useRef(0);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("investor");
  const [pack, setPack] = useState("starter");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [projectPage, setProjectPage] = useState(0);
  const [moreProjects, setMoreProjects] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [permissions, setPermissions] = useState({
    review: false,
    ledger: false,
    manage: false,
  });
  useEffect(() => {
    if (user)
      api<typeof permissions>("project-applications/capabilities/")
        .then(setPermissions)
        .catch(() => {});
  }, [user]);
  const requestKey = useRef<string>("");
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const data = await api<PageResult<Application>>(
        `project-applications/?${new URLSearchParams({ page: String(page), ...filters })}`,
      );
      if (sequence !== loadSequence.current) return;
      setItems(data.results);
      setCount(data.count);
      setNext(!!data.next);
    } catch (e) {
      if (sequence !== loadSequence.current) return;
      setError(e instanceof Error ? e.message : "Unable to load applications");
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [page, filters]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);
  const loadProjects = useCallback(async (requestedPage: number) => {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const data = await api<PageResult<ManagedProject>>(
        `managed-projects/?page=${requestedPage}`,
      );
      setProjects((previous) =>
        requestedPage === 1
          ? data.results
          : [
              ...previous,
              ...data.results.filter(
                (project) =>
                  !previous.some((existing) => existing.id === project.id),
              ),
            ],
      );
      setProjectPage(requestedPage);
      setMoreProjects(Boolean(data.next));
    } catch (error) {
      setProjectsError(
        error instanceof Error ? error.message : "Unable to load projects",
      );
    } finally {
      setProjectsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (user?.is_staff) void loadProjects(1);
  }, [user, loadProjects]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    requestKey.current ||= crypto.randomUUID();
    setBusy(true);
    setMessage("");
    try {
      const result = await api<Application>("project-applications/", "POST", {
        ...data,
        address: addressLine(
          String(data.address),
          String(data.geo_address || ""),
        ),
        kind,
        package: kind === "investor" ? pack : "",
        amount:
          kind === "investor"
            ? Number(data.units) * units[pack]
            : Number(data.amount),
        months: kind === "investor" ? months[pack] : Number(data.months),
        consent: data.consent === "on",
        request_key: requestKey.current,
      });
      requestKey.current = "";
      form.reset();
      setSelected(result);
      setMessage(
        t(
          "আবেদন জমা হয়েছে। এটি স্বাক্ষরিত চুক্তি বা অর্থ গ্রহণের রসিদ নয়।",
          "Application saved. This is not a signed agreement or payment receipt.",
        ),
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }
  async function action(path: string, data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await api<Application>(
        `project-applications/${selected!.id}/${path}/`,
        "POST",
        data,
      );
      setSelected(result);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  const total = (kind: string) =>
    selected?.entries
      .filter((e) => e.kind === kind)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  return (
    <div className="page-wrap project-account">
      <h1>
        {t(
          "আমার প্রজেক্ট ও বিনিয়োগ অ্যাকাউন্ট",
          "My project & investment account",
        )}
      </h1>
      <p>
        <Link className="text-link" href="/projects">
          {t(
            "পরিকল্পনা ও নমুনা হিসাব দেখুন",
            "View plans and illustrative calculations",
          )}
        </Link>
      </p>
      {!user ? (
        <p>
          {t(
            "নিজের আবেদন ও হিসাব দেখতে লগইন করুন।",
            "Log in to view your applications and statements.",
          )}{" "}
          <Link className="button" href="/login">
            {t("লগইন", "Log in")}
          </Link>
        </p>
      ) : (
        <>
          <details
            className="form-panel project-calculator"
            open={!items.length && !permissions.manage}
          >
            <summary>{t("নতুন আবেদন", "New application")}</summary>
            <label className="field">
              {t("আবেদনের ধরন", "Application type")}
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  requestKey.current = "";
                }}
              >
                <option value="investor">
                  {t("বিনিয়োগ পরিকল্পনার আবেদন", "Investment plan application")}
                </option>
                <option value="client">
                  {t("গ্রাহকের প্রজেক্ট আবেদন", "Client project application")}
                </option>
              </select>
            </label>
            <form onSubmit={submit}>
              <label className="field">
                {t("নাম", "Name")}
                <input name="name" required maxLength={120} />
              </label>
              <label className="field">
                {t("মোবাইল", "Phone")}
                <input
                  name="phone"
                  type="tel"
                  required
                  pattern="\+?[0-9][0-9 -]{6,19}"
                  maxLength={20}
                />
              </label>
              <LocationPicker />
              <label className="field">
                {t("বাড়ি / রাস্তার বিস্তারিত", "House / street details")}
                <textarea name="address" required maxLength={2000} />
              </label>
              <label className="field">
                {t("প্রজেক্টের বিবরণ / প্রশ্ন", "Project details / questions")}
                <textarea name="details" required maxLength={5000} />
              </label>
              {kind === "investor" ? (
                <>
                  <label className="field">
                    {t("প্যাকেজ", "Package")}
                    <select
                      value={pack}
                      onChange={(e) => {
                        setPack(e.target.value);
                        requestKey.current = "";
                      }}
                    >
                      {packages.map((p) => (
                        <option key={p} value={p}>
                          {lang === "bn" ? packageBn[p] : p} · {money(units[p])}{" "}
                          · {months[p]} {t("মাস", "months")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {t("ইউনিট সংখ্যা", "Units")}
                    <input
                      name="units"
                      type="number"
                      required
                      min={1}
                      max={100}
                      step={1}
                      defaultValue={1}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    {t(
                      "প্রস্তাবিত প্রজেক্ট মূল্য (৳)",
                      "Estimated project price (BDT)",
                    )}
                    <input
                      name="amount"
                      type="number"
                      required
                      min={1}
                      max={100000000}
                      step="0.01"
                    />
                  </label>
                  <label className="field">
                    {t(
                      "বাকি ৪০% কিস্তির মাস",
                      "Months for remaining 40% instalments",
                    )}
                    <input
                      name="months"
                      type="number"
                      required
                      min={1}
                      max={40}
                      step={1}
                      defaultValue={40}
                    />
                  </label>
                </>
              )}
              <p>
                {t(
                  "এটি পর্যালোচনার আবেদন। মুনাফা নিশ্চিত নয়। প্রকল্প, যোগ্যতা, চূড়ান্ত মূল্য ও লিখিত চুক্তি টিম যাচাই করবে। এখানে টাকা নেওয়া হচ্ছে না।",
                  "This is an application for review. Returns are not guaranteed. Project eligibility, final pricing and a written agreement require team review. No money is collected here.",
                )}
              </p>
              <label>
                <input name="consent" type="checkbox" required />
                {t(
                  "আমি শর্ত বুঝেছি এবং যোগাযোগের সম্মতি দিচ্ছি।",
                  "I understand and consent to being contacted.",
                )}
              </label>
              <button className="button" disabled={busy}>
                {t("আবেদন জমা দিন", "Submit application")}
              </button>
            </form>
          </details>
          <section>
            <h2>
              {permissions.manage
                ? t("আবেদন ব্যবস্থাপনা", "Application management")
                : t("আমার আবেদন", "My applications")}
            </h2>
            <form
              className="project-plan-grid"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setPage(1);
                setFilters({
                  search: String(data.get("search") || "").trim(),
                  status: String(data.get("status") || ""),
                  kind: String(data.get("filter_kind") || ""),
                });
              }}
            >
              <label className="field">
                {t(
                  "নাম, মোবাইল বা চুক্তির রেফারেন্স",
                  "Name, phone or agreement reference",
                )}
                <input name="search" maxLength={180} type="search" />
              </label>
              <label className="field">
                {t("আবেদনের অবস্থা", "Application status")}
                <select name="status">
                  <option value="">{t("সব অবস্থা", "All statuses")}</option>
                  {Object.entries(statuses).map(([key, label]) => (
                    <option key={key} value={key}>
                      {t(label, key)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t("আবেদনের ধরন", "Application type")}
                <select name="filter_kind">
                  <option value="">{t("সব ধরন", "All types")}</option>
                  <option value="investor">
                    {t("বিনিয়োগকারী", "Investor")}
                  </option>
                  <option value="client">{t("গ্রাহক", "Client")}</option>
                </select>
              </label>
              <button className="button" type="submit">
                {t("আবেদন খুঁজুন", "Find applications")}
              </button>
              <button
                className="button outline"
                type="reset"
                onClick={() => {
                  setPage(1);
                  setFilters({ search: "", status: "", kind: "" });
                }}
              >
                {t("সব দেখুন", "Show all")}
              </button>
            </form>
            {!loading && !error && (
              <p role="status">
                {t("পাওয়া আবেদন", "Matching applications")}:{" "}
                {count.toLocaleString(lang === "bn" ? "bn-BD" : "en-BD")}
              </p>
            )}
            {loading && <p role="status">{t("লোড হচ্ছে…", "Loading…")}</p>}
            {error && (
              <p role="alert">
                {error}
                <button onClick={() => void load()}>
                  {t("আবার চেষ্টা", "Retry")}
                </button>
              </p>
            )}
            {!loading && !error && !items.length && (
              <p>
                {t(
                  "এই বাছাইয়ে কোনো আবেদন পাওয়া যায়নি।",
                  "No applications match these filters.",
                )}
              </p>
            )}
            <div className="project-plan-grid">
              {items.map((a) => (
                <button
                  type="button"
                  className="project-plan"
                  key={a.id}
                  onClick={() => {
                    setSelected(a);
                    setMessage("");
                  }}
                >
                  <strong>
                    {a.name} ·{" "}
                    {a.kind === "investor"
                      ? t("বিনিয়োগ", "Investment")
                      : t("প্রজেক্ট", "Project")}
                  </strong>
                  <span>{money(a.amount)}</span>
                  <small>
                    {t(statuses[a.status] || a.status, a.status)} · {a.package}
                  </small>
                  <small>{a.id.slice(0, 8)}</small>
                </button>
              ))}
            </div>
            <button
              className="button outline"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              {t("আগের", "Previous")}
            </button>{" "}
            <span>{page}</span>{" "}
            <button
              className="button outline"
              disabled={!next || loading}
              onClick={() => setPage(page + 1)}
            >
              {t("পরের", "Next")}
            </button>
          </section>
          {selected && (
            <section className="form-panel project-calculator project-statement">
              <h2>
                {t("আবেদনের বিবরণ ও হিসাব", "Application details & statement")}
              </h2>
              <p>{selected.id}</p>
              <p>
                {selected.name} · {selected.phone}
              </p>
              <p>{selected.address}</p>
              <p>{selected.details}</p>
              <dl className="project-totals">
                <div>
                  <dt>{t("অবস্থা", "Status")}</dt>
                  <dd>
                    {t(
                      statuses[selected.status] || selected.status,
                      selected.status,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t("প্রজেক্ট", "Project")}</dt>
                  <dd>
                    {selected.project_title ||
                      t("নির্ধারিত হয়নি", "Not assigned")}
                  </dd>
                </div>
                <div>
                  <dt>
                    {t(
                      "প্রস্তাবিত মোট (আসলসহ)",
                      "Proposed total (includes capital)",
                    )}
                  </dt>
                  <dd>{money(selected.expected_total)}</dd>
                </div>
                <div>
                  <dt>{t("রেকর্ডকৃত গ্রহণ", "Recorded receipts")}</dt>
                  <dd>{money(total("receipt"))}</dd>
                </div>
                <div>
                  <dt>{t("রেকর্ডকৃত বিতরণ", "Recorded distributions")}</dt>
                  <dd>{money(total("distribution"))}</dd>
                </div>
                <div>
                  <dt>{t("রেকর্ডকৃত ফেরত", "Recorded refunds")}</dt>
                  <dd>{money(total("refund"))}</dd>
                </div>
              </dl>
              {selected.payment_summary && (
                <>
                  <p>
                    {t("হিসাবের তারিখ", "Statement date")}:{" "}
                    {selected.payment_summary.as_of}
                  </p>
                  <dl className="project-totals">
                    <div>
                      <dt>{t("ফেরত বাদে জমা", "Net recorded receipts")}</dt>
                      <dd>{money(selected.payment_summary.net_receipts)}</dd>
                    </div>
                    <div>
                      <dt>{t("সময়সূচিতে বাকি", "Remaining in schedule")}</dt>
                      <dd>
                        {money(selected.payment_summary.schedule_remaining)}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {t("তারিখ পার হওয়া বকেয়া", "Overdue in schedule")}
                      </dt>
                      <dd>
                        {money(selected.payment_summary.overdue_amount)} ·{" "}
                        {selected.payment_summary.overdue_count}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {t(
                          "পরের অমীমাংসিত কিস্তি",
                          "Next unsettled instalment",
                        )}
                      </dt>
                      <dd>
                        {selected.payment_summary.next_unsettled_date
                          ? `${selected.payment_summary.next_unsettled_date} · ${money(selected.payment_summary.next_unsettled_amount || "0")}`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p>
                    {t(
                      "বকেয়া হিসাব রেকর্ড করা লেনদেনের ভিত্তিতে। বিনিয়োগের সময়সূচি প্রস্তাবিত বিতরণের হিসাব।",
                      "Balances use recorded transactions. Investment schedules show proposed distributions.",
                    )}
                  </p>
                </>
              )}
              <p>
                {t("চুক্তির রেফারেন্স", "Agreement reference")}:{" "}
                {selected.agreement_reference || "—"}
              </p>
              <p>{selected.review_note}</p>
              <ProjectHistory
                key={`${selected.id}-${selected.status}-${selected.entries.length}-${selected.accepted_at}-${selected.agreement_sha256}`}
                applicationId={selected.id}
              />
              <p>
                {t("নিশ্চিত শুরুর তারিখ", "Confirmed start date")}:{" "}
                {selected.start_date || t("এখনো শুরু হয়নি", "Not started")}
              </p>
              <p>
                {t("আবেদনের শর্তের সংস্করণ", "Application terms version")}:{" "}
                {selected.terms_version}
              </p>
              <h3>{t("সময়সূচি", "Schedule")}</h3>
              {selected.agreement_download && (
                <p>
                  <a
                    href={selected.agreement_download}
                    className="button outline"
                  >
                    {t(
                      "ব্যক্তিগত চুক্তির PDF ডাউনলোড",
                      "Download private agreement PDF",
                    )}
                  </a>
                  <small>
                    {t("নথির SHA-256", "Document SHA-256")}:{" "}
                    {selected.agreement_sha256}
                  </small>
                </p>
              )}
              {selected.signed_name && (
                <p>
                  {t("সম্মতির নাম", "Acknowledged by")}: {selected.signed_name}
                </p>
              )}
              <p>
                {t(
                  "গ্রাহকের অনুমোদিত পরিকল্পনা স্বীকার",
                  "Customer acknowledgement",
                )}
                : {selected.accepted_at || t("অপেক্ষমান", "Pending")}
              </p>
              {selected.status === "approved" &&
                !selected.accepted_at &&
                selected.is_owner && (
                  <form
                    key={`${selected.id}-${selected.status}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action("accept", {
                        consent: true,
                        signed_name: new FormData(e.currentTarget).get(
                          "signed_name",
                        ),
                      });
                    }}
                  >
                    <label className="field">
                      {t(
                        "আবেদনে দেওয়া পূর্ণ নাম লিখুন",
                        "Type the applicant's full name",
                      )}
                      <input name="signed_name" required maxLength={120} />
                    </label>
                    <label>
                      <input type="checkbox" required />
                      {t(
                        "আমি দেখানো মূল্য, পরিকল্পনা ও চুক্তির রেফারেন্স পর্যালোচনা করেছি। এটি স্বাক্ষরিত মূল চুক্তির বিকল্প নয়।",
                        "I reviewed the displayed price, plan and agreement reference. This acknowledgement does not replace the signed agreement.",
                      )}
                    </label>
                    <button className="button" disabled={busy}>
                      {t("পরিকল্পনা স্বীকার করুন", "Acknowledge plan")}
                    </button>
                  </form>
                )}
              {selected.term?.maturity_date && (
                <div>
                  <p>
                    {t("মেয়াদ শেষের তারিখ", "Maturity date")}:{" "}
                    {selected.term.maturity_date} ·{" "}
                    {t("বাকি মাস", "Months remaining")}:{" "}
                    {selected.term.remaining_months}
                  </p>
                  <label>
                    {t("সময়ভিত্তিক অগ্রগতি", "Time progress")}:{" "}
                    {selected.term.progress_percent}%
                    <progress
                      value={selected.term.progress_percent}
                      max={100}
                    />
                  </label>
                </div>
              )}
              {selected.kind === "client" && (
                <p>
                  {t("বুকিং ১০%", "Booking 10%")}:{" "}
                  {money(Number(selected.amount) * 0.1)} ·{" "}
                  {t("কাজ শুরু ৩০%", "Work start 30%")}:{" "}
                  {money(Number(selected.amount) * 0.3)} ·{" "}
                  {t("হস্তান্তর ২০%", "Handover 20%")}:{" "}
                  {money(Number(selected.amount) * 0.2)}.{" "}
                  {t(
                    "নিচের সময়সূচি বাকি ৪০% এর জন্য।",
                    "The schedule below covers the remaining 40%.",
                  )}
                </p>
              )}
              {!selected.payment_schedule.length && (
                <p>
                  {t(
                    "অনুমোদন ও শুরু নিশ্চিত হলে সময়সূচি দেখা যাবে।",
                    "Schedule appears after approval and confirmed start.",
                  )}
                </p>
              )}
              <div className="project-ledger">
                {selected.payment_schedule.map((s, i) => (
                  <div key={i}>
                    {i + 1}. {s.date} · {money(s.amount)}
                    <small>
                      {" "}
                      · {t("রেকর্ডকৃত", "Recorded")}: {money(s.recorded_paid)} ·{" "}
                      {t("বাকি", "Remaining")}: {money(s.remaining)}
                      {s.state && (
                        <>
                          {" "}
                          ·{" "}
                          {t(
                            (
                              {
                                settled: "মীমাংসিত",
                                overdue: "তারিখ পার হয়েছে",
                                due_today: "আজ নির্ধারিত",
                                scheduled: "নির্ধারিত",
                                inactive: "নিষ্ক্রিয়",
                              } as Record<string, string>
                            )[s.state] || s.state,
                            s.state.replaceAll("_", " "),
                          )}
                        </>
                      )}
                    </small>
                  </div>
                ))}
              </div>
              <h3>{t("লেনদেনের রেকর্ড", "Transaction records")}</h3>
              {!selected.entries.length && (
                <p>
                  {t(
                    "এখনো কোনো লেনদেন রেকর্ড হয়নি।",
                    "No transactions recorded.",
                  )}
                </p>
              )}
              {selected.entries.map((e) => (
                <p key={e.id}>
                  {e.date} · {e.kind} · {money(e.amount)} · {e.reference} ·{" "}
                  {e.note}
                </p>
              ))}
              <h3>{t("প্রকল্পের আপডেট", "Project updates")}</h3>
              {selected.updates.map((u) => (
                <article key={u.id}>
                  <h4>{lang === "bn" ? u.title_bn || u.title : u.title}</h4>
                  <small>{u.date}</small>
                  <p>
                    {lang === "bn"
                      ? u.description_bn || u.description
                      : u.description}
                  </p>
                </article>
              ))}
              <button className="button outline" onClick={() => window.print()}>
                {t("হিসাব প্রিন্ট করুন", "Print statement")}
              </button>
              <a
                className="button outline"
                href={`/api/v1/project-applications/${selected.id}/statement/`}
              >
                {t("হিসাব ডাউনলোড (CSV)", "Download statement (CSV)")}
              </a>
              {selected.is_owner &&
                ["submitted", "reviewing"].includes(selected.status) && (
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void action("cancel", {})}
                  >
                    {t("আবেদন বাতিল করুন", "Cancel application")}
                  </button>
                )}
              {(permissions.review || permissions.ledger) && (
                <>
                  {permissions.review && selected.status === "reviewing" && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        setMessage("");
                        try {
                          const data = new FormData(e.currentTarget);
                          const result = await api<Application>(
                            `project-applications/${selected.id}/agreement/`,
                            "POST",
                            data,
                          );
                          setSelected(result);
                          await load();
                        } catch (error) {
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : "Upload failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <h3>{t("চূড়ান্ত চুক্তির PDF", "Final agreement PDF")}</h3>
                      <label className="field">
                        {t("PDF (সর্বোচ্চ ৫ MB)", "PDF (up to 5 MB)")}
                        <input
                          name="document"
                          type="file"
                          accept="application/pdf"
                          required
                        />
                      </label>
                      <button className="button" disabled={busy}>
                        {t("ব্যক্তিগত নথি আপলোড", "Upload private document")}
                      </button>
                    </form>
                  )}
                  <h3>{t("টিমের পর্যালোচনা", "Team review")}</h3>
                  <form
                    key={`review-${selected.id}-${selected.status}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(
                        "review",
                        Object.fromEntries(new FormData(e.currentTarget)),
                      );
                    }}
                  >
                    <label className="field">
                      {t("পরের অবস্থা", "Next status")}
                      <select name="status">
                        {(
                          {
                            submitted: ["reviewing", "rejected"],
                            reviewing: ["approved", "rejected"],
                            approved: ["active", "cancelled"],
                            active: ["completed", "cancelled"],
                          } as Record<string, string[]>
                        )[selected.status]?.map((s) => (
                          <option key={s} value={s}>
                            {t(statuses[s], s)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      {t("প্রজেক্ট", "Project")}
                      <select
                        name="project"
                        defaultValue={selected.project ?? ""}
                        disabled={projectsLoading}
                      >
                        <option value="">—</option>
                        {selected.project &&
                          !projects.some(
                            (project) => project.id === selected.project,
                          ) && (
                            <option value={selected.project}>
                              {selected.project_title}
                            </option>
                          )}
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {t(p.title_bn || p.title, p.title)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {projectsLoading && (
                      <p role="status">
                        {t("প্রকল্প লোড হচ্ছে…", "Loading projects…")}
                      </p>
                    )}
                    {projectsError && (
                      <p role="alert">
                        {projectsError}{" "}
                        <button
                          type="button"
                          onClick={() =>
                            void loadProjects(projectPage ? projectPage + 1 : 1)
                          }
                        >
                          {t("আবার চেষ্টা", "Retry")}
                        </button>
                      </p>
                    )}
                    {moreProjects && !projectsError && (
                      <button
                        type="button"
                        className="button outline"
                        disabled={projectsLoading}
                        onClick={() => void loadProjects(projectPage + 1)}
                      >
                        {t("আরও প্রকল্প দেখুন", "Load more projects")}
                      </button>
                    )}
                    <label className="field">
                      {t(
                        "যাচাইকৃত চুক্তির রেফারেন্স",
                        "Reviewed agreement reference",
                      )}
                      <input name="agreement_reference" maxLength={180} />
                    </label>
                    {selected.kind === "client" &&
                      selected.status === "reviewing" && (
                        <label className="field">
                          {t(
                            "চুক্তিতে নিশ্চিত মোট মূল্য (৳)",
                            "Confirmed agreement price (BDT)",
                          )}
                          <input
                            name="confirmed_amount"
                            type="number"
                            min="1"
                            max="100000000"
                            step="0.01"
                            defaultValue={selected.amount}
                          />
                        </label>
                      )}
                    <label className="field">
                      {t(
                        "নিশ্চিত হস্তান্তর / শুরুর তারিখ",
                        "Confirmed handover / start date",
                      )}
                      <input name="start_date" type="date" />
                    </label>
                    <label className="field">
                      {t("পর্যালোচনার নোট", "Review note")}
                      <textarea name="note" maxLength={5000} />
                    </label>
                    <button
                      className="button"
                      disabled={
                        busy ||
                        !permissions.review ||
                        projectsLoading ||
                        ["completed", "cancelled", "rejected"].includes(
                          selected.status,
                        )
                      }
                    >
                      {t("পর্যালোচনা সংরক্ষণ", "Save review")}
                    </button>
                  </form>
                  <h3>
                    {t(
                      "সম্পন্ন লেনদেন রেকর্ড",
                      "Record a completed transaction",
                    )}
                  </h3>
                  <p>
                    {t(
                      "এটি শুধু হিসাবের রেকর্ড; টাকা পাঠায় না।",
                      "This records the ledger only; it does not transfer money.",
                    )}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(
                        "ledger",
                        Object.fromEntries(new FormData(e.currentTarget)),
                      );
                    }}
                  >
                    <label className="field">
                      {t("ধরন", "Type")}
                      <select name="kind">
                        <option value="receipt">Receipt / গ্রহণ</option>
                        <option value="distribution">
                          Distribution / বিতরণ
                        </option>
                        <option value="refund">Refund / ফেরত</option>
                      </select>
                    </label>
                    <label className="field">
                      {t("টাকা", "Amount")}
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>
                    <label className="field">
                      {t(
                        "অনন্য লেনদেন রেফারেন্স",
                        "Unique transaction reference",
                      )}
                      <input name="reference" required maxLength={180} />
                    </label>
                    <label className="field">
                      {t("লেনদেনের তারিখ", "Transaction date")}
                      <input name="date" type="date" required />
                    </label>
                    <label className="field">
                      {t("নোট", "Note")}
                      <textarea name="note" maxLength={1000} />
                    </label>
                    <button
                      className="button"
                      disabled={busy || !permissions.ledger}
                    >
                      {t("লেনদেন সংরক্ষণ", "Save transaction")}
                    </button>
                  </form>
                </>
              )}
            </section>
          )}
          <p role="status" aria-live="polite">
            {message}
          </p>
        </>
      )}
    </div>
  );
}
