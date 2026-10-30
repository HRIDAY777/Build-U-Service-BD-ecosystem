"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  Zap,
  Wrench,
  Truck,
  House,
  HeartHandshake,
  Plus,
  LayoutGrid,
  ShieldCheck,
  WalletCards,
  Headphones,
  CalendarDays,
  Clock3,
  Droplets,
  Paintbrush,
  Sparkles,
  Wind,
  BriefcaseBusiness,
  CheckCircle2,
  Building2,
  CreditCard,
  Info,
  Film,
  Newspaper,
} from "lucide-react";
import { FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Area, Division, Offering } from "@/lib/api";
import { useApp, Text } from "./provider";
import { Photo } from "./photo";

const homeCategories = [
  { slug: "all", bn: "সব সেবা", en: "All services", icon: LayoutGrid, href: "/catalog" },
  { slug: "food", bn: "খাবার", en: "U Food", icon: UtensilsCrossed, href: "/catalog?division=food" },
  { slug: "shop", bn: "অনলাইন শপিং", en: "U Shop", icon: ShoppingBag, href: "/catalog?division=shop" },
  { slug: "pharmacy", bn: "ফার্মেসি", en: "U Pharmacy", icon: Pill, href: "/catalog?division=pharmacy" },
  { slug: "electrician", bn: "ইলেকট্রিশিয়ান", en: "Electrician", icon: Zap, href: "/catalog?division=electrician" },
  { slug: "mechanic", bn: "মেকানিক", en: "Mechanic", icon: Wrench, href: "/mechanic" },
  { slug: "services", bn: "হোম ও এসি সার্ভিস", en: "Home & AC", icon: Wind, href: "/catalog?division=services" },
  { slug: "delivery", bn: "পার্সেল ডেলিভারি", en: "Delivery", icon: Truck, href: "/delivery" },
  { slug: "projects", bn: "প্রজেক্ট ও ইভেন্ট", en: "Projects & Events", icon: BriefcaseBusiness, href: "/projects" },
  { slug: "blog", bn: "নিউজ ও ব্লগ", en: "News & Blog", icon: Newspaper, href: "/blog" },
];

const homeBlogHighlights = [
  {
    id: "ac-care",
    categoryBn: "সেবা টিপস",
    categoryEn: "Service Tips",
    titleBn: "এসি সার্ভিস কখন করাবেন? কয়েকটি লক্ষণ চিনে নিন",
    titleEn: "When should you service your AC? Know the signs",
    metaBn: "১২ অক্টোবর ২০২৬ · ৪ মিনিট পড়ুন",
    metaEn: "12 Oct 2026 · 4 min read",
    image: "/images/photos/electrician-worker-reference.jpg",
  },
  {
    id: "healthy-food",
    categoryBn: "স্বাস্থ্য ও সুস্থতা",
    categoryEn: "Health & Wellness",
    titleBn: "ব্যস্ত জীবনে সুস্থ থাকার ৫টি সহজ অভ্যাস",
    titleEn: "5 easy habits for a healthier busy life",
    metaBn: "১০ অক্টোবর ২০২৬ · ৩ মিনিট পড়ুন",
    metaEn: "10 Oct 2026 · 3 min read",
    image: "/images/photos/food.jpg",
  },
  {
    id: "small-business",
    categoryBn: "ব্যবসা ও আয়",
    categoryEn: "Business & Growth",
    titleBn: "ছোট ব্যবসার জন্য প্রয়োজনীয় সেবা সঙ্গী ও ডেলিভারি সমাধান",
    titleEn: "Everyday service & delivery partners for local businesses",
    metaBn: "২ অক্টোবর ২০২৬ · ৪ মিনিট পড়ুন",
    metaEn: "2 Oct 2026 · 4 min read",
    image: "/images/photos/offers-shopper.webp",
  },
];

const homeServiceCards = [
  { bn: "ইলেকট্রিশিয়ান সার্ভিস", en: "Electrician service", query: "electrician", division: "electrician", image: "/images/photos/electrician-worker-reference.jpg", icon: Zap },
  { bn: "প্লাম্বিং সার্ভিস", en: "Plumbing service", query: "plumbing", division: "services", image: "/images/photos/mechanic.jpg", icon: Droplets },
  { bn: "এসি সার্ভিস", en: "AC service", query: "AC", division: "services", image: "/images/photos/aircon.jpg", icon: Wind },
  { bn: "পেইন্টিং সার্ভিস", en: "Painting service", query: "painting", division: "services", image: "/images/photos/services.jpg", icon: Paintbrush },
  { bn: "মেকানিক সার্ভিস", en: "Mechanic service", query: "mechanic", division: "mechanic", image: "/images/photos/mechanic.jpg", icon: Wrench },
  { bn: "গৃহপরিচ্ছন্নতা", en: "Home cleaning", query: "cleaning", division: "services", image: "/images/photos/services.jpg", icon: Sparkles },
];

