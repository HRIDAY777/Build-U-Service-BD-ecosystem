"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  ChevronRight,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { Photo } from "@/components/photo";
import { Text, useApp } from "@/components/provider";

const offers = [
  {
    id: "food",
    category: "food",
    href: "/catalog?division=food",
    image: "/images/photos/food.jpg",
    alt: "Freshly prepared meal",
    titleBn: "ফুড ডেলিভারি",
    titleEn: "Food delivery",
    detailBn: "রেস্টুরেন্ট ও খাবারের সংগ্রহ দেখুন",
    detailEn: "Explore restaurants and meals",
  },
  {
    id: "shopping",
    category: "shopping",
    href: "/catalog?division=shop",
    image: "/images/photos/offers-shopper.webp",
    alt: "A shopper browsing U Service BD",
    titleBn: "অনলাইন শপিং",
    titleEn: "Online shopping",
    detailBn: "নিত্যপ্রয়োজনীয় পণ্য ও ক্যাটাগরি দেখুন",
    detailEn: "Browse everyday products and categories",
  },
  {
    id: "services",
    category: "services",
    href: "/catalog?division=services",
    image: "/images/photos/electrician-worker-reference.jpg",
    alt: "U Service technician at work",
    titleBn: "হোম সার্ভিস",
    titleEn: "Home services",
    detailBn: "বাসা ও অফিসের পেশাদার সেবা দেখুন",
    detailEn: "Explore services for home and office",
  },
  {
    id: "delivery",
    category: "delivery",
    href: "/delivery",
    image: "/images/photos/delivery-rider-reference.jpg",
    alt: "U Service delivery rider",
    titleBn: "ডেলিভারি",
    titleEn: "Delivery",
    detailBn: "পার্সেল ও পণ্য পরিবহনের সেবা দেখুন",
    detailEn: "Explore parcel and product delivery",
  },
];

const filters = [
  { id: "all", bn: "সব অফার", en: "All offers" },
  { id: "food", bn: "ফুড ডেলিভারি", en: "Food delivery" },
  { id: "shopping", bn: "অনলাইন শপিং", en: "Online shopping" },
  { id: "services", bn: "হোম সার্ভিস", en: "Home services" },
  { id: "electrician", bn: "ইলেকট্রিশিয়ান", en: "Electrician" },
  { id: "delivery", bn: "ডেলিভারি", en: "Delivery" },
  { id: "other", bn: "অন্যান্য", en: "Other" },
];

