"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp, Text } from "@/components/provider";
import { translateUi } from "@/lib/translations";
import { Photo } from "@/components/photo";
import {
  LocationPicker,
  LocalityInput,
  addressLine,
} from "@/components/location-picker";

type EventRequest = {
  id: string;
  event_type: string;
  title: string;
  event_date: string;
  guest_count: number;
  venue: string;
  area: string;
  budget: string | null;
  quoted_budget: string | null;
  services: string[];
  notes: string;
  staff_notes: string;
  status: string;
};

const serviceOptions = [
  "Venue setup",
  "Catering",
  "Decoration",
  "Photography",
  "Music and sound",
  "Staff and coordination",
  "Transport",
];

const eventPackages = [
  {
    name: "সাদামাটা আয়োজন",
    en: "Essential gathering",
    price: "৳৩৫,০০০ থেকে",
    guests: "৩০–৮০ জন",
    image: "/images/photos/wedding.jpg",
    tone: "event-package-green",
    includes: ["বেসিক সাজসজ্জা", "হালকা নাশতা ও পানীয়", "২ জন সমন্বয়কারী"],
  },
  {
    name: "উৎসব আয়োজন",
    en: "Celebration package",
    price: "৳৮৫,০০০ থেকে",
    guests: "৮০–২০০ জন",
    image: "/images/photos/services.jpg",
    tone: "event-package-purple",
    includes: ["থিম ডেকোরেশন", "বাফে ক্যাটারিং", "ফটোগ্রাফি ও সাউন্ড"],
  },
  {
    name: "সম্পূর্ণ বিবাহ পরিকল্পনা",
    en: "Full wedding planning",
    price: "৳১,৮০,০০০ থেকে",
    guests: "২০০–৫০০ জন",
    image: "/images/photos/wedding.jpg",
    tone: "event-package-gold",
    includes: [
      "ভেন্যু ও সাজসজ্জা",
      "মেনু ও পরিবেশন",
      "ফটো, ভিডিও ও পুরো সমন্বয়",
    ],
  },
];

const servicePackageGroups = [
  [
    "Venue setup",
    "ভেন্যু প্রস্তুতি",
    ["৳১২,০০০", "৳২৫,০০০", "৳৪৫,০০০", "৳৮০,০০০"],
    [
      "বেসিক চেয়ার-টেবিল",
      "স্টেজ ও লাইট",
      "থিম ভেন্যু",
      "সম্পূর্ণ ভেন্যু ব্যবস্থাপনা",
    ],
  ],
  [
    "Catering",
    "ক্যাটারিং",
    ["৳৩৫০/জন", "৳৬৫০/জন", "৳৯৫০/জন", "৳১,৪৫০/জন"],
    [
      "২ আইটেম মেনু",
      "৫ আইটেম বুফে",
      "৮ আইটেম প্রিমিয়াম মেনু",
      "শেফ ও লাইভ কাউন্টার",
    ],
  ],
  [
    "Decoration",
    "সাজসজ্জা",
    ["৳১৫,০০০", "৳৩৫,০০০", "৳৭৫,০০০", "৳১,৫০,০০০"],
    ["বেসিক ফুল", "থিম ব্যাকড্রপ", "ফুল থিম ডেকোর", "প্রিমিয়াম কাস্টম সেট"],
  ],
  [
    "Photography",
    "ফটোগ্রাফি",
    ["৳৮,০০০", "৳১৮,০০০", "৳৩৫,০০০", "৳৬৫,০০০"],
    [
      "১ ফটোগ্রাফার",
      "ফটো ও হাইলাইট",
      "ফটো-ভিডিও টিম",
      "সিনেমাটিক পূর্ণ কভারেজ",
    ],
  ],
  [
    "Music and sound",
    "মিউজিক ও সাউন্ড",
    ["৳৬,০০০", "৳১৫,০০০", "৳৩০,০০০", "৳৬০,০০০"],
    [
      "বেসিক সাউন্ড",
      "ডিজে ও মাইক",
      "স্টেজ লাইট ও ডিজে",
      "লাইভ ব্যান্ড ও কনসোল",
    ],
  ],
  [
    "Staff and coordination",
    "স্টাফ ও সমন্বয়",
    ["৳৫,০০০", "৳১২,০০০", "৳২৫,০০০", "৳৫০,০০০"],
    [
      "২ জন সহকারী",
      "৪ জন ইভেন্ট স্টাফ",
      "সুপারভাইজারসহ টিম",
      "পূর্ণ ইভেন্ট ডিরেকশন",
    ],
  ],
  [
    "Transport",
    "পরিবহন",
    ["৳৪,০০০", "৳১০,০০০", "৳২২,০০০", "৳৪৫,০০০"],
    ["১টি গাড়ি", "২টি গাড়ি", "অতিথি শাটল", "সম্পূর্ণ ট্রান্সপোর্ট ডেস্ক"],
  ],
] as const;
const tierNames = ["সাধারণ", "সিলভার", "গোল্ডেন", "আল্ট্রা গোল্ডেন"];