const coreVerticals = [
  {
    key: "food",
    tagBn: "খাবার ডেলিভারি",
    tagEn: "Food Delivery",
    titleBn: "ইউ ফুড (রেস্তোরাঁ ও খাবার)",
    titleEn: "U Food (Restaurants & Meals)",
    descBn: "জনপ্রিয় রেস্তোরাঁ থেকে পছন্দের খাবার ও কাস্টম অপশনসহ দ্রুত হোম ডেলিভারি।",
    descEn: "Fresh meals from verified local restaurants with customizable options.",
    ctaBn: "খাবার অর্ডার করুন",
    ctaEn: "Order food",
    href: "/catalog?division=food",
    image: "/images/photos/food.jpg",
    icon: UtensilsCrossed,
  },
  {
    key: "shop",
    tagBn: "অনলাইন কেনাকাটা",
    tagEn: "Online Retail",
    titleBn: "ইউ শপ (নিত্যপ্রয়োজনীয় পণ্য)",
    titleEn: "U Shop (Everyday Shopping)",
    descBn: "মুদি বাজার, গৃহস্থালি পণ্য, ইলেকট্রনিক্স ও লাইফস্টাইল আইটেম এক ব্যাগে অর্ডার করুন।",
    descEn: "Groceries, household essentials, electronics, and lifestyle products.",
    ctaBn: "শপিং করুন",
    ctaEn: "Shop products",
    href: "/catalog?division=shop",
    image: "/images/photos/shop.jpg",
    icon: ShoppingBag,
  },
  {
    key: "pharmacy",
    tagBn: "ফার্মাসিস্ট যাচাইকৃত",
    tagEn: "Pharmacist Verified",
    titleBn: "ইউ ফার্মেসি (ঔষধ ও স্বাস্থ্য)",
    titleEn: "U Pharmacy (Medicine & Care)",
    descBn: "নিবন্ধিত ফার্মাসিস্ট দ্বারা প্রেসক্রিপশন যাচাইকৃত ঔষধ ও হেলথকেয়ার পণ্য।",
    descEn: "OTC and prescription medicines with licensed pharmacist verification.",
    ctaBn: "ঔষধ খুঁজুন",
    ctaEn: "Browse pharmacy",
    href: "/catalog?division=pharmacy",
    image: "/images/photos/pharmacy.jpg",
    icon: Pill,
  },
  {
    key: "services",
    tagBn: "দক্ষ টেকনিশিয়ান",
    tagEn: "Home Technicians",
    titleBn: "হোম, এসি ও ক্লিনিং সার্ভিস",
    titleEn: "Home, AC & Cleaning Services",
    descBn: "এসি সার্ভিসিং, প্লাম্বিং, পেইন্টিং ও ডিপ ক্লিনিংয়ের জন্য সুবিধাজনক সময়ে বুকিং।",
    descEn: "Book AC servicing, plumbing, painting, and cleaning at your preferred time.",
    ctaBn: "সার্ভিস বুক করুন",
    ctaEn: "Book service",
    href: "/catalog?division=services",
    image: "/images/photos/services.jpg",
    icon: House,
  },
  {
    key: "electrician",
    tagBn: "বৈদ্যুতিক সমাধান",
    tagEn: "Electrical Work",
    titleBn: "ইলেকট্রিশিয়ান ও ওয়্যারিং",
    titleEn: "Electrician & Wiring",
    descBn: "সার্কিট মেরামত, ফ্যান-লাইট সেটআপ ও নিরাপদ বৈদ্যুতিক কাজের জন্য অভিজ্ঞ ইলেকট্রিশিয়ান।",
    descEn: "Certified electricians for wiring, switchboards, and urgent electrical repairs.",
    ctaBn: "ইলেকট্রিশিয়ান ডাকুন",
    ctaEn: "Hire electrician",
    href: "/catalog?division=electrician",
    image: "/images/photos/electrician.jpg",
    icon: Zap,
  },
  {
    key: "mechanic",
    tagBn: "কোটেশন ও মেরামত",
    tagEn: "Quote & Repair",
    titleBn: "গাড়ি ও বাইক মেকানিক",
    titleEn: "Car & Bike Mechanic",
    descBn: "সমস্যার বিবরণ ও ছবি দিন, মেকানিক ডায়াগনসিস ও কোটেশন অনুমোদনের পর কাজ করবে।",
    descEn: "Submit vehicle symptoms and review itemized quotes before repair.",
    ctaBn: "মেকানিক বুক করুন",
    ctaEn: "Book mechanic",
    href: "/mechanic",
    image: "/images/photos/mechanic.jpg",
    icon: Wrench,
  },
  {
    key: "delivery",
    tagBn: "কুরিয়ার ও পার্সেল",
    tagEn: "Parcel Delivery",
    titleBn: "অন-ডিমান্ড পার্সেল ডেলিভারি",
    titleEn: "On-Demand Parcel Delivery",
    descBn: "পিকআপ থেকে গন্তব্য পর্যন্ত তাৎক্ষণিক চার্জ হিসাব ও লাইভ রাইডার ট্র্যাকিং।",
    descEn: "Send documents or packages with instant fee calculation and live tracking.",
    ctaBn: "পার্সেল পাঠান",
    ctaEn: "Request delivery",
    href: "/delivery",
    image: "/images/photos/delivery-branded.png",
    icon: Truck,
  },
  {
    key: "events",
    tagBn: "ইভেন্ট ও প্রজেক্ট",
    tagEn: "Events & Projects",
    titleBn: "বিয়ে, ইভেন্ট ও প্রজেক্ট প্ল্যান",
    titleEn: "Weddings, Events & Projects",
    descBn: "বিয়ে ও কর্পোরেট ইভেন্টের প্যাকেজ বুকিং অথবা আমাদের চলমান প্রজেক্টে বিনিয়োগ পরিকল্পনা।",
    descEn: "Plan weddings and corporate events, or explore managed project plans.",
    ctaBn: "ইভেন্ট ও প্রজেক্ট",
    ctaEn: "Explore events",
    href: "/events",
    image: "/images/photos/wedding.jpg",
    icon: HeartHandshake,
  },
];

