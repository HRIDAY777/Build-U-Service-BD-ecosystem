"use client";
import { UiText } from "@/components/ui-text";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "./provider";

const plans = [
  {
    id: "starter",
    bn: "স্টার্টার — পেইন্টিং ও ফিটিংস",
    en: "Starter — painting and fittings",
    amount: 10000,
    months: 4,
    total: 10800,
  },
  {
    id: "basic",
    bn: "বেসিক — ইলেকট্রিক্যাল ও সোলার",
    en: "Basic — electrical and solar",
    amount: 25000,
    months: 6,
    total: 28000,
  },
  {
    id: "premium",
    bn: "প্রিমিয়াম — নির্মাণ সামগ্রী",
    en: "Premium — construction materials",
    amount: 50000,
    months: 12,
    total: 61000,
  },
  {
    id: "regular",
    bn: "রেগুলার — মাসিক বিতরণ",
    en: "Regular — monthly distributions",
    amount: 100000,
    months: 40,
    total: 125000,
  },
  {
    id: "growth",
    bn: "ক্যাপিটাল গ্রোথ — মেয়াদ শেষে",
    en: "Capital growth — at maturity",
    amount: 100000,
    months: 40,
    total: 150000,
  },
] as const;

export function ProjectPlans() {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const money = (n: number) =>
    `৳${n.toLocaleString(lang === "bn" ? "bn-BD" : "en-BD", { maximumFractionDigits: 2 })}`;
  const [selected, setSelected] = useState<string>("starter");
  const [units, setUnits] = useState(1);
  const [cost, setCost] = useState(100000);
  const [months, setMonths] = useState(40);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [success, setSuccess] = useState(false);
  const plan = plans.find((p) => p.id === selected)!;
  const valid = Number.isInteger(units) && units >= 1 && units <= 100;
  const validClient =
    Number.isFinite(cost) &&
    cost >= 1000 &&
    cost <= 100000000 &&
    Number.isInteger(months) &&
    months >= 1 &&
    months <= 40;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setResult("");
    setSuccess(false);
    try {
      await api("leads/", "POST", {
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        interest: `project-investment:${plan.id}`,
        source: "project-plans-v1",
        message: `Enquiry only; no payment or agreement. Plan: ${plan.en}; units: ${units}; proposed capital: BDT ${plan.amount * units}; term: ${plan.months} months.\n${form.get("message") || ""}`,
      });
      setSuccess(true);
      setResult(
        t(
          "আগ্রহের আবেদন জমা হয়েছে। টিম যোগাযোগ করে প্রকল্প ও শর্ত পর্যালোচনা করবে।",
          "Your enquiry has been saved. Our team will contact you to review the project and terms.",
        ),
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : t("আবার চেষ্টা করুন।", "Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap project-plans">
      <span className="eyebrow">
        <UiText text={"U SERVICE · PROJECTS"} />
      </span>
      <h1>
        {t(
          "প্রজেক্ট ও প্রস্তাবিত বিনিয়োগ পরিকল্পনা",
          "Projects & proposed investment plans",
        )}
      </h1>
      <p className="page-intro">
        {t(
          "নির্মাণ, ইলেকট্রিক্যাল, সোলার ও ফিনিশিং কাজের পরিকল্পনা দেখুন।",
          "Explore construction, electrical, solar and finishing project plans.",
        )}
      </p>
      <div className="notice">
        {t(
          "আপনার দেওয়া ব্যবসায়িক নথির প্রস্তাবিত সংখ্যা দিয়ে নমুনা হিসাব দেখানো হচ্ছে। এগুলো নিশ্চিত মুনাফা নয়; মূলধন হারানো, প্রকল্পে বিলম্ব ও অর্থ ফেরত পেতে দেরির ঝুঁকি আছে। প্রকল্প যাচাই ও অনুমোদিত চুক্তি ছাড়া অর্থ গ্রহণ করা হচ্ছে না।",
          "These illustrations use proposed figures from the supplied business documents. Returns are not guaranteed; capital loss, project delays and delayed repayment are possible. Funds are not accepted here; project review and an approved agreement are required.",
        )}
      </div>
      <h2>{t("প্যাকেজ বেছে দেখুন", "Explore the proposed packages")}</h2>
      <div className="project-plan-grid">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`project-plan ${selected === p.id ? "selected" : ""}`}
            aria-pressed={selected === p.id}
            onClick={() => {
              setSelected(p.id);
              setSuccess(false);
              setResult("");
            }}
          >
            <strong>{lang === "bn" ? p.bn : p.en}</strong>
            <span>{money(p.amount)}</span>
            <small>
              {p.months}{" "}
              {t("মাস · প্রস্তাবিত পরিকল্পনা", "months · proposed plan")}
            </small>
          </button>
        ))}
      </div>
      <section className="form-panel project-calculator">
        <h2>{t("নমুনা হিসাব", "Illustrative calculation")}</h2>
        <label className="field">
          {t("ইউনিট সংখ্যা (১–১০০)", "Units (1–100)")}
          <input
            name="units"
            type="number"
            min="1"
            max="100"
            step="1"
            value={units || ""}
            onChange={(e) => setUnits(Number(e.target.value))}
          />
        </label>
        {valid ? (
          <dl className="project-totals">
            <div>
              <dt>{t("প্রস্তাবিত মূলধন", "Proposed capital")}</dt>
              <dd>{money(plan.amount * units)}</dd>
            </div>
            <div>
              <dt>{t("মেয়াদ", "Term")}</dt>
              <dd>
                {plan.months} {t("মাস", "months")}
              </dd>
            </div>
            <div>
              <dt>
                {t(
                  "নথির হিসাব অনুযায়ী মোট প্রাপ্তি",
                  "Illustrative total including capital",
                )}
              </dt>
              <dd data-testid="investment-total">
                {money(plan.total * units)}
              </dd>
            </div>
            <div>
              <dt>{t("মূলধনের অতিরিক্ত অংশ", "Amount above capital")}</dt>
              <dd>{money((plan.total - plan.amount) * units)}</dd>
            </div>
            {plan.id === "regular" && (
              <div>
                <dt>
                  {t(
                    "প্রতি মাসে প্রস্তাবিত বিতরণ (আসলসহ)",
                    "Proposed monthly distribution (includes capital)",
                  )}
                </dt>
                <dd>{money((plan.total * units) / 40)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p role="alert">
            {t(
              "১ থেকে ১০০ পর্যন্ত পূর্ণসংখ্যা দিন।",
              "Enter a whole number from 1 to 100.",
            )}
          </p>
        )}
        <p>
          {t(
            "৪০ মাসের পরিকল্পনায় বিতরণের সময় গণনা প্রকল্প হস্তান্তরের পরে শুরু হয়। এগুলো কোম্পানির মালিকানা কেনার অফার নয়।",
            "For the 40-month plans, the distribution term starts after project handover. These are not offers to purchase company ownership.",
          )}
        </p>
      </section>
      <section className="form-panel project-calculator">
        <h2>
          {t(
            "গ্রাহকের প্রজেক্ট কিস্তির হিসাব",
            "Client project instalment calculator",
          )}
        </h2>
        <p>
          {t(
            "নথিতে প্রস্তাবিত ১০% বুকিং + ৩০% কাজ শুরু + ২০% হস্তান্তর; বাকি ৪০% সর্বোচ্চ ৪০ মাসে, ০% সুদে। চূড়ান্ত মূল্য ও যোগ্যতা টিম নিশ্চিত করবে।",
            "Proposed in the documents: 10% booking + 30% work start + 20% handover; remaining 40% over up to 40 months at 0% interest. Final pricing and eligibility require team confirmation.",
          )}
        </p>
        <label className="field">
          {t("প্রজেক্টের মোট মূল্য (৳)", "Total project price (BDT)")}
          <input
            name="project_cost"
            type="number"
            min="1000"
            max="100000000"
            value={cost || ""}
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </label>
        <label className="field">
          {t("কিস্তির মাস (১–৪০)", "Instalment months (1–40)")}
          <input
            name="instalment_months"
            type="number"
            min="1"
            max="40"
            step="1"
            value={months || ""}
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </label>
        {validClient ? (
          <dl className="project-totals">
            {[
              [t("বুকিং — ১০%", "Booking — 10%"), cost * 0.1],
              [t("কাজ শুরু — ৩০%", "Work start — 30%"), cost * 0.3],
              [t("হস্তান্তর — ২০%", "Handover — 20%"), cost * 0.2],
              [t("কিস্তির মোট — ৪০%", "Instalment balance — 40%"), cost * 0.4],
              [
                t("প্রতি মাসে আনুমানিক", "Approximate monthly instalment"),
                (cost * 0.4) / months,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{money(Number(value))}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p role="alert">
            {t(
              "সঠিক মূল্য ও ১–৪০ মাস দিন।",
              "Enter a valid price and 1–40 months.",
            )}
          </p>
        )}
        <p>
          {t(
            "পয়সার গোল করার পার্থক্য শেষ কিস্তিতে সমন্বয় করতে হবে। আগাম পরিশোধের শর্ত চূড়ান্ত চুক্তিতে থাকবে।",
            "Rounding differences must be reconciled in the final instalment. Early repayment terms belong in the final agreement.",
          )}
        </p>
      </section>
      <form className="form-panel project-calculator" onSubmit={submit}>
        <h2>
          {t(
            "নির্বাচিত পরিকল্পনা নিয়ে যোগাযোগ",
            "Enquire about the selected plan",
          )}
        </h2>
        <p>
          {lang === "bn" ? plan.bn : plan.en} ·{" "}
          {valid ? money(plan.amount * units) : "—"}
        </p>
        <label className="field">
          {t("নাম", "Name")}
          <input name="name" required maxLength={120} />
        </label>
        <label className="field">
          {t("ইমেইল", "Email")}
          <input name="email" type="email" required />
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
        <label className="field">
          {t("প্রকল্প বা প্রশ্ন", "Project or question")}
          <textarea name="message" maxLength={3000} />
        </label>
        <label>
          <input type="checkbox" required />{" "}
          {t(
            "আমি বুঝেছি এটি যোগাযোগের আবেদন; অর্থ জমা বা স্বাক্ষরিত চুক্তি নয়। আমার সঙ্গে যোগাযোগ করা যাবে।",
            "I understand this is an enquiry, not a deposit or signed agreement. I consent to being contacted.",
          )}
        </label>
        <button className="button" disabled={busy || !valid || success}>
          {busy
            ? t("জমা হচ্ছে…", "Submitting…")
            : success
              ? t("জমা হয়েছে", "Submitted")
              : t("আগ্রহের আবেদন পাঠান", "Send enquiry")}
        </button>
        <p role="status" aria-live="polite">
          {result}
        </p>
      </form>
    </div>
  );
}
