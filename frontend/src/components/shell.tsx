"use client";
import { TranslatedButton } from "@/components/translated-elements";
import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "@/app/home-header.css";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Menu,
  ShoppingBag,
  UserRound,
  X,
  MapPin,
  House,
  LayoutGrid,
  PackageCheck,
  Heart,
  Search,
  Film,
  Headphones,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { useApp, Text } from "./provider";
import { BrandLogo } from "./brand-logo";
import { LanguageToggle } from "./language-toggle";

type NavItem = { href: string; bn: string; en: string };

type RouteContext = {
  titleBn: string;
  titleEn: string;
  parent?: { href: string; bn: string; en: string };
  related: NavItem[];
};

function getPrimaryNavigation(pathname: string, isStaff?: boolean): NavItem[] {
  // Clean, uncluttered main navigation bar that ALWAYS includes "আমাদের সেবা", "নিউজ ও ব্লগ", and "আমাদের সম্পর্কে (About us)"
  if (
    pathname.startsWith("/admin-panel") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/provider") ||
    pathname.startsWith("/rider") ||
    pathname.startsWith("/loyalty") ||
    pathname.startsWith("/returns") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/support")
  ) {
    return [
      { href: "/", bn: "হোম", en: "Home" },
      { href: "/catalog", bn: "আমাদের সেবা", en: "Our Services" },
      { href: "/account", bn: "আমার অ্যাকাউন্ট", en: "My Account" },
      ...(isStaff
        ? [
            { href: "/admin-panel", bn: "অ্যাডমিন প্যানেল", en: "Admin Panel" },
            { href: "/portal", bn: "অপারেশনস পোর্টাল", en: "Portal" },
          ]
        : [{ href: "/project-account", bn: "প্রজেক্ট অ্যাকাউন্ট", en: "Project Account" }]),
      { href: "/blog", bn: "নিউজ ও ব্লগ", en: "News & Blog" },
      { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About us" },
      { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
    ];
  }

  return [
    { href: "/", bn: "হোম", en: "Home" },
    { href: "/catalog", bn: "আমাদের সেবা", en: "Our Services" },
    { href: "/catalog?division=shop", bn: "শপ ও গ্রোসারি", en: "Shop & Grocery" },
    { href: "/delivery", bn: "ডেলিভারি", en: "Delivery" },
    { href: "/projects", bn: "প্রজেক্ট ও বিনিয়োগ", en: "Projects" },
    { href: "/blog", bn: "নিউজ ও ব্লগ", en: "News & Blog" },
    ...(isStaff
      ? [{ href: "/admin-panel", bn: "অ্যাডমিন প্যানেল", en: "Admin Panel" }]
      : []),
    { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About us" },
    { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
  ];
}

function getRouteContext(pathname: string): RouteContext {
  if (pathname.startsWith("/book/")) {
    return {
      titleBn: "সার্ভিস বুকিং",
      titleEn: "Service Booking",
      parent: { href: "/catalog?division=services", bn: "হোম সার্ভিস", en: "Home Services" },
      related: [
        { href: "/catalog?division=services", bn: "হোম সার্ভিস", en: "Home Services" },
        { href: "/catalog?division=electrician", bn: "ইলেকট্রিশিয়ান", en: "Electrician" },
        { href: "/mechanic", bn: "মেকানিক", en: "Mechanic" },
        { href: "/account", bn: "আমার বুকিং", en: "My Bookings" },
      ],
    };
  }
  if (pathname.startsWith("/catalog")) {
    return {
      titleBn: "পণ্য ও সেবা ক্যাটালগ",
      titleEn: "Services & Catalog",
      parent: { href: "/", bn: "হোমপেজ", en: "Home" },
      related: [
        { href: "/catalog?division=food", bn: "খাবার", en: "Food" },
        { href: "/catalog?division=shop", bn: "শপিং", en: "Shop" },
        { href: "/catalog?division=pharmacy", bn: "ঔষধ", en: "Pharmacy" },
        { href: "/catalog?division=services", bn: "হোম সার্ভিস", en: "Home Services" },
        { href: "/checkout", bn: "চেকআউট", en: "Checkout" },
      ],
    };
  }
  if (pathname.startsWith("/checkout")) {
    return {
      titleBn: "চেকআউট ও পেমেন্ট",
      titleEn: "Checkout & Payment",
      parent: { href: "/catalog", bn: "ক্যাটালগ", en: "Catalog" },
      related: [
        { href: "/catalog", bn: "আরও পণ্য দেখুন", en: "Browse Catalog" },
        { href: "/wishlist", bn: "পছন্দের তালিকা", en: "Wishlist" },
        { href: "/account", bn: "আমার অর্ডার", en: "My Orders" },
      ],
    };
  }
  if (pathname.startsWith("/mechanic")) {
    return {
      titleBn: "গাড়ি ও বাইক মেকানিক",
      titleEn: "Vehicle Mechanic",
      parent: { href: "/catalog", bn: "সেবাসমূহ", en: "Services" },
      related: [
        { href: "/catalog?division=electrician", bn: "ইলেকট্রিশিয়ান", en: "Electrician" },
        { href: "/catalog?division=services", bn: "হোম সার্ভিস", en: "Home Services" },
        { href: "/account", bn: "আমার বুকিং", en: "My Bookings" },
      ],
    };
  }
  if (pathname.startsWith("/delivery")) {
    return {
      titleBn: pathname.includes("/track") ? "পার্সেল ট্র্যাকিং" : "পার্সেল ডেলিভারি",
      titleEn: pathname.includes("/track") ? "Track Parcel" : "Parcel Delivery",
      parent: { href: "/catalog", bn: "সেবাসমূহ", en: "Services" },
      related: [
        { href: "/delivery", bn: "পার্সেল পাঠান", en: "Send Parcel" },
        { href: "/delivery/track", bn: "পার্সেল ট্র্যাক করুন", en: "Track Parcel" },
        { href: "/account", bn: "আমার ডেলিভারি", en: "My Deliveries" },
      ],
    };
  }
  if (pathname.startsWith("/events")) {
    return {
      titleBn: "বিয়ে ও ইভেন্ট আয়োজন",
      titleEn: "Weddings & Events",
      parent: { href: "/", bn: "হোমপেজ", en: "Home" },
      related: [
        { href: "/catalog?division=food", bn: "খাবার ও ক্যাটারিং", en: "Food & Catering" },
        { href: "/projects", bn: "প্রজেক্ট প্ল্যান", en: "Projects" },
        { href: "/contact", bn: "পরামর্শ নিন", en: "Contact Us" },
      ],
    };
  }
  if (pathname.startsWith("/projects")) {
    return {
      titleBn: "প্রজেক্ট ও বিনিয়োগ পরিকল্পনা",
      titleEn: "Projects & Investment Plans",
      parent: { href: "/", bn: "হোমপেজ", en: "Home" },
      related: [
        { href: "/project-account", bn: "প্রজেক্ট অ্যাকাউন্ট", en: "Project Account" },
        { href: "/partner-application", bn: "পার্টনার আবেদন", en: "Partner Apply" },
        { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About Us" },
      ],
    };
  }
  if (pathname.startsWith("/project-account")) {
    return {
      titleBn: "প্রজেক্ট ও বিনিয়োগ অ্যাকাউন্ট",
      titleEn: "Project & Investment Account",
      parent: { href: "/projects", bn: "প্রজেক্ট প্ল্যান", en: "Projects" },
      related: [
        { href: "/projects", bn: "বিনিয়োগ প্ল্যান", en: "Investment Plans" },
        { href: "/account", bn: "গ্রাহক অ্যাকাউন্ট", en: "Customer Account" },
        { href: "/support", bn: "সহায়তা", en: "Support" },
      ],
    };
  }
  if (pathname.startsWith("/partner-application")) {
    return {
      titleBn: "পার্টনার আবেদন",
      titleEn: "Partner Application",
      parent: { href: "/account", bn: "অ্যাকাউন্ট", en: "Account" },
      related: [
        { href: "/stores", bn: "প্রতিষ্ঠানসমূহ", en: "Stores" },
        { href: "/portal", bn: "অপারেশনস পোর্টাল", en: "Operations Portal" },
        { href: "/contact?interest=partner", bn: "যোগাযোগ", en: "Contact" },
      ],
    };
  }
  if (pathname.startsWith("/admin-panel")) {
    const isRoot = pathname === "/admin-panel";
    return {
      titleBn: isRoot ? "মাস্টার অ্যাডমিন ড্যাশবোর্ড" : "অ্যাডমিন কন্ট্রোল মডিউল",
      titleEn: isRoot ? "Master Admin Dashboard" : "Admin Control Module",
      parent: isRoot
        ? { href: "/account", bn: "আমার অ্যাকাউন্ট", en: "My Account" }
        : { href: "/admin-panel", bn: "অ্যাডমিন ওভারভিউ", en: "Admin Overview" },
      related: [
        { href: "/admin-panel", bn: "ওভারভিউ", en: "Overview" },
        { href: "/admin-panel/appearance", bn: "ব্যাকগ্রাউন্ড ও মিডিয়া", en: "Design & Media" },
        { href: "/admin-panel/products", bn: "প্রোডাক্ট ও সার্ভিস", en: "Products" },
        { href: "/admin-panel/orders", bn: "অর্ডার ও বুকিং", en: "Orders" },
        { href: "/admin-panel/payments", bn: "পেমেন্ট ও কুপন", en: "Payments" },
        { href: "/admin-panel/users", bn: "ইউজার ও রোল", en: "Users" },
      ],
    };
  }
  if (pathname.startsWith("/portal")) {
    return {
      titleBn: "অপারেশনস পোর্টাল",
      titleEn: "Operations Portal",
      parent: { href: "/account", bn: "আমার অ্যাকাউন্ট", en: "My Account" },
      related: [
        { href: "/admin-panel", bn: "মাস্টার অ্যাডমিন প্যানেল", en: "Master Admin" },
        { href: "/account", bn: "গ্রাহক ভিউ", en: "Customer View" },
        { href: "/project-account", bn: "প্রজেক্ট লেজার", en: "Project Ledger" },
        { href: "/partner-application", bn: "পার্টনার যাচাই", en: "Partner Review" },
        { href: "/support", bn: "সাপোর্ট কিউ", en: "Support Queue" },
      ],
    };
  }
  if (pathname.startsWith("/provider")) {
    return {
      titleBn: "প্রোভাইডার পোর্টাল",
      titleEn: "Provider Workspace",
      parent: { href: "/account", bn: "আমার অ্যাকাউন্ট", en: "My Account" },
      related: [
        { href: "/account", bn: "গ্রাহক অ্যাকাউন্ট", en: "Customer Account" },
        { href: "/support", bn: "সহায়তা", en: "Support" },
      ],
    };
  }
  if (pathname.startsWith("/rider")) {
    return {
      titleBn: "রাইডার ড্যাশবোর্ড",
      titleEn: "Rider Dashboard",
      parent: { href: "/account", bn: "আমার অ্যাকাউন্ট", en: "My Account" },
      related: [
        { href: "/account", bn: "গ্রাহক অ্যাকাউন্ট", en: "Customer Account" },
        { href: "/delivery", bn: "ডেলিভারি পেজ", en: "Delivery" },
        { href: "/support", bn: "সহায়তা", en: "Support" },
      ],
    };
  }
  if (pathname.startsWith("/account")) {
    return {
      titleBn: "আমার অ্যাকাউন্ট",
      titleEn: "My Account",
      parent: { href: "/", bn: "হোমপেজ", en: "Home" },
      related: [
        { href: "/project-account", bn: "প্রজেক্ট অ্যাকাউন্ট", en: "Project Account" },
        { href: "/loyalty", bn: "লয়্যালটি পয়েন্ট", en: "Loyalty" },
        { href: "/returns", bn: "পণ্য ফেরত", en: "Returns" },
        { href: "/support", bn: "সহায়তা", en: "Support" },
      ],
    };
  }
  if (pathname.startsWith("/blog")) {
    return {
      titleBn: "নিউজ, ব্লগ ও কোম্পানি প্রেজেন্টেশন",
      titleEn: "News, Blog & Presentation",
      parent: { href: "/", bn: "হোমপেজ", en: "Home" },
      related: [
        { href: "/catalog", bn: "আমাদের সেবা", en: "Our Services" },
        { href: "/projects", bn: "প্রজেক্ট ও বিনিয়োগ", en: "Projects" },
        { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About Us" },
        { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
      ],
    };
  }
  if (pathname.startsWith("/pages/about")) {
    return {
      titleBn: "আমাদের সম্পর্কে",
      titleEn: "About Us",
      parent: { href: "/", bn: "হোমপেজ", en: "Home" },
      related: [
        { href: "/catalog", bn: "সব সেবা", en: "All Services" },
        { href: "/projects", bn: "প্রজেক্ট ও বিনিয়োগ", en: "Projects" },
        { href: "/blog", bn: "নিউজ ও ব্লগ", en: "Blog" },
        { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
      ],
    };
  }
  return {
    titleBn: "ইউ সার্ভিস বিডি",
    titleEn: "U Service BD",
    parent: { href: "/", bn: "হোমপেজ", en: "Home" },
    related: [
      { href: "/catalog", bn: "সব সেবা", en: "Services" },
      { href: "/blog", bn: "নিউজ ও ব্লগ", en: "News & Blog" },
      { href: "/projects", bn: "প্রজেক্ট", en: "Projects" },
      { href: "/pages/about", bn: "আমাদের সম্পর্কে", en: "About Us" },
      { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
    ],
  };
}

export function Header() {
  const { lang, user, cart } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const home = pathname === "/";
  const [open, setOpen] = useState(false);

  const navigation = getPrimaryNavigation(
    pathname,
    Boolean(user?.is_staff || user?.is_superuser),
  );
  const routeContext = getRouteContext(pathname);
  const bagCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isCurrent = (href: string) => {
    if (href === "/") return home;
    if (href === "/catalog" || href.startsWith("/catalog?"))
      return href === "/catalog" && pathname.startsWith("/catalog");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(routeContext.parent?.href || "/");
  }

  return (
    <>
      <div className={home ? "announcement home-announcement" : "announcement"}>
        <span>
          <span className="status-dot" />{" "}
          <Text
            bn="একটি অ্যাকাউন্ট। প্রতিদিনের সব সেবা।"
            en="One account. Your everyday, connected."
          />
        </span>
        <Link href="/contact?interest=partner">
          <Text bn="আমাদের সাথে ব্যবসা করুন" en="Grow with U Service" />{" "}
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <header className="header home-header unified-header">
        <Link href="/" className="brand">
          <BrandLogo eager />
        </Link>

        <nav
          id="main-navigation"
          className={open ? "nav open" : "nav"}
          aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}
          onClick={() => setOpen(false)}
        >
          {navigation.map(({ href, bn, en }) => (
            <Link
              href={href}
              key={href}
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              {href === "/" && <House size={15} />}
              <Text bn={bn} en={en} />
            </Link>
          ))}
          <Link href="/stores" className="home-menu-extra">
            <Text bn="প্রতিষ্ঠানসমূহ" en="Stores" />
          </Link>
          {!user && (
            <Link href="/login?register=1" className="home-menu-extra">
              <Text bn="অ্যাকাউন্ট খুলুন" en="Create account" />
            </Link>
          )}
        </nav>

        <div className="header-actions">
          <form
            action="/catalog"
            className="home-header-search"
            role="search"
          >
            <button
              type="submit"
              aria-label={lang === "bn" ? "সেবা খুঁজুন" : "Search services"}
            >
              <Search size={17} />
            </button>
            <input
              type="search"
              name="q"
              aria-label={
                lang === "bn"
                  ? "সেবা বা পণ্য খুঁজুন"
                  : "Search services or products"
              }
              placeholder={
                lang === "bn"
                  ? "সেবা বা পণ্য খুঁজুন..."
                  : "Search services or items..."
              }
            />
          </form>

          <LanguageToggle className="lang-switch" />

          <Link
            href="/checkout"
            className="icon-button"
            aria-label={
              lang === "bn"
                ? `কেনাকাটার ব্যাগ, ${bagCount}টি পণ্য`
                : `Shopping bag, ${bagCount} items`
            }
          >
            <ShoppingBag size={20} />
            {bagCount > 0 && <span className="badge">{bagCount}</span>}
          </Link>

          <Link href={user ? "/account" : "/login"} className="account-button">
            <UserRound size={17} />
            <span>
              {user ? (
                user.first_name || user.username
              ) : (
                <Text bn="লগইন" en="Sign in" />
              )}
            </span>
          </Link>

          {!user && (
            <Link href="/login?register=1" className="home-create-account">
              <UserRound size={17} />
              <Text bn="অ্যাকাউন্ট খুলুন" en="Create account" />
            </Link>
          )}

          <TranslatedButton
            className="mobile-menu icon-button"
            aria-label={
              open
                ? lang === "bn"
                  ? "মেনু বন্ধ করুন"
                  : "Close menu"
                : lang === "bn"
                  ? "মেনু খুলুন"
                  : "Open menu"
            }
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </TranslatedButton>
        </div>
      </header>

      {/* Clean, Uncluttered Back & Page Navigation Bar on inner pages */}
      {!home && (
        <nav
          className="page-subnav-bar"
          aria-label={
            lang === "bn"
              ? "পেজ নেভিগেশন ও ফিরে যাওয়ার বার"
              : "Page navigation and back bar"
          }
        >
          <div className="page-subnav-inner">
            <div className="page-subnav-left">
              <button
                type="button"
                className="page-back-btn"
                onClick={handleBackNavigation}
              >
                <ArrowLeft size={15} />
                <Text bn="পূর্ববর্তী পেজ" en="Previous page" />
              </button>
              <Link href="/" className="page-home-btn">
                <House size={15} />
                <Text bn="হোমপেজ" en="Home" />
              </Link>
              {routeContext.parent && routeContext.parent.href !== "/" && (
                <>
                  <ChevronRight size={14} className="page-subnav-sep" />
                  <Link
                    href={routeContext.parent.href}
                    className="page-parent-link"
                  >
                    <Text
                      bn={routeContext.parent.bn}
                      en={routeContext.parent.en}
                    />
                  </Link>
                </>
              )}
              <ChevronRight size={14} className="page-subnav-sep" />
              <span className="page-current-crumb">
                <Text bn={routeContext.titleBn} en={routeContext.titleEn} />
              </span>
            </div>

            <div className="page-subnav-links">
              {routeContext.related
                .filter((item) => item.href !== pathname)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="page-subnav-chip"
                  >
                    <Text bn={item.bn} en={item.en} />
                  </Link>
                ))}
            </div>
          </div>
        </nav>
      )}

      <nav
        className="mobile-dock"
        aria-label={lang === "bn" ? "দ্রুত মেনু" : "Quick navigation"}
      >
        <Link href="/" aria-current={home ? "page" : undefined}>
          <House size={21} />
          <Text bn="হোম" en="Home" />
        </Link>
        <Link
          href="/catalog"
          aria-current={pathname.startsWith("/catalog") ? "page" : undefined}
        >
          <LayoutGrid size={21} />
          <Text bn="সেবা" en="Services" />
        </Link>
        <Link href="/account">
          <PackageCheck size={21} />
          <Text bn="অর্ডার" en="Orders" />
        </Link>
        <Link href="/wishlist">
          <Heart size={21} />
          <Text bn="পছন্দ" en="Saved" />
        </Link>
        <Link href={user ? "/account" : "/login"}>
          <UserRound size={21} />
          <Text bn="অ্যাকাউন্ট" en="Account" />
        </Link>
      </nav>
    </>
  );
}

const FOOTER_PAYMENTS = [
  "bKash",
  "Nagad",
  "Rocket",
  "Upay",
  "SSLCommerz",
  "Visa / Mastercard",
  "Bank Transfer",
  "Cash on Delivery",
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cta-strip">
        <div className="footer-cta-copy">
          <span className="footer-cta-badge">
            <Text
              bn="বাংলাদেশের সমন্বিত সেবা প্ল্যাটফর্ম"
              en="ALL-IN-ONE MULTI-SERVICE PLATFORM"
            />
          </span>
          <h2>
            <Text
              bn="একটি অ্যাকাউন্টেই প্রতিদিনের ৮টি পূর্ণাঙ্গ সেবা — আজই যুক্ত হোন"
              en="8 everyday services connected in one trusted account"
            />
          </h2>
        </div>
        <div className="footer-cta-actions">
          <Link href="/catalog" className="footer-cta-primary">
            <LayoutGrid size={16} />
            <Text bn="সব সেবা ও পণ্য দেখুন" en="Explore all services" />
          </Link>
          <Link
            href="/blog#company-presentation-video"
            className="footer-cta-secondary"
          >
            <Film size={16} />
            <Text bn="প্রেজেন্টেশন ভিডিও" en="Presentation video" />
          </Link>
          <Link href="/contact" className="footer-cta-outline">
            <Text bn="যোগাযোগ করুন" en="Contact us" />
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      <div className="footer-grid site-footer-grid">
        <div className="footer-brand-col">
          <Link href="/" className="brand">
            <BrandLogo />
          </Link>
          <p>
            <Text
              bn="খাবার, কেনাকাটা, ফার্মেসি, হোম সার্ভিস, ইলেকট্রিশিয়ান, মেকানিক, পার্সেল ডেলিভারি ও প্রজেক্ট বিনিয়োগ—প্রতিদিনের জীবনকে আরও সহজ করতে আমরা আছি আপনার পাশে।"
              en="A little less hassle. A lot more living. Food, retail, pharmacy, home repairs, parcel delivery, events, and managed projects—we’re here for your everyday."
            />
          </p>
          <div className="footer-meta-list">
            <span className="location">
              <MapPin size={15} />
              <Text
                bn="ঢাকা ও সারাদেশ, বাংলাদেশ · BDT ৳"
                en="Dhaka & Nationwide, Bangladesh · BDT ৳"
              />
            </span>
            <span className="location">
              <ShieldCheck size={15} />
              <Text
                bn="যাচাইকৃত মার্চেন্ট, টেকনিশিয়ান ও রাইডার"
                en="Verified merchants, technicians & riders"
              />
            </span>
            <span className="location">
              <Headphones size={15} />
              <Text
                bn="২৪/৭ লাইভ ট্র্যাকিং ও গ্রাহক সহায়তা"
                en="24/7 live tracking & customer support"
              />
            </span>
          </div>
        </div>

        <div className="footer-col">
          <h3>
            <Text bn="আমাদের ৮টি সেবা বিভাগ" en="Our 8 divisions" />
          </h3>
          <ul className="footer-link-list">
            <li>
              <Link href="/catalog?division=food">
                <Text bn="ইউ ফুড (খাবার ডেলিভারি)" en="U Food (Restaurants)" />
              </Link>
            </li>
            <li>
              <Link href="/catalog?division=shop">
                <Text
                  bn="ইউ শপ (শপ ও গ্রোসারি)"
                  en="U Shop (Retail & Grocery)"
                />
              </Link>
            </li>
            <li>
              <Link href="/catalog?division=pharmacy">
                <Text
                  bn="ইউ ফার্মেসি (ঔষধ ও স্বাস্থ্য)"
                  en="U Pharmacy (Medicine)"
                />
              </Link>
            </li>
            <li>
              <Link href="/catalog?division=services">
                <Text
                  bn="ইউ সার্ভিসেস (হোম ও এসি)"
                  en="U Services (Home & AC)"
                />
              </Link>
            </li>
            <li>
              <Link href="/catalog?division=electrician">
                <Text bn="ইলেকট্রিশিয়ান সার্ভিস" en="U Electrician" />
              </Link>
            </li>
            <li>
              <Link href="/mechanic">
                <Text bn="গাড়ি ও বাইক মেকানিক" en="Car & Bike Mechanic" />
              </Link>
            </li>
            <li>
              <Link href="/delivery">
                <Text bn="পার্সেল ডেলিভারি" en="Parcel Delivery" />
              </Link>
            </li>
            <li>
              <Link href="/events">
                <Text bn="বিয়ে ও ইভেন্ট আয়োজন" en="Wedding & events" />
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>
            <Text bn="একসাথে এগিয়ে চলুন" en="Build with us" />
          </h3>
          <ul className="footer-link-list">
            <li>
              <Link href="/contact?interest=partner">
                <UiText text={"Become a partner"} />
              </Link>
            </li>
            <li>
              <Link href="/partner-application">
                <Text bn="পার্টনার আবেদন ফরম" en="Partner application" />
              </Link>
            </li>
            <li>
              <Link href="/projects">
                <Text
                  bn="প্রজেক্ট ও বিনিয়োগ পরিকল্পনা"
                  en="Projects & investment plans"
                />
              </Link>
            </li>
            <li>
              <Link href="/project-account">
                <Text bn="প্রজেক্ট অ্যাকাউন্ট" en="Project account" />
              </Link>
            </li>
            <li>
              <Link href="/contact?interest=provider">
                <UiText text={"Become a provider"} />
              </Link>
            </li>
            <li>
              <Link href="/contact?interest=rider">
                <UiText text={"Become a rider"} />
              </Link>
            </li>
            <li>
              <Link href="/provider">
                <Text bn="প্রোভাইডার ওয়ার্কস্পেস" en="Provider workspace" />
              </Link>
            </li>
            <li>
              <Link href="/rider">
                <Text bn="রাইডার ওয়ার্কস্পেস" en="Rider workspace" />
              </Link>
            </li>
            <li>
              <Link href="/portal">
                <Text bn="অপারেশনস পোর্টাল" en="Operations portal" />
              </Link>
            </li>
            <li>
              <Link href="/admin-panel">
                <Text
                  bn="মাস্টার অ্যাডমিন ড্যাশবোর্ড"
                  en="Master Admin Dashboard"
                />
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>
            <Text bn="গ্রাহক সেবা ও অ্যাকাউন্ট" en="Here to help" />
          </h3>
          <ul className="footer-link-list">
            <li>
              <Link href="/account">
                <Text bn="আমার অ্যাকাউন্ট ও অর্ডার" en="Your account" />
              </Link>
            </li>
            <li>
              <Link href="/wishlist">
                <Text bn="পছন্দের তালিকা" en="Saved wishlist" />
              </Link>
            </li>
            <li>
              <Link href="/loyalty">
                <Text bn="লয়্যালটি পয়েন্ট ও রিওয়ার্ড" en="Loyalty points" />
              </Link>
            </li>
            <li>
              <Link href="/returns">
                <Text bn="পণ্য ফেরত ও রিফান্ড" en="Returns & refunds" />
              </Link>
            </li>
            <li>
              <Link href="/reviews">
                <Text bn="আপনার রিভিউ ও রেটিং" en="Your reviews" />
              </Link>
            </li>
            <li>
              <Link href="/stores">
                <Text
                  bn="নিবন্ধিত প্রতিষ্ঠানসমূহ"
                  en="Stores & providers"
                />
              </Link>
            </li>
            <li>
              <Link href="/delivery/track">
                <Text bn="পার্সেল ট্র্যাকিং" en="Track parcel" />
              </Link>
            </li>
            <li>
              <Link href="/support">
                <Text bn="সাপোর্ট ও সহায়তা কেন্দ্র" en="Support center" />
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>
            <Text bn="কোম্পানি, নিউজ ও নীতিমালা" en="Company & media" />
          </h3>
          <ul className="footer-link-list">
            <li>
              <Link href="/pages/about">
                <Text bn="আমাদের সম্পর্কে" en="About us" />
              </Link>
            </li>
            <li>
              <Link href="/blog">
                <Text
                  bn="নিউজ, ব্লগ ও আপডেট"
                  en="News, blog & presentation"
                />
              </Link>
            </li>
            <li>
              <Link href="/blog#company-presentation-video">
                <Text
                  bn="কোম্পানি প্রেজেন্টেশন ভিডিও"
                  en="Presentation video (HD)"
                />
              </Link>
            </li>
            <li>
              <Link href="/offers">
                <Text bn="চলমান অফার ও ডিসকাউন্ট" en="Offers & deals" />
              </Link>
            </li>
            <li>
              <Link href="/contact">
                <Text bn="যোগাযোগ ও অফিস ঠিকানা" en="Contact & support" />
              </Link>
            </li>
            <li>
              <Link href="/photo-credits">
                <Text bn="ছবির উৎস ও ক্রেডিট" en="Photo credits" />
              </Link>
            </li>
            <li>
              <Link href="/pages/privacy">
                <Text bn="গোপনীয়তা নীতিমালা" en="Privacy information" />
              </Link>
            </li>
            <li>
              <Link href="/pages/terms">
                <Text bn="ব্যবহারের শর্তাবলি" en="Terms of use" />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-payment-strip">
        <span className="footer-payment-label">
          <CreditCard size={15} />
          <Text bn="পেমেন্ট মাধ্যমসমূহ:" en="Accepted payments:" />
        </span>
        <div className="footer-payment-pills">
          {FOOTER_PAYMENTS.map((method) => (
            <span key={method}>{method}</span>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} U Service BD Limited ·{" "}
          <Text bn="সর্বস্বত্ব সংরক্ষিত।" en="All rights reserved." />
        </span>
        <span>
          <Text
            bn="বাংলাদেশের প্রতিদিনের জীবনের জন্য ভালোবাসা নিয়ে নির্মিত।"
            en="Made for everyday life in Bangladesh."
          />
        </span>
      </div>
    </footer>
  );
}