export function Home({
  divisions,
  faqs,
  offerings,
  areas,
  online,
}: {
  divisions: Division[];
  offerings: Offering[];
  areas: Area[];
  faqs: {
    id: number;
    question: string;
    question_bn: string;
    answer: string;
    answer_bn: string;
  }[];
  online: boolean;
}) {
  const { lang } = useApp();
  const router = useRouter();
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const selectedOffering =
    offerings.find((offering) => offering.id === Number(selectedOfferingId)) ||
    offerings[0];
  const selectedDivisionId = divisions.find(
    (division) => division.slug === selectedOffering?.division_slug,
  )?.id;
  const availableAreas = areas.filter(
    (area) => selectedDivisionId && area.divisions.includes(selectedDivisionId),
  );

  const groupedAreas = useMemo(() => {
    const groups: Record<string, Area[]> = {};
    for (const area of availableAreas) {
      const dist = area.district || (lang === "bn" ? "অন্যান্য" : "Other");
      if (!groups[dist]) groups[dist] = [];
      groups[dist].push(area);
    }
    const priorityNames = [
      "Shariatpur All Areas",
      "Shariatpur Sadar",
      "Naria",
      "Zajira",
      "Bhedarganj",
      "Damudya",
      "Gosairhat",
      "Palong",
      "Sakhipur",
      "Nawdoba (Padma Bridge)",
      "Vojeshwar",
      "Gharisar",
      "Angaria",
      "Chikondi",
    ];
    for (const dist in groups) {
      groups[dist].sort((a, b) => {
        const aIdx = priorityNames.indexOf(a.name);
        const bIdx = priorityNames.indexOf(b.name);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        const aLabel = lang === "bn" ? a.name_bn || a.name : a.name;
        const bLabel = lang === "bn" ? b.name_bn || b.name : b.name;
        return aLabel.localeCompare(bLabel, lang === "bn" ? "bn" : "en");
      });
    }
    return groups;
  }, [availableAreas, lang]);

  const sortedDistricts = useMemo(() => {
    return Object.keys(groupedAreas).sort((a, b) => {
      if (a === "Shariatpur") return -1;
      if (b === "Shariatpur") return 1;
      return a.localeCompare(b);
    });
  }, [groupedAreas]);

  function bookService(event: FormEvent) {
    event.preventDefault();
    if (!selectedOffering || !selectedArea || !scheduledDate || !scheduledTime)
      return;
    const params = new URLSearchParams({
      scheduled_at: `${scheduledDate}T${scheduledTime}`,
      area: selectedArea,
    });
    router.push(`/book/${selectedOffering.id}?${params}`);
  }

  return (
    <div className="landing-page reference-home">
      {/* 1. CLEAN HERO SECTION */}
      <section className="home-reference-hero">
        <div className="home-reference-copy">
          <div className="home-reference-kicker">
            <Sparkles size={15} />
            <Text
              bn="বাংলাদেশের সমন্বিত মাল্টি-সার্ভিস প্ল্যাটফর্ম"
              en="Bangladesh's All-in-One Multi-Service Platform"
            />
          </div>
          <h1>
            <Text
              bn="খাবার, কেনাকাটা, ঔষধ, সার্ভিস ও ডেলিভারি —"
              en="Food, shopping, pharmacy, repairs & delivery —"
            />
            <br />
            <span>
              <Text
                bn="সব সেবা এখন একই প্ল্যাটফর্মে"
                en="all in one trusted platform."
              />
            </span>
          </h1>
          <p>
            <Text
              bn="একটিমাত্র অ্যাকাউন্ট থেকে খাবার ও পণ্য অর্ডার, ফার্মেসি, দক্ষ টেকনিশিয়ান ও মেকানিক বুকিং, পার্সেল ডেলিভারি, ইভেন্ট আয়োজন এবং প্রজেক্ট বিনিয়োগ—সবই স্বচ্ছ মূল্যে।"
              en="Order food, groceries, and medicine, book verified technicians and mechanics, send parcels, plan events, and manage project investments from one account."
            />
          </p>
          <div className="home-hero-cta-row">
            <Link href="/catalog" className="home-hero-primary-btn">
              <LayoutGrid size={17} />
              <Text bn="সব সেবা ও পণ্য দেখুন" en="Explore all services" />
              <ArrowRight size={16} />
            </Link>
            <Link href="/pages/about" className="home-hero-secondary-btn">
              <Info size={17} />
              <Text bn="আমাদের সম্পর্কে জানুন" en="About U Service BD" />
            </Link>
            <Link href="/blog" className="home-hero-blog-btn">
              <Film size={17} />
              <Text
                bn="নিউজ, ব্লগ ও প্রেজেন্টেশন"
                en="News, Blog & Presentation"
              />
            </Link>
          </div>
          <div className="home-reference-trust">
            <span>
              <ShieldCheck size={18} />
              <Text bn="যাচাইকৃত সেবা" en="Verified service" />
            </span>
            <span>
              <Clock3 size={18} />
              <Text bn="সহজ বুকিং" en="Easy booking" />
            </span>
            <span>
              <WalletCards size={18} />
              <Text bn="স্বচ্ছ মূল্য" en="Clear pricing" />
            </span>
            <span>
              <Headphones size={18} />
              <Text bn="গ্রাহক সহায়তা" en="Customer support" />
            </span>
          </div>
        </div>

        <div className="home-reference-worker" aria-hidden="true">
          <Photo src="/images/photos/delivery-branded.png" alt="" eager />
          <div className="home-worker-callout">
            <Text
              bn="১টি অ্যাকাউন্টে\n৮টি পূর্ণাঙ্গ সেবা!"
              en="8 everyday services\nin 1 account!"
            />
          </div>
        </div>

        <form className="home-booking-card" onSubmit={bookService}>
          <div className="home-booking-card-head">
            <span className="home-booking-badge">
              <Text bn="দ্রুত অ্যাপয়েন্টমেন্ট" en="INSTANT APPOINTMENT" />
            </span>
            <h2>
              <CalendarDays size={20} />
              <Text bn="এখনই সার্ভিস বুক করুন" en="Book a service" />
            </h2>
          </div>
          <label>
            <MapPin size={17} />
            <select
              required
              value={selectedArea}
              onChange={(event) => setSelectedArea(event.target.value)}
              disabled={!availableAreas.length}
              aria-label={
                lang === "bn"
                  ? "আপনার লোকেশন নির্বাচন করুন"
                  : "Choose your location"
              }
            >
              <option value="">
                {lang === "bn"
                  ? "আপনার লোকেশন নির্বাচন করুন"
                  : "Choose your location"}
              </option>
              {sortedDistricts.length > 1 ? (
                sortedDistricts.map((district) => {
                  const label =
                    lang === "bn"
                      ? district === "Shariatpur"
                        ? "শরীয়তপুর জেলা (Shariatpur)"
                        : district === "Dhaka"
                        ? "ঢাকা জেলা (Dhaka)"
                        : `${district} জেলা`
                      : `${district} District`;
                  return (
                    <optgroup key={district} label={label}>
                      {groupedAreas[district].map((area) => (
                        <option key={area.id} value={area.name}>
                          {lang === "bn" ? area.name_bn || area.name : area.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                availableAreas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {lang === "bn" ? area.name_bn || area.name : area.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            <Wrench size={17} />
            <select
              required
              value={selectedOffering?.id || ""}
              onChange={(event) => {
                setSelectedOfferingId(event.target.value);
                setSelectedArea("");
              }}
              disabled={!offerings.length}
              aria-label={
                lang === "bn"
                  ? "সার্ভিসের ধরন নির্বাচন করুন"
                  : "Choose a service"
              }
            >
              <option value="">
                {lang === "bn"
                  ? "সার্ভিসের ধরন নির্বাচন করুন"
                  : "Choose a service"}
              </option>
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {lang === "bn"
                    ? offering.name_bn || offering.name
                    : offering.name}
                </option>
              ))}
            </select>
          </label>
          <div className="home-booking-row-2">
            <label>
              <CalendarDays size={17} />
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
                aria-label={
                  lang === "bn" ? "তারিখ নির্বাচন করুন" : "Choose a date"
                }
              />
            </label>
            <label>
              <Clock3 size={17} />
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
                aria-label={
                  lang === "bn" ? "সময় নির্বাচন করুন" : "Choose a time"
                }
              />
            </label>
          </div>
          {!offerings.length && (
            <p className="home-booking-unavailable" role="status">
              <Text
                bn="এই মুহূর্তে অনলাইন বুকিংয়ের সেবা পাওয়া যাচ্ছে না।"
                en="Online booking is unavailable right now."
              />{" "}
              <Link href="/catalog">
                <Text bn="সেবা দেখুন" en="Browse services" />
              </Link>
            </p>
          )}
          <button
            type="submit"
            disabled={!selectedOffering || !availableAreas.length}
          >
            <Search size={19} />
            <Text bn="সার্ভিস খুঁজুন" en="Find a service" />
          </button>
        </form>
      </section>

      {/* 2. 9-CATEGORY ICON RAIL */}
      <nav
        className="home-category-rail"
        aria-label={lang === "bn" ? "সেবা বিভাগ" : "Service categories"}
      >
        {homeCategories.map(({ slug, bn, en, icon: Icon, href }) => (
          <Link
            key={slug}
            href={href}
            className={slug === "all" ? "active" : ""}
          >
            <span>
              <Icon size={23} strokeWidth={2} />
            </span>
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>

      {/* 3. POPULAR HOME SERVICES & WHY U SERVICE BD */}
      <section className="home-discovery-section" id="home-services">
        <div className="home-popular-panel">
          <div className="home-section-heading">
            <h2>
              <Text bn="জনপ্রিয় হোম সার্ভিস" en="Popular home services" />
            </h2>
            <Link href="/catalog?division=services">
              <Text bn="সব দেখুন" en="See all" />
              <ArrowRight size={16} />
            </Link>
          </div>
          {!online && (
            <p className="home-services-notice" role="status">
              <Text
                bn="সেবার তালিকা এখন লোড করা যায়নি। পরে আবার চেষ্টা করুন।"
                en="Services could not be loaded. Please try again later."
              />
            </p>
          )}
          <div className="home-service-cards">
            {offerings.length
              ? offerings.slice(0, 6).map((offering) => {
                  const label =
                    lang === "bn"
                      ? offering.name_bn || offering.name
                      : offering.name;
                  const price = Number(
                    offering.current_price || offering.price,
                  );
                  const image =
                    offering.image ||
                    homeServiceCards.find(
                      (card) => card.division === offering.division_slug,
                    )?.image ||
                    "/images/photos/services.jpg";
                  return (
                    <article className="home-service-card" key={offering.id}>
                      <Link
                        href={`/book/${offering.id}`}
                        className="home-service-photo"
                      >
                        <Photo src={image} alt={label} />
                      </Link>
                      <div className="home-service-info">
                        <h3>
                          <Link href={`/book/${offering.id}`}>{label}</Link>
                        </h3>
                        <p className="home-service-rating">
                          <ShieldCheck size={14} />
                          <Text
                            bn="যাচাইকৃত প্রোভাইডার · স্বচ্ছ বিবরণ"
                            en="Verified provider · Clear scope"
                          />
                        </p>
                        <div className="home-service-footer">
                          <p className="home-service-price">
                            {Number.isFinite(price) && price > 0 ? (
                              <>
                                ৳{" "}
                                {new Intl.NumberFormat(
                                  lang === "bn" ? "bn-BD" : "en-BD",
                                ).format(price)}{" "}
                                <small>
                                  <Text bn="থেকে শুরু" en="starting" />
                                </small>
                              </>
                            ) : (
                              <Text
                                bn="বিস্তারিত মূল্য দেখুন"
                                en="See details for pricing"
                              />
                            )}
                          </p>
                          <Link
                            className="home-service-book"
                            href={`/book/${offering.id}`}
                          >
                            <Text bn="বুক করুন" en="Book now" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              : homeServiceCards.map(
                  ({
                    bn,
                    en,
                    query: serviceQuery,
                    division,
                    image,
                    icon: Icon,
                  }) => (
                    <article className="home-service-card" key={serviceQuery}>
                      <Link
                        href={`/catalog?division=${division}&q=${encodeURIComponent(serviceQuery)}`}
                        className="home-service-photo"
                      >
                        <Photo src={image} alt={lang === "bn" ? bn : en} />
                      </Link>
                      <div className="home-service-info">
                        <h3>
                          <Icon size={16} />
                          <Link
                            href={`/catalog?division=${division}&q=${encodeURIComponent(serviceQuery)}`}
                          >
                            <Text bn={bn} en={en} />
                          </Link>
                        </h3>
                        <p className="home-service-rating">
                          <ShieldCheck size={14} />
                          <Text
                            bn="বিস্তারিত ও মূল্য দেখুন"
                            en="View details and pricing"
                          />
                        </p>
                        <div className="home-service-footer">
                          <p className="home-service-price">
                            <Text
                              bn="সেবার ধরন বেছে নিন"
                              en="Choose a service option"
                            />
                          </p>
                          <Link
                            className="home-service-book"
                            href={`/catalog?division=${division}&q=${encodeURIComponent(serviceQuery)}`}
                          >
                            <Text bn="সেবা দেখুন" en="Explore" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ),
                )}
          </div>
        </div>

        <aside className="home-why-panel" aria-labelledby="why-title">
          <h2 id="why-title">
            <Text bn="কেন U Service BD?" en="Why U Service BD?" />
          </h2>
          <ul>
            <li>
              <CheckCircle2 size={18} />
              <div>
                <strong>
                  <Text
                    bn="যাচাইকৃত মার্চেন্ট ও পেশাদার কর্মী"
                    en="Verified merchants & technicians"
                  />
                </strong>
                <span>
                  <Text
                    bn="প্রতিটি স্টোর, টেকনিশিয়ান ও রাইডার অনুমোদিত।"
                    en="Every store, provider, pharmacist, and rider is vetted."
                  />
                </span>
              </div>
            </li>
            <li>
              <CalendarDays size={18} />
              <div>
                <strong>
                  <Text
                    bn="বুকিংয়ের আগেই স্বচ্ছ মূল্য ও কোটেশন"
                    en="Upfront pricing & itemized quotes"
                  />
                </strong>
                <span>
                  <Text
                    bn="লুকানো চার্জ নেই; কাজের আগে কোটেশন দেখুন।"
                    en="No hidden fees; review quotes before work begins."
                  />
                </span>
              </div>
            </li>
            <li>
              <CreditCard size={18} />
              <div>
                <strong>
                  <Text
                    bn="বাংলাদেশের সব পেমেন্ট মাধ্যম"
                    en="All Bangladesh payment methods"
                  />
                </strong>
                <span>
                  <Text
                    bn="bKash, Nagad, Rocket, Upay, SSLCommerz ও COD।"
                    en="bKash, Nagad, Rocket, Upay, SSLCommerz & COD."
                  />
                </span>
              </div>
            </li>
            <li>
              <Headphones size={18} />
              <div>
                <strong>
                  <Text
                    bn="রিয়েল-টাইম ট্র্যাকিং ও ২৪/৭ সাপোর্ট"
                    en="Real-time tracking & 24/7 support"
                  />
                </strong>
                <span>
                  <Text
                    bn="ড্যাশবোর্ডে প্রতিটি অর্ডার ও বুকিংয়ের লাইভ আপডেট।"
                    en="Track every order, booking, and parcel live."
                  />
                </span>
              </div>
            </li>
          </ul>
          <div className="home-payment-badges">
            <span>bKash</span>
            <span>Nagad</span>
            <span>Rocket</span>
            <span>Upay</span>
            <span>SSLCommerz</span>
            <span>COD</span>
          </div>
        </aside>
      </section>

      {/* 4. 8 CORE BUSINESS DIVISIONS */}
      <section
        className="home-ecosystem-section"
        id="all-services"
        aria-labelledby="ecosystem-title"
      >
        <div className="home-ecosystem-header">
          <div>
            <span className="home-section-kicker">
              <Text bn="আমাদের সব সেবা বিভাগ" en="OUR 8 SERVICE DIVISIONS" />
            </span>
            <h2 id="ecosystem-title">
              <Text
                bn="আপনার প্রয়োজন অনুযায়ী সঠিক বিভাগটি বেছে নিন"
                en="Choose the division that fits your need"
              />
            </h2>
          </div>
          <Link className="text-link" href="/catalog">
            <Text bn="সম্পূর্ণ ক্যাটালগ দেখুন" en="Open full catalog" />
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="home-division-bento">
          {coreVerticals.map((item) => {
            const Icon = item.icon;
            return (
              <article className="home-bento-card" key={item.key}>
                <Link href={item.href} className="home-bento-media">
                  <Photo
                    src={item.image}
                    alt={lang === "bn" ? item.titleBn : item.titleEn}
                  />
                  <span className="home-bento-tag">
                    <Icon size={14} />
                    <Text bn={item.tagBn} en={item.tagEn} />
                  </span>
                </Link>
                <div className="home-bento-body">
                  <h3>
                    <Link href={item.href}>
                      <Text bn={item.titleBn} en={item.titleEn} />
                    </Link>
                  </h3>
                  <p>
                    <Text bn={item.descBn} en={item.descEn} />
                  </p>
                  <Link href={item.href} className="home-bento-cta">
                    <Text bn={item.ctaBn} en={item.ctaEn} />
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. COMPANY PRESENTATION VIDEO & LATEST NEWS / BLOG */}
      <section
        className="home-news-blog-section"
        id="home-news-blog"
        aria-labelledby="home-news-blog-title"
      >
        <div className="home-ecosystem-header">
          <div>
            <span className="home-section-kicker">
              <Text
                bn="কোম্পানি প্রেজেন্টেশন ও নিউজ-ব্লগ"
                en="COMPANY PRESENTATION & NEWS BLOG"
              />
            </span>
            <h2 id="home-news-blog-title">
              <Text
                bn="ভিডিও প্রেজেন্টেশনে আমাদের জানুন এবং সর্বশেষ ব্লগ পড়ুন"
                en="Watch our company presentation & read the latest updates"
              />
            </h2>
          </div>
          <Link className="home-blog-all-btn" href="/blog">
            <Newspaper size={16} />
            <Text bn="নিউজ ও ব্লগ পেজে যান" en="Open News & Blog" />
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="home-news-blog-grid">
          <article className="home-presentation-card">
            <div className="home-presentation-player-wrap">
              <video
                className="home-presentation-video"
                controls
                playsInline
                preload="metadata"
                poster="/images/photos/u-service-presentation-poster.jpg"
              >
                <source
                  src="/videos/u-service-bd-presentation.webm"
                  type="video/webm"
                />
              </video>
            </div>
            <div className="home-presentation-body">
              <div className="home-presentation-badges">
                <span className="home-pres-pill-live">
                  <Film size={13} />
                  <Text
                    bn="অফিসিয়াল প্রেজেন্টেশন · FULL HD"
                    en="OFFICIAL PRESENTATION · FULL HD"
                  />
                </span>
                <span className="home-pres-pill-chapters">
                  <Text
                    bn="০:৪২ সেকেন্ড · ৭টি অধ্যায়"
                    en="0:42 · 7 Chapters"
                  />
                </span>
              </div>
              <h3>
                <Link href="/blog#company-presentation-video">
                  <Text
                    bn="এক নজরে U Service BD Limited — বাংলাদেশের সমন্বিত মাল্টি-সার্ভিস ইকোসিস্টেম"
                    en="Inside U Service BD Limited — Bangladesh's Unified Multi-Service Ecosystem"
                  />
                </Link>
              </h3>
              <p>
                <Text
                  bn="আমাদের ৮টি সেবা বিভাগ, ১১টি পেমেন্ট মাধ্যম, প্রজেক্ট ও বিনিয়োগ পরিকল্পনা এবং মার্চেন্ট-প্রোভাইডার-রাইডার পোর্টালের পূর্ণাঙ্গ ভিডিও পরিচিতি দেখুন।"
                  en="Explore our 8 core service divisions, 11 payment methods, managed project investments, and dedicated partner portals in one concise HD presentation."
                />
              </p>
              <div className="home-presentation-actions">
                <Link
                  href="/blog#company-presentation-video"
                  className="home-pres-primary-cta"
                >
                  <Film size={16} />
                  <Text
                    bn="৭টি অধ্যায়সহ পূর্ণ প্রেজেন্টেশন দেখুন"
                    en="Watch with 7 interactive chapters"
                  />
                  <ArrowUpRight size={15} />
                </Link>
                <Link href="/blog" className="home-pres-secondary-cta">
                  <Text bn="সব ব্লগ ও আপডেট" en="All blog posts" />
                </Link>
              </div>
            </div>
          </article>

          <div className="home-blog-highlights">
            <div className="home-blog-highlights-head">
              <h3>
                <Newspaper size={18} />
                <Text
                  bn="জনপ্রিয় নিউজ ও ব্লগ নিবন্ধ"
                  en="Featured News & Guides"
                />
              </h3>
              <Link href="/blog">
                <Text bn="সব পোস্ট দেখুন" en="View all" />
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="home-blog-highlight-list">
              {homeBlogHighlights.map((post) => (
                <Link
                  href="/blog"
                  key={post.id}
                  className="home-blog-highlight-card"
                >
                  <div className="home-blog-highlight-thumb">
                    <Photo
                      src={post.image}
                      alt={lang === "bn" ? post.titleBn : post.titleEn}
                    />
                  </div>
                  <div className="home-blog-highlight-copy">
                    <span className="home-blog-highlight-tag">
                      <Text bn={post.categoryBn} en={post.categoryEn} />
                    </span>
                    <h4>
                      <Text bn={post.titleBn} en={post.titleEn} />
                    </h4>
                    <small>
                      <Clock3 size={12} />
                      <Text bn={post.metaBn} en={post.metaEn} />
                    </small>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/blog" className="home-blog-more-banner">
              <div>
                <strong>
                  <Text
                    bn="সেবা টিপস, স্বাস্থ্য ও ব্যবসার আরও গাইড পড়ুন"
                    en="Read more service tips, wellness & business guides"
                  />
                </strong>
                <span>
                  <Text
                    bn="নিউজ ও ব্লগ পেজে সব নিবন্ধ ও কোম্পানি আপডেট একসাথে পাচ্ছেন।"
                    en="Browse every article, platform update, and presentation on our News & Blog page."
                  />
                </span>
              </div>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. ABOUT US, INVESTMENT & PARTNERSHIP HUB */}
      <section
        className="home-partner-ecosystem"
        aria-labelledby="partner-ecosystem-title"
      >
        <div className="home-ecosystem-header">
          <div>
            <span className="home-section-kicker">
              <Text
                bn="আমাদের সম্পর্কে, বিনিয়োগ ও পার্টনারশিপ"
                en="ABOUT US, INVESTMENT & PARTNERSHIPS"
              />
            </span>
            <h2 id="partner-ecosystem-title">
              <Text
                bn="আমাদের সাথে জানুন, বিনিয়োগ করুন বা ব্যবসায় যুক্ত হোন"
                en="Learn about us, invest in projects, or partner with us"
              />
            </h2>
          </div>
        </div>

        <div className="home-partner-cards">
          <article className="home-partner-card">
            <div className="home-partner-icon">
              <Info size={24} />
            </div>
            <span className="home-partner-badge">
              <Text bn="আমাদের পরিচয়" en="ABOUT US" />
            </span>
            <h3>
              <Text
                bn="ইউ সার্ভিস বিডি সম্পর্কে জানুন"
                en="About U Service BD Limited"
              />
            </h3>
            <p>
              <Text
                bn="আমাদের লক্ষ্য, সেবার মানদণ্ড এবং কীভাবে আমরা সারা বাংলাদেশে স্থানীয় ব্যবসা ও পরিবারকে সংযুক্ত করছি তা জানুন।"
                en="Discover our mission, service standards, and how we connect households and local businesses across Bangladesh."
              />
            </p>
            <div className="home-partner-links">
              <Link href="/pages/about" className="text-link">
                <Text bn="আমাদের সম্পর্কে পড়ুন" en="Read our story" />
                <ArrowRight size={15} />
              </Link>
              <Link href="/blog" className="text-link">
                <Text bn="নিউজ ও ব্লগ ↗" en="News & Blog ↗" />
              </Link>
            </div>
          </article>

          <article className="home-partner-card highlight">
            <div className="home-partner-icon">
              <BriefcaseBusiness size={24} />
            </div>
            <span className="home-partner-badge">
              <Text bn="বিনিয়োগ ও প্রজেক্ট" en="INVESTMENT & PROJECTS" />
            </span>
            <h3>
              <Text
                bn="প্রজেক্ট ও বিনিয়োগ পরিকল্পনা"
                en="Project & Investment Plans"
              />
            </h3>
            <p>
              <Text
                bn="সোলার, কনস্ট্রাকশন ও সার্ভিস প্রজেক্টে স্টার্টার থেকে গ্রোথ প্যাকেজে আবেদন করুন এবং স্বচ্ছ লেজার স্টেটমেন্ট দেখুন।"
                en="Apply for managed project plans from Starter to Growth tiers with signed agreements and ledger statements."
              />
            </p>
            <div className="home-partner-links">
              <Link href="/projects" className="button">
                <Text bn="প্রজেক্ট প্ল্যান দেখুন" en="View plans" />
              </Link>
              <Link href="/project-account" className="text-link">
                <Text bn="প্রজেক্ট অ্যাকাউন্ট ↗" en="Project account ↗" />
              </Link>
            </div>
          </article>

          <article className="home-partner-card">
            <div className="home-partner-icon">
              <Building2 size={24} />
            </div>
            <span className="home-partner-badge">
              <Text bn="মার্চেন্ট ও স্টোর" en="MERCHANTS & STORES" />
            </span>
            <h3>
              <Text
                bn="রেস্তোরাঁ, ফার্মেসি বা দোকান যুক্ত করুন"
                en="Register Your Store or Restaurant"
              />
            </h3>
            <p>
              <Text
                bn="আপনার ব্যবসা অনলাইনে আনুন, নিজস্ব ক্যাটালগ ও অর্ডার পরিচালনা করুন এবং আরও বেশি গ্রাহকের কাছে পৌঁছান।"
                en="Bring your restaurant, pharmacy, or retail shop online and manage your catalog and orders."
              />
            </p>
            <div className="home-partner-links">
              <Link href="/partner-application" className="text-link">
                <Text bn="পার্টনার আবেদন করুন" en="Apply as a partner" />
                <ArrowRight size={15} />
              </Link>
            </div>
          </article>

          <article className="home-partner-card">
            <div className="home-partner-icon">
              <Wrench size={24} />
            </div>
            <span className="home-partner-badge">
              <Text bn="প্রোভাইডার ও রাইডার" en="PROVIDERS & RIDERS" />
            </span>
            <h3>
              <Text
                bn="টেকনিশিয়ান বা রাইডার হিসেবে কাজ করুন"
                en="Work as a Provider or Rider"
              />
            </h3>
            <p>
              <Text
                bn="দক্ষ টেকনিশিয়ান, মেকানিক বা ডেলিভারি রাইডার হিসেবে নিজের সময়সূচি অনুযায়ী কাজ নিয়ে আয় করুন।"
                en="Join our verified technician network or delivery fleet with dedicated workspaces and clear earnings."
              />
            </p>
            <div className="home-partner-links">
              <Link href="/provider" className="text-link">
                <Text bn="প্রোভাইডার" en="Provider" />
                <ArrowRight size={14} />
              </Link>
              <Link href="/rider" className="text-link">
                <Text bn="রাইডার" en="Rider" />
                <ArrowRight size={14} />
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <section
        className="landing-help landing-section"
        aria-labelledby="help-title"
      >
        <div>
          <span className="eyebrow">
            <Text bn="সাধারণ জিজ্ঞাসা ও সহায়তা" en="FREQUENTLY ASKED QUESTIONS" />
          </span>
          <h2 id="help-title">
            <Text
              bn="প্রশ্ন থাকুক।\nউত্তরও প্রস্তুত।"
              en="Clear answers\nbefore you start."
            />
          </h2>
          <Link href="/contact" className="text-link">
            <Text bn="আমাদের সাথে কথা বলুন" en="Talk to us" />
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="faqs">
          {faqs.length ? (
            faqs.slice(0, 4).map((f) => (
              <details key={f.id}>
                <summary>
                  {lang === "bn" ? f.question_bn || f.question : f.question}
                  <Plus size={18} />
                </summary>
                <p>{lang === "bn" ? f.answer_bn || f.answer : f.answer}</p>
              </details>
            ))
          ) : (
            <p>
              <Text
                bn="অর্ডার, বুকিং কিংবা আপনার এলাকার সেবা নিয়ে জানতে যোগাযোগ করুন।"
                en="Contact us for help with orders, bookings or services in your area."
              />
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
