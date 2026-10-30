"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Bike,
  Boxes,
  BriefcaseBusiness,
  Clock3,
  Cpu,
  FileText,
  Headphones,
  MapPin,
  Menu,
  MoreHorizontal,
  Package,
  PackageCheck,
  Rocket,
  Search,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { LanguageToggle } from "./language-toggle";
import { Photo } from "./photo";
import { Text, useApp } from "./provider";

const navigation = [
  ["/", "হোম", "Home"],
  ["/catalog", "বিভাগসমূহ", "Divisions"],
  ["/projects", "প্রকল্প", "Projects"],
  ["/events", "ইভেন্ট", "Events"],
  ["/offers", "অফার", "Offers"],
  ["/delivery", "ডেলিভারি", "Delivery"],
  ["/pages/about", "আমাদের সম্পর্কে", "About us"],
  ["/contact", "যোগাযোগ", "Contact"],
];

const shortcuts = [
  { Icon: Boxes, bn: "সব ডেলিভারি", en: "All delivery", target: "general" },
  { Icon: FileText, bn: "ডকুমেন্ট", en: "Documents", target: "documents" },
  { Icon: Package, bn: "পার্সেল", en: "Parcels", target: "general" },
  {
    Icon: Shirt,
    bn: "পোশাক",
    en: "Clothing",
    target: "clothing",
  },
  {
    Icon: Cpu,
    bn: "ইলেকট্রনিকস",
    en: "Electronics",
    target: "electronics",
  },
  {
    Icon: ShoppingCart,
    bn: "ই-কমার্স অর্ডার",
    en: "E-commerce",
    target: "general",
  },
  {
    Icon: Bike,
    bn: "লোকাল পার্সেল",
    en: "Local parcel",
    target: "general",
  },
  {
    Icon: BriefcaseBusiness,
    bn: "ব্যবসায়িক ডেলিভারি",
    en: "Business delivery",
    target: "general",
  },
  {
    Icon: Rocket,
    bn: "বিশেষ পার্সেল",
    en: "Other parcels",
    target: "other",
  },
  {
    Icon: MoreHorizontal,
    bn: "আরও",
    en: "More",
    target: "other",
  },
];

const promotions = [
  {
    Icon: FileText,
    bn: "ডকুমেন্ট ডেলিভারি",
    en: "Document delivery",
    descriptionBn: "গুরুত্বপূর্ণ কাগজপত্র পাঠাতে",
    descriptionEn: "Send important documents",
    target: "documents",
    image: "/images/photos/delivery-rider-reference.jpg",
    tone: "violet",
  },
  {
    Icon: PackageCheck,
    bn: "পার্সেল পাঠান",
    en: "Send a parcel",
    descriptionBn: "ঠিকানা দিন, চার্জ জেনে অনুরোধ করুন",
    descriptionEn: "Add the addresses and review the delivery fee",
    target: "general",
    image: "/images/photos/delivery-branded.png",
    tone: "pink",
  },
  {
    Icon: ShoppingBag,
    bn: "ব্যবসায়িক ডেলিভারি",
    en: "Business delivery",
    descriptionBn: "আপনার পণ্য পৌঁছে দিতে অনুরোধ শুরু করুন",
    descriptionEn: "Start a delivery request for your goods",
    target: "general",
    image: "/images/photos/shop-reference-details.webp",
    tone: "blue",
  },
];

const deliveryTypes = [
  {
    Icon: Bike,
    bn: "লোকাল পার্সেল",
    en: "Local parcel",
    descriptionBn: "ছোট পার্সেল ও প্রয়োজনীয় জিনিস",
    descriptionEn: "Small parcels and everyday items",
    image: "/images/photos/bicycle.jpg",
    target: "general",
  },
  {
    Icon: FileText,
    bn: "ডকুমেন্ট",
    en: "Documents",
    descriptionBn: "চিঠি ও জরুরি কাগজপত্র",
    descriptionEn: "Letters and important paperwork",
    image: "/images/photos/notebook.jpg",
    target: "documents",
  },
  {
    Icon: Package,
    bn: "সাধারণ পার্সেল",
    en: "General parcel",
    descriptionBn: "প্যাকেট ও ঘরোয়া পণ্য",
    descriptionEn: "Packages and household goods",
    image: "/images/photos/delivery-branded.png",
    target: "general",
  },
  {
    Icon: ShoppingBag,
    bn: "পোশাক",
    en: "Clothing",
    descriptionBn: "পোশাক ও ফ্যাশন পণ্য",
    descriptionEn: "Clothing and fashion items",
    image: "/images/photos/tshirt.jpg",
    target: "clothing",
  },
  {
    Icon: Boxes,
    bn: "ইলেকট্রনিকস",
    en: "Electronics",
    descriptionBn: "যত্নসহকারে প্যাক করা পণ্য",
    descriptionEn: "Carefully packed electronics",
    image: "/images/photos/shop-reference-details.webp",
    target: "electronics",
  },
];