function OffersHeader() {
  const { lang, user, cart } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = [
    { href: "/", bn: "হোম", en: "Home" },
    { href: "/catalog", bn: "বিভাগসমূহ", en: "Divisions" },
    { href: "/projects", bn: "প্রকল্প", en: "Projects" },
    { href: "/events", bn: "ইভেন্ট", en: "Events" },
    { href: "/offers", bn: "অফার", en: "Offers", active: true },
    { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About us" },
    { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
  ];

  return (
    <header className="offers-header">
      <div className="offers-topline">
        <span>U SERVICE BD LIMITED</span>
        <Link href="/pages/terms">
          <Text bn="ডিজিটাল নীতিমালা | শর্তাবলী" en="Policies | Terms" />
        </Link>
      </div>
      <div className="offers-header-main">
        <Link href="/" className="offers-brand" aria-label="U Service BD">
          <BrandLogo eager />
        </Link>
        <nav
          className={menuOpen ? "offers-nav open" : "offers-nav"}
          aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}
          onClick={() => setMenuOpen(false)}
        >
          {nav.map(({ href, bn, en, active }) => (
            <Link
              href={href}
              key={href}
              aria-current={active ? "page" : undefined}
            >
              <Text bn={bn} en={en} />
            </Link>
          ))}
        </nav>
        <div className="offers-header-actions">
          <form action="/catalog" className="offers-search" role="search">
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              aria-label={lang === "bn" ? "সেবা বা অফার খুঁজুন" : "Search services or offers"}
              placeholder={
                lang === "bn" ? "সেবা বা অফার খুঁজুন..." : "Search services or offers..."
              }
            />
          </form>
          <LanguageToggle className="offers-language" />
          <Link className="offers-login" href={user ? "/account" : "/login"}>
            <UserRound size={16} />
            <Text bn={user ? "অ্যাকাউন্ট" : "লগইন"} en={user ? "Account" : "Sign in"} />
          </Link>
          <Link className="offers-account" href={user ? "/account" : "/login?register=1"}>
            <Text bn={user ? "আমার অ্যাকাউন্ট" : "অ্যাকাউন্ট"} en={user ? "My account" : "Account"} />
            <span className="offers-cart-count">
              <ShoppingBag size={13} />
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </Link>
          <button
            type="button"
            className="offers-menu-toggle"
            aria-label={
              menuOpen
                ? lang === "bn"
                  ? "মেনু বন্ধ করুন"
                  : "Close menu"
                : lang === "bn"
                  ? "মেনু খুলুন"
                  : "Open menu"
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function OfferCard({
  offer,
}: {
  offer: (typeof offers)[number];
}) {
  return (
    <article className="offer-card">
      <Link href={offer.href} className="offer-card-image">
        <Photo src={offer.image} alt={offer.alt} />
        <span className="offer-card-tag">
          <Text bn="দেখুন" en="Explore" />
        </span>
      </Link>
      <div className="offer-card-copy">
        <div>
          <Link href={offer.href} className="offer-card-title">
            <Text bn={offer.titleBn} en={offer.titleEn} />
          </Link>
          <p>
            <Text bn={offer.detailBn} en={offer.detailEn} />
          </p>
          <Link className="offer-card-details" href={offer.href}>
            <Text bn="বিস্তারিত দেখুন" en="Explore details" />
          </Link>
        </div>
        <Link
          href={offer.href}
          className="offer-card-arrow"
          aria-label={`${offer.titleEn} — explore`}
        >
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}

export function OffersStorefront() {
  const { lang } = useApp();
  const [activeFilter, setActiveFilter] = useState("all");
  const visibleOffers =
    activeFilter === "all"
      ? offers
      : offers.filter((offer) =>
          activeFilter === "electrician"
            ? offer.category === "services"
            : offer.category === activeFilter,
        );

  return (
    <>
      <OffersHeader />
      <div className="offers-main">
        <section className="offers-hero">
          <div className="offers-hero-copy">
            <span className="offers-eyebrow">U SERVICE BD · OFFERS</span>
            <h1>
              <Text bn="অফার ও বিশেষ" en="Offers & special" />
              <br />
              <strong>
                <Text bn="প্রোমোশন" en="promotions" />
              </strong>
            </h1>
            <p>
              <Text
                bn="ফুড, শপিং, হোম সার্ভিস ও ডেলিভারির ক্যাম্পেইনগুলো এক জায়গায় দেখুন।"
                en="Explore food, shopping, home service and delivery campaigns in one place."
              />
            </p>
            <div className="offers-hero-actions">
              <a href="#offers-list" className="offers-primary-button">
                <Text bn="সব অফার দেখুন" en="View all offers" />
                <ArrowRight size={16} />
              </a>
              <Link href="/pages/terms" className="offers-secondary-button">
                <Text bn="শর্তাবলি জানুন" en="Learn terms" />
              </Link>
            </div>
          </div>
          <div className="offers-hero-collage" aria-label={lang === "bn" ? "বিভিন্ন সেবার ক্যাম্পেইন" : "Campaigns across services"}>
            <Link
              href="/catalog?division=shop"
              className="offers-collage-shop"
              aria-label={lang === "bn" ? "অনলাইন শপিং দেখুন" : "Explore online shopping"}
            >
              <Photo
                src="/images/photos/offers-shopper.webp"
                alt={lang === "bn" ? "অনলাইনে কেনাকাটা করছেন একজন নারী" : "A woman shopping with U Service BD"}
              />
              <span>
                <Text bn="অনলাইন শপিং" en="Online shopping" />
              </span>
            </Link>
            <Link href="/catalog" className="offers-collage-message">
              <span className="offers-percent-icon">
                <BadgePercent size={21} />
              </span>
              <span>
                <strong>
                  <Text bn="এক প্ল্যাটফর্মে" en="One platform for" />
                </strong>
                <small>
                  <Text bn="বিভিন্ন ক্যাম্পেইন" en="different campaigns" />
                </small>
              </span>
              <span className="offers-orbit" aria-hidden="true" />
            </Link>
            <Link href="/catalog?division=food" className="offers-collage-food">
              <Photo src="/images/photos/food.jpg" alt="" />
            </Link>
            <Link href="/catalog?division=services" className="offers-collage-service">
              <Photo src="/images/photos/electrician-worker-reference.jpg" alt="" />
            </Link>
          </div>
        </section>

        <nav className="offers-filter" aria-label={lang === "bn" ? "অফার বিভাগ" : "Offer categories"}>
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.id}
              className={activeFilter === filter.id ? "active" : ""}
              aria-pressed={activeFilter === filter.id}
              onClick={() => setActiveFilter(filter.id)}
            >
              <Text bn={filter.bn} en={filter.en} />
            </button>
          ))}
        </nav>

        <section className="offers-list-section" id="offers-list">
          <div className="offers-section-heading">
            <h2>
              <Text bn="সেবাভিত্তিক অফার ও ক্যাম্পেইন" en="Offers & campaigns by service" />
            </h2>
            <a href="#offers-list" onClick={() => setActiveFilter("all")}>
              <Text bn="ক্যাম্পেইনসমূহ দেখুন" en="Browse campaigns" />
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="offers-grid">
            {visibleOffers.length ? (
              visibleOffers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
            ) : (
              <p className="offers-empty">
                <Text
                  bn="এই বিভাগে এখন কোনো ক্যাম্পেইন দেখানো হচ্ছে না। অন্য বিভাগ দেখুন।"
                  en="There are no campaigns to show in this category. Try another category."
                />
              </p>
            )}
          </div>
        </section>

        <section className="offers-howto">
          <strong>
            <Text bn="অফার ব্যবহার করবেন যেভাবে" en="How to use an offer" />
          </strong>
          <div>
            <span>১</span>
            <Text bn="অফার নির্বাচন করুন" en="Choose a campaign" />
            <ArrowRight size={16} />
          </div>
          <div>
            <span>২</span>
            <Text bn="শর্ত ও মেয়াদ যাচাই করুন" en="Check terms and dates" />
            <ArrowRight size={16} />
          </div>
          <div>
            <span>৩</span>
            <Text bn="অর্ডার বা বুকিংয়ে ব্যবহার করুন" en="Use it when ordering or booking" />
          </div>
        </section>
      </div>
      <footer className="offers-footer">
        <span>
          <Text
            bn="ডিজিটাল নীতিমালা: এখানে কোনো নির্দিষ্ট ছাড়, মূল্য বা মেয়াদের নিশ্চয়তা দেওয়া হয়নি।"
            en="Campaign terms: No specific discount, price or duration is guaranteed on this page."
          />
        </span>
        <Link href="/">
          <Text bn="U SERVICE BD" en="U SERVICE BD" />
          <ChevronRight size={14} />
        </Link>
      </footer>
    </>
  );
}