function ServicePackageTable() {
  return (
    <section
      className="service-package-section"
      aria-labelledby="service-package-title"
    >
      <span className="eyebrow">
        <UiText text={"SERVICE BY SERVICE"} />
      </span>
      <h2 id="service-package-title">প্রতিটি সেবার আলাদা প্যাকেজ</h2>
      <p className="page-intro">
        যে সেবাটি দরকার, শুধু সেটির প্যাকেজ নিন। একাধিক সেবা একসাথে নিলে টিম
        কম্বাইন্ড কোটেশন দেবে।
      </p>
      <div className="service-package-list">
        {servicePackageGroups.map(([service, bn, prices, benefits]) => (
          <article className="service-package-group" key={service}>
            <div className="service-package-heading">
              <h3>{bn}</h3>
              <span>{service}</span>
            </div>
            <div className="service-tier-grid">
              {tierNames.map((tier, index) => (
                <div className={`service-tier tier-${index}`} key={tier}>
                  <span className="eyebrow">{tier}</span>
                  <strong>{prices[index]}</strong>
                  <p>{benefits[index]}</p>
                  <a href="#event-request">বাছুন</a>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className="event-package-note">
        মূল্যগুলো ডেমো প্রাথমিক মূল্য। অতিথির সংখ্যা, তারিখ, এলাকা ও চূড়ান্ত
        সেবার পরিমাণ দেখে টিম নিশ্চিত কোটেশন দেবে।
      </p>
    </section>
  );
}

function EventPackages() {
  return (
    <section className="event-packages" aria-labelledby="event-packages-title">
      <div className="record-head">
        <div>
          <span className="eyebrow">
            <UiText text={"U EVENTS COLLECTION"} />
          </span>
          <h2 id="event-packages-title">আপনার আয়োজনের জন্য প্যাকেজ বাছুন</h2>
        </div>
        <span className="subtle">প্রাথমিক বাজেট · কাস্টম কোটেশন দেওয়া হবে</span>
      </div>
      <div className="event-package-grid">
        {eventPackages.map((pkg) => (
          <article className={`event-package-card ${pkg.tone}`} key={pkg.name}>
            <Photo src={pkg.image} alt={`${pkg.name} / ${pkg.en}`} />
            <div className="event-package-body">
              <span className="eyebrow">{pkg.en}</span>
              <h3>{pkg.name}</h3>
              <p className="event-package-price">{pkg.price}</p>
              <p>{pkg.guests}</p>
              <ul>
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <a className="button secondary" href="#event-request">
                এই প্যাকেজ নিয়ে শুরু করুন
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="event-package-note">
        অতিথির সংখ্যা, এলাকা, তারিখ ও সেবার ধরন অনুযায়ী টিম চূড়ান্ত মূল্য
        জানাবে। ছবিগুলো পরিকল্পনার অনুপ্রেরণার জন্য।
      </p>
    </section>
  );
}

export default function EventsPage() {
  const { user, toast, lang } = useApp();
  const [events, setEvents] = useState<EventRequest[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    Record<string, { action: string; created_at: string }[]>
  >({});

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setEvents((await api<PageResult<EventRequest>>("events/")).results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load events");
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const services = data.getAll("services").map(String);
    try {
      await api("events/", "POST", {
        event_type: data.get("event_type"),
        title: data.get("title"),
        event_date: data.get("event_date"),
        guest_count: Number(data.get("guest_count")),
        venue: data.get("venue"),
        area: data.get("area"),
        budget: data.get("budget") || null,
        services,
        notes: addressLine(
          String(data.get("notes") || ""),
          String(data.get("geo_address") || ""),
        ),
      });
      form.reset();
      toast("Event request submitted / ইভেন্ট অনুরোধ পাঠানো হয়েছে");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to submit event request",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="page-shell narrow">
        <div className="event-cover">
          <Photo
            src="/images/photos/wedding.jpg"
            alt="বাংলাদেশের বিয়ের আয়োজন / A wedding ceremony in Bangladesh"
            eager
          />
          <span className="photo-demo-label">
            স্টক ছবি · পরিকল্পনার অনুপ্রেরণা
          </span>
        </div>
        <EventPackages />
        <ServicePackageTable />
        <h1>
          <UiText text={"Wedding & event planning"} />
        </h1>
        <p>
          <UiText
            text={"Please sign in to request a wedding or event package."}
          />
        </p>
        <Link href="/login" className="button">
          <UiText text={"Sign in"} />
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell narrow">
      <div className="event-cover">
        <Photo
          src="/images/photos/wedding.jpg"
          alt="বাংলাদেশের বিয়ের আয়োজন / A wedding ceremony in Bangladesh"
          eager
        />
        <span className="photo-demo-label">
          স্টক ছবি · পরিকল্পনার অনুপ্রেরণা
        </span>
      </div>
      <EventPackages />
      <ServicePackageTable />
      <span className="eyebrow">U EVENTS</span>
      <h1>
        <Text bn="বিয়ে ও ইভেন্ট ম্যানেজমেন্ট" en="Wedding & event management" />
      </h1>
      <p className="page-intro">
        <UiText
          text={
            "Tell us what you are planning. Our team can review the brief, suggest a package, and confirm the next steps."
          }
        />
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="form-panel" id="event-request" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <UiText text={"Event type"} />
            <select name="event_type" defaultValue="wedding">
              <option value="wedding">
                <UiText text={"Wedding"} />
              </option>
              <option value="birthday">
                <UiText text={"Birthday"} />
              </option>
              <option value="corporate">
                <UiText text={"Corporate"} />
              </option>
              <option value="other">
                <UiText text={"Other"} />
              </option>
            </select>
          </label>
          <label className="field">
            <UiText text={"Event title"} />
            <input
              name="title"
              required
              maxLength={160}
              placeholder={
                lang === "bn"
                  ? "যেমন: রাহিম ও আয়েশার বিয়ে"
                  : "For example: Rahim & Ayesha's wedding"
              }
            />
          </label>
          <label className="field">
            <UiText text={"Event date"} />
            <input name="event_date" required type="date" />
          </label>
          <label className="field">
            <UiText text={"Guest count"} />
            <input
              name="guest_count"
              required
              type="number"
              min={1}
              max={100000}
            />
          </label>
          <label className="field">
            <UiText text={"Venue"} />
            <input
              name="venue"
              required
              maxLength={180}
              placeholder={
                lang === "bn"
                  ? "ভেন্যুর নাম বা বাড়ির ঠিকানা"
                  : "Venue or home address"
              }
            />
          </label>
          <label className="field">
            <UiText text={"Area"} />
            <LocalityInput name="area" required />
          </label>
          <label className="field">
            <UiText text={"Estimated budget (BDT)"} />
            <input name="budget" type="number" min={0} step="0.01" />
          </label>
        </div>
        <LocationPicker />
        <fieldset className="field-group">
          <legend>
            <UiText text={"Services needed"} />
          </legend>
          <div className="check-grid">
            {serviceOptions.map((service) => (
              <label className="check-row" key={service}>
                <input type="checkbox" name="services" value={service} />
                <UiText text={service} />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <UiText text={"Planning notes"} />
          <textarea
            name="notes"
            maxLength={2000}
            placeholder={
              lang === "bn"
                ? "সাজসজ্জার ধরন, খাবারের পছন্দ, সময় বা বিশেষ অনুরোধ"
                : "Theme, food preferences, timing, or special requests"
            }
          />
        </label>
        <button className="button" disabled={busy}>
          <UiText text={busy ? "Sending…" : "Request event planning"} />
        </button>
      </form>
      <section style={{ marginTop: 30 }}>
        <h2>
          <UiText text={"Your event requests"} />
        </h2>
        {!events.length && (
          <p className="subtle">
            <UiText text={"No event requests yet."} />
          </p>
        )}
        {events.map((event) => (
          <article className="record" key={event.id}>
            <div className="record-head">
              <div>
                <h3>{event.title}</h3>
                <p>
                  {event.event_date} · {event.guest_count}
                  <UiText text={"guests ·"} />
                  {event.area}
                </p>
              </div>
              <span className="status">
                <UiText text={event.status.replaceAll("_", " ")} />
              </span>
            </div>
            <p>
              {event.services
                .map((service) => translateUi(service, lang))
                .join(" · ") || translateUi("Planning consultation", lang)}
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                try {
                  const entries = await api<
                    { action: string; created_at: string }[]
                  >(`events/${event.id}/history/`);
                  setHistory((current) => ({
                    ...current,
                    [event.id]: entries,
                  }));
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to load history",
                  );
                }
              }}
            >
              View history / ইতিহাস দেখুন
            </button>
            {history[event.id] && (
              <ul>
                {history[event.id].map((entry, index) => (
                  <li key={index}>
                    {entry.action.replace("event.", "").replaceAll("_", " ")} ·{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
            {event.quoted_budget && (
              <p className="notice">
                Quoted budget: ৳{event.quoted_budget}
                {event.staff_notes && (
                  <>
                    <br />
                    {event.staff_notes}
                  </>
                )}
              </p>
            )}
            {event.status === "quoted" && (
              <button
                className="button"
                type="button"
                onClick={async () => {
                  try {
                    await api(`events/${event.id}/accept_quote/`, "POST");
                    toast("Event confirmed / ইভেন্ট নিশ্চিত হয়েছে");
                    await load();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Unable to accept quote",
                    );
                  }
                }}
              >
                Accept quote / কোট গ্রহণ করুন
              </button>
            )}
            {(["requested", "reviewing", "quoted"] as string[]).includes(
              event.status,
            ) && (
              <button
                className="button secondary"
                type="button"
                onClick={async () => {
                  try {
                    await api(`events/${event.id}/cancel/`, "POST");
                    toast("Event request cancelled / অনুরোধ বাতিল হয়েছে");
                    await load();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Unable to cancel event",
                    );
                  }
                }}
              >
                <UiText text={"Cancel request"} />
              </button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
