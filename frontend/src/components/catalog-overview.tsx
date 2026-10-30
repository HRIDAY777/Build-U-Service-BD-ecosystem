"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  House,
  Menu,
  Pill,
  Search,
  ShoppingCart,
  Utensils,
  Wrench,
  X,
  Zap,
  Truck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { OfferingCard } from "@/components/offering-card";
import { Photo } from "@/components/photo";
import { Text, useApp } from "@/components/provider";
import type { Offering } from "@/lib/api";

const divisions = [
  {
    slug: "shop",
    href: "/catalog?division=shop",
    nameBn: "অনলাইন শপিং",
    nameEn: "Online shopping",
    detailBn: "নিত্যপ্রয়োজনীয় ও পছন্দের পণ্য",
    detailEn: "Everyday essentials and more",
    image: "/images/photos/shop.jpg",
    Icon: ShoppingCart,
  },
  {
    slug: "food",
    href: "/catalog?division=food",
    nameBn: "ফুড ডেলিভারি",
    nameEn: "Food delivery",
    detailBn: "খাবার ও রেস্টুরেন্ট সেবা",
    detailEn: "Meals and restaurant services",
    image: "/images/photos/food.jpg",
    Icon: Utensils,
  },
  {
    slug: "pharmacy",
    href: "/catalog?division=pharmacy",
    nameBn: "ফার্মেসি",
    nameEn: "Pharmacy",
    detailBn: "স্বাস্থ্য ও ব্যক্তিগত যত্ন",
    detailEn: "Health and personal care",
    image: "/images/photos/pharmacy.jpg",
    Icon: Pill,
  },
  {
    slug: "services",
    href: "/catalog?division=services",
    nameBn: "হোম সার্ভিস",
    nameEn: "Home services",
    detailBn: "বাসা ও অফিসের প্রয়োজনীয় সেবা",
    detailEn: "Services for home and office",
    image: "/images/photos/services.jpg",
    Icon: House,
  },
  {
    slug: "electrician",
    href: "/catalog?division=electrician",
    nameBn: "ইলেকট্রিশিয়ান",
    nameEn: "Electrician",
    detailBn: "বিদ্যুৎ ও ইলেকট্রিক্যাল কাজ",
    detailEn: "Electrical repairs and help",
    image: "/images/photos/electrician-worker-reference.jpg",
    Icon: Zap,
  },
  {
    slug: "mechanic",
    href: "/mechanic",
    nameBn: "মেকানিক",
    nameEn: "Mechanic",
    detailBn: "গাড়ি ও যন্ত্রপাতির সেবা",
    detailEn: "Vehicle and equipment care",
    image: "/images/photos/mechanic.jpg",
    Icon: Wrench,
  },
  {
    slug: "delivery",
    href: "/delivery",
    nameBn: "ডেলিভারি",
    nameEn: "Delivery",
    detailBn: "পার্সেল ও পণ্য পরিবহন",
    detailEn: "Parcel and goods delivery",
    image: "/images/photos/delivery-rider-reference.jpg",
    Icon: Truck,
  },
  {
    slug: "events",
    href: "/events",
    nameBn: "বিয়ে ও ইভেন্ট",
    nameEn: "Weddings & events",
    detailBn: "আপনার বিশেষ দিনের আয়োজন",
    detailEn: "Thoughtfully planned celebrations",
    image: "/images/photos/wedding.jpg",
    Icon: CalendarDays,
  },
  {
    slug: "projects",
    href: "/projects",
    nameBn: "প্রকল্পে বিনিয়োগ",
    nameEn: "Project investment",
    detailBn: "সম্ভাবনাময় প্রকল্পগুলো দেখুন",
    detailEn: "Explore investment opportunities",
    image: "/images/photos/project-construction.jpg",
    Icon: Building2,
  },
  {
    slug: "padma-bazar",
    href: "https://padmabazar.com/",
    nameBn: "পদ্মা বাজার",
    nameEn: "Padma Bazar",
    detailBn: "আমাদের সংযুক্ত অনলাইন বাজার",
    detailEn: "Our connected online marketplace",
    image: "/images/brand/padma-bazar-logo.png",
    Icon: ShoppingCart,
    external: true,
  },
];

