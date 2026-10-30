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
import "../events-reference.css";

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
  package_selection: PackageSelection;
  notes: string;
  staff_notes: string;
  status: string;
};

type PackageSelection = { bundle?: string; tiers?: Record<string, string> };
const tierIds = ["general", "silver", "gold", "ultra_gold"];
const bundleIds = ["essential", "celebration", "wedding"];

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
const bundleServices: Record<string, string[]> = {
  essential: [
    "Venue setup",
    "Decoration",
    "Catering",
    "Staff and coordination",
  ],
  celebration: ["Decoration", "Catering", "Photography", "Music and sound"],
  wedding: [...serviceOptions],
};
const tierNames = ["সাধারণ", "সিলভার", "গোল্ডেন", "আল্ট্রা গোল্ডেন"];

function ServicePackageTable({
  selection,
  onSelect,
}: {
  selection: PackageSelection;
  onSelect: (service: string, tier: string) => void;
}) {
  return (
    <section
      className="service-package-section"
      aria-labelledby="service-package-title"
    >
      <span className="eyebrow">
        <UiText text={"SERVICE BY SERVICE"} />
      </span>
      <h2 id="service-package-title">
        <UiText text={"প্রতিটি সেবার আলাদা প্যাকেজ"} />
      </h2>
      <p className="page-intro">
        <UiText
          text={
            "যে সেবাটি দরকার, শুধু সেটির প্যাকেজ নিন। একাধিক সেবা একসাথে নিলে টিম কম্বাইন্ড কোটেশন দেবে।"
          }
        />
      </p>
      <div className="service-package-list">
        {servicePackageGroups.map(([service, bn, prices, benefits]) => (
          <article className="service-package-group" key={service}>
            <div className="service-package-heading">
              <h3>
                <Text bn={bn} en={service} />
              </h3>
              <span>
                <UiText text="Choose your package" />
              </span>
            </div>
            <div className="service-tier-grid">
              {tierNames.map((tier, index) => (
                <div className={`service-tier tier-${index}`} key={tier}>
                  <span className="eyebrow">
                    <UiText text={tier} />
                  </span>
                  <strong>
                    <UiText text={prices[index]} />
                  </strong>
                  <p>
                    <UiText text={benefits[index]} />
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    aria-pressed={selection.tiers?.[service] === tierIds[index]}
                    onClick={() => onSelect(service, tierIds[index])}
                  >
                    {selection.tiers?.[service] === tierIds[index] ? (
                      <UiText text={"বাছাই করা হয়েছে"} />
                    ) : (
                      <UiText text={"বাছুন"} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className="event-package-note">
        <UiText
          text={
            "মূল্যগুলো ডেমো প্রাথমিক মূল্য। অতিথির সংখ্যা, তারিখ, এলাকা ও চূড়ান্ত সেবার পরিমাণ দেখে টিম নিশ্চিত কোটেশন দেবে।"
          }
        />
      </p>
    </section>
  );
}

function EventPackages({
  selection,
  onSelect,
}: {
  selection: PackageSelection;
  onSelect: (bundle: string) => void;
}) {
  return (
    <section
      className="event-packages"
      id="event-packages"
      aria-labelledby="event-packages-title"
    >
      <div className="record-head">
        <div>
          <span className="eyebrow">
            <UiText text={"U EVENTS COLLECTION"} />
          </span>
          <h2 id="event-packages-title">
            <UiText text={"আপনার আয়োজনের জন্য প্যাকেজ বাছুন"} />
          </h2>
        </div>
        <span className="subtle">
          <UiText text={"প্রাথমিক বাজেট · কাস্টম কোটেশন দেওয়া হবে"} />
        </span>
      </div>
      <div className="event-package-grid">
        {eventPackages.map((pkg, index) => (
          <article className={`event-package-card ${pkg.tone}`} key={pkg.name}>
            <Photo src={pkg.image} alt={`${pkg.name} / ${pkg.en}`} />
            <div className="event-package-body">
              <span className="eyebrow">
                <UiText text="U EVENTS" />
              </span>
              <h3>
                <Text bn={pkg.name} en={pkg.en} />
              </h3>
              <p className="event-package-price">
                <UiText text={pkg.price} />
              </p>
              <p>
                <UiText text={pkg.guests} />
              </p>
              <ul>
                {pkg.includes.map((item) => (
                  <li key={item}>
                    <UiText text={item} />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="button secondary"
                aria-pressed={selection.bundle === bundleIds[index]}
                onClick={() => onSelect(bundleIds[index])}
              >
                {selection.bundle === bundleIds[index] ? (
                  <UiText text={"বাছাই করা হয়েছে"} />
                ) : (
                  <UiText text={"এই প্যাকেজ নিয়ে শুরু করুন"} />
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="event-package-note">
        <UiText
          text={
            "অতিথির সংখ্যা, এলাকা, তারিখ ও সেবার ধরন অনুযায়ী টিম চূড়ান্ত মূল্য জানাবে। ছবিগুলো পরিকল্পনার অনুপ্রেরণার জন্য।"
          }
        />
      </p>
    </section>
  );
}

function EventHero() {
  return (
    <section className="event-hero" aria-labelledby="events-title">
      <div className="event-hero-copy">
        <span className="event-hero-kicker">
          U EVENTS · MADE FOR YOUR MOMENTS
        </span>
        <h1 id="events-title">
          <Text
            bn="আপনার বিশেষ দিন, সুন্দর আয়োজন"
            en="Make your special day unforgettable"
          />
        </h1>
        <p>
          <Text
            bn="বিয়ে, জন্মদিন বা কর্পোরেট অনুষ্ঠান—ভেন্যু থেকে খাবার, সাজসজ্জা ও সমন্বয়; পরিকল্পনা করুন এক জায়গা থেকেই।"
            en="From weddings and birthdays to corporate gatherings, plan your venue, food, decor and coordination in one place."
          />
        </p>
        <div className="event-hero-actions">
          <Link href="#event-packages" className="event-primary-cta">
            <Text bn="আপনার প্যাকেজ বাছুন" en="Explore packages" />
            <span aria-hidden="true">→</span>
          </Link>
          <a className="event-secondary-cta" href="#event-request">
            <Text bn="পরিকল্পনা শুরু করুন" en="Start planning" />
          </a>
        </div>
        <div className="event-hero-points">
          <span>
            <Text bn="আপনার বাজেট অনুযায়ী" en="For your budget" />
          </span>
          <span>
            <Text bn="একটি নির্ভরযোগ্য টিম" en="A dedicated team" />
          </span>
          <span>
            <Text bn="কাস্টম কোটেশন" en="Custom quotes" />
          </span>
        </div>
      </div>
      <div className="event-cover">
        <Photo
          src="/images/photos/wedding.jpg"
          alt="বাংলাদেশের বিয়ের আয়োজন / A wedding ceremony in Bangladesh"
          eager
        />
        <span className="photo-demo-label">
          <UiText text={"স্টক ছবি · পরিকল্পনার অনুপ্রেরণা"} />
        </span>
        <div className="event-photo-caption">
          <span>
            <Text
              bn="আপনার গল্প, আপনার আয়োজন"
              en="Your story, your celebration"
            />
          </span>
          <strong>
            <Text
              bn="মনে রাখার মতো প্রতিটি মুহূর্ত"
              en="Every moment, beautifully remembered"
            />
          </strong>
        </div>
      </div>
    </section>
  );
}

function EventPlanningNav() {
  return (
    <nav className="event-planning-nav" aria-label="Event planning steps">
      <Link href="#event-packages">
        <span>01</span>
        <Text bn="প্যাকেজ বাছুন" en="Choose a package" />
      </Link>
      <Link href="#service-package-title">
        <span>02</span>
        <Text bn="সেবা তুলনা করুন" en="Compare services" />
      </Link>
      <Link href="#event-request">
        <span>03</span>
        <Text bn="পরিকল্পনা পাঠান" en="Send your plan" />
      </Link>
    </nav>
  );
}

export default function EventsPage() {
  const { user, toast, lang } = useApp();
  const [selection, setSelection] = useState<PackageSelection>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("event-package-draft") || "{}",
      );
      if (typeof saved === "object" && saved && !Array.isArray(saved)) {
        const tiers = Object.fromEntries(
          Object.entries(saved.tiers || {}).filter(
            ([service, tier]) =>
              serviceOptions.includes(service) &&
              tierIds.includes(String(tier)),
          ),
        );
        setSelection({
          bundle: bundleIds.includes(saved.bundle) ? saved.bundle : "",
          tiers: tiers as Record<string, string>,
        });
        setSelectedServices([
          ...new Set([
            ...Object.keys(tiers),
            ...(bundleServices[saved.bundle] || []),
          ]),
        ]);
      }
    } catch {
      /* A blocked storage setting must not prevent planning. */
    }
  }, []);
  function selectPackage(next: PackageSelection) {
    setSelection(next);
    try {
      sessionStorage.setItem("event-package-draft", JSON.stringify(next));
    } catch {}
    document
      .getElementById("event-request")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  function selectBundle(bundle: string) {
    selectPackage({ ...selection, bundle });
    setSelectedServices((current) => [
      ...new Set([...current, ...(bundleServices[bundle] || [])]),
    ]);
  }
  function selectTier(service: string, tier: string) {
    selectPackage({
      ...selection,
      tiers: { ...selection.tiers, [service]: tier },
    });
    setSelectedServices((current) =>
      current.includes(service) ? current : [...current, service],
    );
  }
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
        package_selection: selection,
        notes: addressLine(
          String(data.get("notes") || ""),
          String(data.get("geo_address") || ""),
        ),
      });
      form.reset();
      setSelectedServices([]);
      setSelection({});
      try {
        sessionStorage.removeItem("event-package-draft");
      } catch {}
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
      <main className="page-shell event-planning-page">
        <EventHero />
        <EventPlanningNav />
        <EventPackages selection={selection} onSelect={selectBundle} />
        <ServicePackageTable selection={selection} onSelect={selectTier} />
        <section className="event-signin-panel" id="event-request">
          <div>
            <span className="eyebrow">ONE LAST STEP</span>
            <h2>
              <Text
                bn="আপনার আয়োজনের পরিকল্পনা শুরু করুন"
                en="Let’s start planning your event"
              />
            </h2>
            <p>
              <UiText
                text={"Please sign in to request a wedding or event package."}
              />
            </p>
          </div>
          <Link href="/login" className="event-primary-cta">
            <UiText text={"Sign in"} />
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell event-planning-page">
      <EventHero />
      <EventPlanningNav />
      <EventPackages selection={selection} onSelect={selectBundle} />
      <ServicePackageTable selection={selection} onSelect={selectTier} />
      <section className="event-request-section">
        <div className="event-request-heading">
          <span className="eyebrow">YOUR EVENT, YOUR WAY</span>
          <h2>
            <Text
              bn="আপনার আয়োজনের বিস্তারিত জানান"
              en="Tell us about your event"
            />
          </h2>
          <p className="page-intro">
            <UiText
              text={
                "Tell us what you are planning. Our team can review the brief, suggest a package, and confirm the next steps."
              }
            />
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            <UiText text={error} />
          </p>
        )}
        {(selection.bundle ||
          Object.keys(selection.tiers || {}).length > 0) && (
          <div className="notice" role="status">
            <strong>
              <UiText text={"নির্বাচিত প্যাকেজ / Selected package"} />
            </strong>
            {selection.bundle && (
              <p>{eventPackages[bundleIds.indexOf(selection.bundle)]?.name}</p>
            )}
            {Object.entries(selection.tiers || {}).map(([service, tier]) => (
              <p key={service}>
                {translateUi(service, lang)} ·{" "}
                {tierNames[tierIds.indexOf(tier)]}
              </p>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() => selectPackage({})}
            >
              <UiText text={"প্যাকেজ সরান / Clear packages"} />
            </button>
            <p>
              <UiText
                text={
                  "ডেমো মূল্য চূড়ান্ত নয়। টিমের নিশ্চিত কোটেশন গ্রহণের পর আয়োজন নিশ্চিত হবে।"
                }
              />
            </p>
          </div>
        )}
        <form
          className="form-panel event-form-panel"
          id="event-request"
          onSubmit={submit}
        >
          <h3>
            <Text bn="অনুষ্ঠানের বিস্তারিত" en="Event details" />
          </h3>
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
                  <input
                    type="checkbox"
                    name="services"
                    value={service}
                    checked={selectedServices.includes(service)}
                    onChange={(e) => {
                      setSelectedServices((current) =>
                        e.target.checked
                          ? [...current, service]
                          : current.filter((item) => item !== service),
                      );
                      if (!e.target.checked) {
                        const tiers = { ...selection.tiers };
                        delete tiers[service];
                        selectPackage({ ...selection, tiers });
                      }
                    }}
                  />
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
      </section>
      <section className="event-history-section">
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
              <UiText text={"View history / ইতিহাস দেখুন"} />
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
            {(event.package_selection?.bundle ||
              Object.keys(event.package_selection?.tiers || {}).length > 0) && (
              <div className="notice">
                {event.package_selection.bundle && (
                  <p>
                    {
                      eventPackages[
                        bundleIds.indexOf(event.package_selection.bundle)
                      ]?.name
                    }
                  </p>
                )}
                {Object.entries(event.package_selection.tiers || {}).map(
                  ([service, tier]) => (
                    <p key={service}>
                      {translateUi(service, lang)} ·{" "}
                      {tierNames[tierIds.indexOf(tier)]}
                    </p>
                  ),
                )}
              </div>
            )}
            {event.quoted_budget && (
              <p className="notice">
                <UiText text={"Quoted budget: ৳"} />
                {event.quoted_budget}
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
                <UiText text={"Accept quote / কোট গ্রহণ করুন"} />
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