export function DeliveryHeader() {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="delivery-header">
      <Link href="/" className="delivery-brand" aria-label="U Service BD">
        <BrandLogo eager />
      </Link>
      <nav
        id="delivery-navigation"
        className={open ? "delivery-nav open" : "delivery-nav"}
        aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}
        onClick={() => setOpen(false)}
      >
        {navigation.map(([href, bn, en]) => (
          <Link
            key={href}
            href={href}
            aria-current={href === "/delivery" ? "page" : undefined}
          >
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>
      <form className="delivery-header-search" action="/catalog" role="search">
        <Search size={18} />
        <input
          name="q"
          aria-label={lang === "bn" ? "সেবা বা পণ্য খুঁজুন" : "Search"}
          placeholder={
            lang === "bn"
              ? "আপনার প্রয়োজনীয় পণ্য খুঁজুন..."
              : "Search for a service..."
          }
        />
      </form>
      <div className="delivery-header-actions">
        <LanguageToggle className="delivery-language-switch" />
        <Link
          href="/checkout"
          className="delivery-cart"
          aria-label={
            lang === "bn"
              ? `কার্ট, ${cart.reduce((sum, item) => sum + item.quantity, 0)}টি পণ্য`
              : `Cart, ${cart.reduce((sum, item) => sum + item.quantity, 0)} items`
          }
        >
          <ShoppingBag size={21} />
          {cart.length > 0 && (
            <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          )}
        </Link>
        <Link
          href={user ? "/account" : "/login"}
          className="delivery-login"
        >
          <UserRound size={17} />
          <Text
            bn={user ? "অ্যাকাউন্ট" : "লগইন"}
            en={user ? "Account" : "Sign in"}
          />
        </Link>
        <Link
          href="/login?register=1"
          className="delivery-register"
          hidden={Boolean(user)}
        >
          <Text bn="অ্যাকাউন্ট তৈরি" en="Create account" />
        </Link>
        <button
          type="button"
          className="delivery-menu-toggle"
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
          aria-controls="delivery-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

export function DeliveryStorefront() {
  const { lang } = useApp();

  return (
    <div className="delivery-reference">
      <DeliveryHeader />

      <section className="delivery-hero">
        <div className="delivery-hero-copy">
          <div className="delivery-breadcrumb">
            <Link href="/">
              <Text bn="হোম" en="Home" />
            </Link>
            <span>›</span>
            <Text bn="ডেলিভারি ও লজিস্টিকস" en="Delivery & logistics" />
          </div>
          <span className="delivery-eyebrow">
            <Truck size={17} />
            <Text bn="সহজ ডেলিভারি সেবা" en="DELIVERY & LOGISTICS" />
          </span>
          <h1>
            <Text bn="আপনার পণ্য" en="Your goods" />
            <br />
            <strong>
              <Text bn="ডেলিভারির অনুরোধ সহজে" en="delivery made simple" />
            </strong>
          </h1>
          <p>
            <Text
              bn="ডকুমেন্ট, পার্সেল বা ব্যবসায়িক পণ্য — উপলব্ধ এলাকা ও ওজন অনুযায়ী ডেলিভারি চার্জ জেনে অনুরোধ করুন।"
              en="Documents, parcels and business goods — review the delivery fee for your area and parcel weight before requesting."
            />
          </p>
          <div className="delivery-route-card">
            <a href="#delivery-request">
              <MapPin size={20} />
              <span>
                <Text bn="পিকআপ লোকেশন" en="Pickup location" />
                <small>
                  <Text bn="এলাকা নির্বাচন করুন" en="Choose a service area" />
                </small>
              </span>
            </a>
            <ArrowLeftRight
              className="delivery-route-swap"
              size={19}
              aria-hidden="true"
            />
            <a href="#delivery-request">
              <MapPin size={20} />
              <span>
                <Text bn="ডেলিভারি লোকেশন" en="Delivery location" />
                <small>
                  <Text bn="গন্তব্য নির্বাচন করুন" en="Choose destination" />
                </small>
              </span>
            </a>
            <a className="delivery-route-button" href="#delivery-request">
              <Text bn="চার্জ জানতে শুরু করুন" en="Start a quote" />
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="delivery-trust">
            <span>
              <BadgeCheck size={17} />
              <Text bn="এলাকা অনুযায়ী চার্জ" en="Area-based fees" />
            </span>
            <span>
              <PackageCheck size={17} />
              <Text bn="বুকিং স্ট্যাটাস দেখুন" en="Track your request" />
            </span>
            <span>
              <Headphones size={17} />
              <Text bn="সহায়তা পাশে আছে" en="Support when you need it" />
            </span>
          </div>
        </div>

        <div className="delivery-hero-art" aria-hidden="true">
          <div className="delivery-hero-halo" />
          <Photo
            src="/images/photos/delivery-rider-reference.jpg"
            alt=""
            className="delivery-hero-rider"
            eager
          />
          <div className="delivery-hero-speech">
            <Text
              bn="দ্রুত ডেলিভারি, নিরাপদে পৌঁছাক আপনার পণ্য!"
              en="Safe delivery, right to your door!"
            />
          </div>
          <div className="delivery-map-phone">
            <div className="delivery-phone-notch" />
            <span className="delivery-phone-caption">
              <Text bn="পার্সেল ট্র্যাকিং" en="Parcel tracking" />
            </span>
            <div className="delivery-phone-map">
              <span className="delivery-map-route" />
              <MapPin className="delivery-map-pin pickup" size={18} />
              <MapPin className="delivery-map-pin dropoff" size={21} />
            </div>
            <span className="delivery-phone-status">
              <PackageCheck size={14} />
              <Text bn="অ্যাকাউন্টে দেখুন" en="View in your account" />
            </span>
            <span className="delivery-phone-status">
              <Clock3 size={14} />
              <Text bn="স্ট্যাটাস দেখুন" en="Track status" />
            </span>
          </div>
        </div>
      </section>

      <nav
        className="delivery-shortcuts"
        aria-label={lang === "bn" ? "ডেলিভারি ধরন" : "Delivery types"}
      >
        {shortcuts.map(({ Icon, bn, en, target }, index) => (
          <a
            key={`${target}-${index}`}
            href={`#delivery-request-${target}`}
            className={index === 0 ? "active" : ""}
          >
            <Icon size={25} />
            <span>
              <Text bn={bn} en={en} />
            </span>
          </a>
        ))}
      </nav>

      <section className="delivery-promotions" aria-label="Delivery options">
        {promotions.map(({ Icon, bn, en, descriptionBn, descriptionEn, target, image, tone }) => (
          <a
            className={`delivery-promo ${tone}`}
            href={`#delivery-request-${target}`}
            key={tone}
          >
            <span className="delivery-promo-copy">
              <Icon size={18} />
              <strong>
                <Text bn={bn} en={en} />
              </strong>
              <small>
                <Text bn={descriptionBn} en={descriptionEn} />
              </small>
              <span className="delivery-promo-cta">
                <Text bn="অনুরোধ শুরু করুন" en="Start a request" />
                <ArrowRight size={15} />
              </span>
            </span>
            <Photo src={image} alt="" className="delivery-promo-image" />
          </a>
        ))}
      </section>

      <div className="delivery-content-grid">
        <section
          id="delivery-types"
          className="delivery-type-panel"
          aria-labelledby="delivery-types-title"
        >
          <div className="delivery-section-heading">
            <h2 id="delivery-types-title">
              <Text bn="ডেলিভারি সার্ভিসসমূহ" en="Delivery services" />
            </h2>
            <a href="#delivery-request">
              <Text bn="সব সার্ভিস দেখুন" en="View all" />
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="delivery-type-grid">
            {deliveryTypes.map(({ Icon, bn, en, descriptionBn, descriptionEn, image, target }) => (
              <article className="delivery-type-card" key={target + bn}>
                <a
                  className="delivery-type-photo"
                  href={`#delivery-request-${target}`}
                  aria-label={lang === "bn" ? bn : en}
                >
                  <Photo src={image} alt="" />
                  <span>
                    <Icon size={14} />
                  </span>
                </a>
                <div className="delivery-type-info">
                  <h3>
                    <Text bn={bn} en={en} />
                  </h3>
                  <p>
                    <Text bn={descriptionBn} en={descriptionEn} />
                  </p>
                  <a
                    className="delivery-type-button"
                    href={`#delivery-request-${target}`}
                  >
                    <Text bn="বুক করুন" en="Request delivery" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="delivery-benefits">
          <h2>
            <Text bn="কেন U Service BD ডেলিভারি?" en="Why U Service delivery?" />
          </h2>
          <ul>
            <li>
              <MapPin size={16} />
              <Text bn="পিকআপ ও গন্তব্যের ঠিকানা দিন" en="Add pickup and destination addresses" />
            </li>
            <li>
              <PackageCheck size={16} />
              <Text bn="অনুরোধের আগে চার্জ দেখুন" en="Review the fee before you request" />
            </li>
            <li>
              <Clock3 size={16} />
              <Text bn="অ্যাকাউন্টে বুকিং স্ট্যাটাস দেখুন" en="Follow booking status in your account" />
            </li>
            <li>
              <BadgeCheck size={16} />
              <Text bn="COD ও নির্দেশনা বুকিংয়ে যোগ করুন" en="Add COD and instructions to your request" />
            </li>
            <li>
              <Headphones size={16} />
              <Link href="/support">
                <Text bn="সহায়তা প্রয়োজন? আমাদের জানান" en="Need help? Contact support" />
              </Link>
            </li>
          </ul>
          <Photo
            src="/images/photos/delivery-branded.png"
            alt=""
            className="delivery-benefit-photo"
          />
        </aside>
      </div>
    </div>
  );
}