function CatalogHeader() {
  const { lang, user } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "/", bn: "হোম", en: "Home" },
    { href: "#catalog-divisions", bn: "ব্যবসা বিভাগ", en: "Divisions", current: true },
    { href: "/projects", bn: "প্রকল্প", en: "Projects" },
    { href: "/events", bn: "ইভেন্ট", en: "Events" },
    { href: "/blog", bn: "নিউজ ও ব্লগ", en: "News & blog" },
    { href: "/offers", bn: "অফার", en: "Offers" },
    { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About us" },
    { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
  ];

  return (
    <header className="catalog-overview-header">
      <div className="catalog-overview-topline">
        <span>U SERVICE BD LIMITED</span>
        <span>
          <Text bn="এক প্ল্যাটফর্ম, অনেক সমাধান" en="One platform, many solutions" />
        </span>
      </div>
      <div className="catalog-overview-header-main">
        <Link href="/" className="catalog-overview-brand" aria-label="U Service BD">
          <BrandLogo eager />
        </Link>
        <nav
          className={menuOpen ? "catalog-overview-nav open" : "catalog-overview-nav"}
          aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}
          onClick={() => setMenuOpen(false)}
        >
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
            >
              <Text bn={item.bn} en={item.en} />
            </Link>
          ))}
        </nav>
        <div className="catalog-overview-actions">
          <form className="catalog-overview-search" action="/catalog" role="search">
            <Search size={15} />
            <input
              type="search"
              name="q"
              placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."}
              aria-label={lang === "bn" ? "পণ্য বা সেবা খুঁজুন" : "Search products or services"}
            />
          </form>
          <LanguageToggle className="catalog-overview-lang" />
          <Link className="catalog-overview-account" href={user ? "/account" : "/login"}>
            <Text bn={user ? "অ্যাকাউন্ট" : "লগইন"} en={user ? "Account" : "Login"} />
          </Link>
          <button
            className="catalog-overview-menu"
            type="button"
            aria-expanded={menuOpen}
            aria-label={
              menuOpen
                ? lang === "bn"
                  ? "মেনু বন্ধ করুন"
                  : "Close menu"
                : lang === "bn"
                  ? "মেনু খুলুন"
                  : "Open menu"
            }
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function CatalogOverview({ items = [] }: { items?: Offering[] }) {
  return (
    <div className="catalog-overview">
      <CatalogHeader />
      <div>
        <section className="catalog-overview-hero">
          <div className="catalog-overview-copy">
            <span className="catalog-overview-eyebrow">U SERVICE BD LIMITED</span>
            <h1>
              <Text bn="আমাদের ব্যবসা ও" en="Our products &" />{" "}
              <strong>
                <Text bn="সেবা বিভাগসমূহ" en="service divisions" />
              </strong>
            </h1>
            <p>
              <Text
                bn="শপিং, খাবার, ফার্মেসি থেকে শুরু করে দৈনন্দিন হোম সার্ভিস—সবকিছু একই প্রতিষ্ঠানের সংযুক্ত প্ল্যাটফর্মে।"
                en="From shopping, food and pharmacy to everyday home services—all connected in one platform."
              />
            </p>
            <div className="catalog-overview-hero-links">
              <Link href="/catalog?division=shop">
                <Text bn="প্রোডাক্ট শপে যান" en="Visit Product Shop" />
                <ArrowRight size={17} />
              </Link>
              <a href="#catalog-divisions">
                <Text bn="সব বিভাগ দেখুন" en="Explore divisions" />
              </a>
            </div>
          </div>
          <div className="catalog-overview-category-panel">
            <div className="catalog-overview-panel-title">
              <h2>
                <Text bn="আমাদের সংযুক্ত সেবা বিভাগ" en="Our connected service divisions" />
              </h2>
              <span>
                <Text bn="৯টি বিভাগ + প্রকল্প" en="9 divisions + projects" />
              </span>
            </div>
            <div className="catalog-overview-shortcuts">
              {divisions.map(({ slug, href, nameBn, nameEn, Icon, external }) => (
                <Link
                  href={href}
                  key={slug}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  <span>
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <Text bn={nameBn} en={nameEn} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {items.length > 0 && (
          <section
            className="catalog-overview-divisions"
            aria-labelledby="catalog-featured-products"
          >
            <div className="catalog-overview-section-heading">
              <h2 id="catalog-featured-products">
                <Text bn="জনপ্রিয় প্রোডাক্ট ও সেবাসমূহ" en="Featured Products & Services" />
              </h2>
              <Link href="/catalog?division=shop">
                <Text bn="সব শপ প্রোডাক্ট দেখুন" en="View all shop products" />
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="offering-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
              {items.slice(0, 12).map((offering) => (
                <OfferingCard key={offering.id} offering={offering} />
              ))}
            </div>
          </section>
        )}

        <section
          className="catalog-overview-divisions"
          id="catalog-divisions"
          aria-labelledby="catalog-overview-title"
        >
          <div className="catalog-overview-section-heading">
            <h2 id="catalog-overview-title">
              <Text bn="আমাদের প্রধান ব্যবসা বিভাগ" en="Our main business divisions" />
            </h2>
            <Link href="/stores">
              <Text bn="প্রতিটি বিভাগ সম্পর্কে জানুন" en="Learn about each division" />
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="catalog-overview-grid">
            {divisions.map(({ slug, href, nameBn, nameEn, detailBn, detailEn, image, external }) => (
              <Link
                className={
                  external
                    ? "catalog-overview-card catalog-overview-card-padma"
                    : "catalog-overview-card"
                }
                href={href}
                key={slug}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                <Photo src={image} alt={nameEn} />
                <span className="catalog-overview-card-number">
                  {String(divisions.findIndex((division) => division.slug === slug) + 1).padStart(2, "0")}
                </span>
                <div>
                  <span>
                    <strong>
                      <Text bn={nameBn} en={nameEn} />
                    </strong>
                    <small>
                      <Text bn={detailBn} en={detailEn} />
                    </small>
                  </span>
                  <span className="catalog-overview-card-arrow">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <footer className="catalog-overview-footer">
        <span>© U Service BD Limited</span>
        <span>
          <Text bn="একটি প্ল্যাটফর্ম | একাধিক সেবা বিভাগ" en="One platform | Multiple service divisions" />
        </span>
      </footer>
    </div>
  );
}
