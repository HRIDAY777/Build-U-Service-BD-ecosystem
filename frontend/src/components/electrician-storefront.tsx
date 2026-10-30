"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Cable,
  Clock3,
  Fan,
  Headphones,
  House,
  Lightbulb,
  Menu,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sun,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Area, Offering, PageResult } from "@/lib/api";
import { offeringPhoto } from "@/lib/photos";
import { Photo } from "./photo";
import { BrandLogo } from "./brand-logo";
import { LanguageToggle } from "./language-toggle";
import { Text, useApp } from "./provider";

type Props = {
  offerings: Offering[];
  areas: PageResult<Area> | null;
};

const serviceIcon = (name: string) => {
  if (/fan/i.test(name)) return Fan;
  if (/light|lamp/i.test(name)) return Lightbulb;
  if (/wire|circuit|breaker/i.test(name)) return Cable;
  if (/solar|inverter/i.test(name)) return Sun;
  return Zap;
};

const servicePhoto = (offering: Offering) => {
  const image = offeringPhoto(offering);
  const serviceName = `${offering.name} ${offering.name_bn}`.toLowerCase();
  if (image && image !== "/images/photos/electrician.jpg") return image;
  if (/solar|inverter/.test(serviceName))
    return "/images/photos/project-solar.jpg";
  if (/fan/.test(serviceName)) return "/images/photos/fan.jpg";
  if (/light|lamp|switch|socket/.test(serviceName))
    return "/images/photos/electrician-worker-reference.jpg";
  if (/air.?condition|cooling/.test(serviceName))
    return "/images/photos/aircon.jpg";
  if (/wiring|circuit|breaker|socket|switch|electric/.test(serviceName))
    return "/images/photos/electrician.jpg";
  return "/images/photos/electrician.jpg";
};

export function ElectricianHeader() {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);
  const nav = [
    ["/", "হোম", "Home"],
    ["/catalog", "বিভাগসমূহ", "Divisions"],
    ["/projects", "প্রকল্প", "Projects"],
    ["/events", "ইভেন্ট", "Events"],
    ["/offers", "অফার", "Offers"],
    ["/catalog?division=electrician", "ইলেকট্রিশিয়ান", "Electrician"],
    ["/pages/about", "আমাদের সম্পর্কে", "About us"],
    ["/contact", "যোগাযোগ", "Contact"],
  ];

  return (
    <header className="electrician-header">
      <Link href="/" className="electrician-brand" aria-label="U Service BD">
        <BrandLogo eager />
      </Link>
      <nav
        id="electrician-navigation"
        className={open ? "electrician-nav open" : "electrician-nav"}
        aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}
        onClick={() => setOpen(false)}
      >
        {nav.map(([href, bn, en]) => (
          <Link
            key={href}
            href={href}
            aria-current={href === "/catalog?division=electrician" ? "page" : undefined}
          >
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>
      <form
        className="electrician-header-search"
        action="/catalog"
        role="search"
      >
        <input type="hidden" name="division" value="electrician" />
        <Search size={18} />
        <input
          name="q"
          aria-label={lang === "bn" ? "ইলেকট্রিক কাজ খুঁজুন" : "Search electrical services"}
          placeholder={
            lang === "bn" ? "আপনার প্রয়োজনীয় সেবা খুঁজুন..." : "Find a service..."
          }
        />
      </form>
      <div className="electrician-header-actions">
        <LanguageToggle className="electrician-language-switch" />
        <Link
          href="/checkout"
          className="electrician-cart"
          aria-label={lang === "bn" ? "কার্ট" : "Cart"}
        >
          <ShoppingBag size={21} />
          <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </Link>
        <Link
          href={user ? "/account" : "/login"}
          className="electrician-login"
        >
          <UserRound size={17} />
          <Text bn={user ? "অ্যাকাউন্ট" : "লগইন"} en={user ? "Account" : "Sign in"} />
        </Link>
        <Link
          href="/login?register=1"
          className="electrician-register"
          hidden={Boolean(user)}
        >
          <Text bn="অ্যাকাউন্ট তৈরি" en="Create account" />
        </Link>
        <button
          type="button"
          className="electrician-menu-toggle"
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
          aria-controls="electrician-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

export function ElectricianStorefront({ offerings, areas }: Props) {
  const { lang } = useApp();
  const router = useRouter();
  const [offeringId, setOfferingId] = useState("");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const availableAreas = areas?.results || [];
  const featured = offerings.slice(0, 6);
  const selectedOffering = offerings.find(
    (offering) => String(offering.id) === offeringId,
  );

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOffering || !area || !date || !time) return;
    const query = new URLSearchParams({
      scheduled_at: `${date}T${time}`,
      area,
    });
    router.push(`/book/${selectedOffering.id}?${query}`);
  }

  const shortcuts = [
    { Icon: Zap, bn: "সব ইলেকট্রিক সেবা", en: "All electrical services", href: "#electrician-services" },
    ...featured.slice(0, 6).map((offering) => {
      const Icon = serviceIcon(offering.name);
      return {
        Icon,
        bn: offering.name_bn || offering.name,
        en: offering.name,
        href: `/book/${offering.id}`,
      };
    }),
    { Icon: MoreHorizontal, bn: "আরও সেবা", en: "More services", href: "#electrician-services" },
  ];

  return (
    <div className="electrician-reference-page">
      <section className="electrician-hero">
        <div className="electrician-hero-copy">
          <span className="electrician-eyebrow">
            <House size={18} />
            <Text bn="ইলেকট্রিশিয়ান সার্ভিস" en="ELECTRICIAN SERVICES" />
          </span>
          <h1>
            <Text bn="নিরাপদ বৈদ্যুতিক কাজ" en="Safe electrical work" />
            <br />
            <em>
              <Text bn="এখন হাতের কাছে" en="right at your fingertips" />
            </em>
          </h1>
          <p>
            <Text
              bn="বাড়ি, অফিস বা যেকোনো জায়গার জন্য দক্ষ ইলেকট্রিশিয়ান সেবা — U Service BD এর সাথে।"
              en="Trusted electrical help for your home, office or workplace — book with U Service BD."
            />
          </p>
          <div className="electrician-trust-row">
            <span>
              <ShieldCheck size={18} />
              <Text bn="যাচাইকৃত সেবা" en="Verified service" />
            </span>
            <span>
              <Clock3 size={18} />
              <Text bn="সময় বেছে বুকিং" en="Choose a time" />
            </span>
            <span>
              <BadgeCheck size={18} />
              <Text bn="আগে থেকেই মূল্য দেখুন" en="Up-front service price" />
            </span>
            <Link href="/support">
              <Headphones size={18} />
              <Text bn="সহজ সহায়তা" en="Helpful support" />
            </Link>
          </div>
        </div>
        <div className="electrician-hero-picture" aria-hidden="true">
          <div className="electrician-speech">
            <Zap size={19} />
            <Text bn="নিরাপদ ইলেকট্রিক কাজ, নির্ভরযোগ্য সেবা!" en="Reliable help for safer electrical work." />
          </div>
        </div>
        <form className="electrician-booking-card" onSubmit={book}>
          <h2>
            <CalendarDays size={21} />
            <Text bn="এখনই ইলেকট্রিশিয়ান বুক করুন" en="Book an electrician" />
          </h2>
          <label>
            <span aria-hidden="true">
              <House size={17} />
            </span>
            <span className="sr-only">
              <Text bn="সেবার এলাকা" en="Service area" />
            </span>
            <select
              required
              value={area}
              onChange={(event) => setArea(event.target.value)}
              disabled={!availableAreas.length}
            >
              <option value="">
                {lang === "bn" ? "আপনার লোকেশন নির্বাচন করুন" : "Select your service area"}
              </option>
              {availableAreas.map((serviceArea) => (
                <option key={serviceArea.id} value={serviceArea.name}>
                  {lang === "bn"
                    ? `${serviceArea.name_bn || serviceArea.name} · ${serviceArea.district}`
                    : `${serviceArea.name} · ${serviceArea.district}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span aria-hidden="true">
              <Zap size={17} />
            </span>
            <span className="sr-only">
              <Text bn="কী কাজের জন্য প্রয়োজন" en="What do you need help with?" />
            </span>
            <select
              required
              value={offeringId}
              onChange={(event) => setOfferingId(event.target.value)}
              disabled={!offerings.length}
            >
              <option value="">
                {lang === "bn" ? "কাজের জন্য প্রয়োজন" : "Choose a service"}
              </option>
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {lang === "bn" ? offering.name_bn || offering.name : offering.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span aria-hidden="true">
              <CalendarDays size={17} />
            </span>
            <span className="sr-only">
              <Text bn="তারিখ নির্বাচন করুন" en="Choose a date" />
            </span>
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            <span aria-hidden="true">
              <Clock3 size={17} />
            </span>
            <span className="sr-only">
              <Text bn="সময় নির্বাচন করুন" en="Choose a time" />
            </span>
            <input
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={!offerings.length || !availableAreas.length}
          >
            <Search size={19} />
            <Text bn="ইলেকট্রিশিয়ান খুঁজুন" en="Find an electrician" />
          </button>
          {(!offerings.length || !availableAreas.length) && (
            <p className="electrician-booking-status" role="status">
              <Text
                bn="এই মুহূর্তে সেবা বা সেবার এলাকা লোড করা যাচ্ছে না। পরে আবার চেষ্টা করুন।"
                en="Services or service areas are unavailable. Please try again later."
              />
            </p>
          )}
        </form>
      </section>

      <nav
        className="electrician-shortcuts"
        aria-label={lang === "bn" ? "ইলেকট্রিক সেবা" : "Electrical services"}
      >
        {shortcuts.map(({ Icon, bn, en, href }, index) => (
          <Link
            key={`${href}-${index}`}
            href={href}
            className={index === 0 ? "active" : ""}
          >
            <Icon size={25} />
            <span>
              <Text bn={bn} en={en} />
            </span>
          </Link>
        ))}
      </nav>

      <div className="electrician-content-grid">
        <section
          id="electrician-services"
          className="electrician-services"
          aria-labelledby="electrician-services-title"
        >
          <div className="electrician-section-heading">
            <h2 id="electrician-services-title">
              <Text bn="জনপ্রিয় ইলেকট্রিশিয়ান সেবা" en="Popular electrical services" />
            </h2>
            <Link href="/catalog?division=electrician">
              <Text bn="সব দেখুন" en="View all" />
              <ArrowRight size={17} />
            </Link>
          </div>
          {featured.length ? (
            <div className="electrician-service-grid">
              {featured.map((offering) => (
                <article className="electrician-service-card" key={offering.id}>
                  <Link
                    className="electrician-service-image"
                    href={`/catalog/${offering.id}`}
                    aria-label={
                      lang === "bn"
                        ? `${offering.name_bn || offering.name} বিস্তারিত`
                        : `Details for ${offering.name}`
                    }
                  >
                    <Photo
                      src={servicePhoto(offering)}
                      alt={lang === "bn" ? offering.name_bn || offering.name : offering.name}
                    />
                    <span>
                      <Zap size={13} />
                      <Text bn="ইলেকট্রিক" en="Electrical" />
                    </span>
                  </Link>
                  <div className="electrician-service-body">
                    <Link href={`/catalog/${offering.id}`}>
                      <h3>{lang === "bn" ? offering.name_bn || offering.name : offering.name}</h3>
                    </Link>
                    <p>
                      <Clock3 size={13} />
                      {offering.duration_minutes}{" "}
                      <Text bn="মিনিটের ভিজিট" en="min visit" />
                    </p>
                    <strong>
                      ৳{Number(offering.current_price || offering.price).toLocaleString(
                        lang === "bn" ? "bn-BD" : "en-BD",
                      )}
                    </strong>
                    <small className="electrician-price-caption">
                      <Text bn="থেকে শুরু" en="starting from" />
                    </small>
                    <Link className="electrician-book-button" href={`/book/${offering.id}`}>
                      <Text bn="এখনই বুক করুন" en="Book now" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="electrician-empty" role="status">
              <Text
                bn="এই মুহূর্তে কোনো সেবা পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।"
                en="No electrical services are available right now. Please try again later."
              />
            </p>
          )}
        </section>

        <aside className="electrician-why">
          <h2>
            <Text bn="কেন U Service BD?" en="Why U Service BD?" />
          </h2>
          <ul>
            <li>
              <BadgeCheck size={18} />
              <Text bn="সেবার মূল্য আগে থেকেই দেখুন" en="See service prices up front" />
            </li>
            <li>
              <CalendarDays size={18} />
              <Text bn="আপনার সুবিধার সময় বেছে নিন" en="Choose a time that suits you" />
            </li>
            <li>
              <ShieldCheck size={18} />
              <Text bn="বুকিংয়ের তথ্য এক জায়গায় রাখুন" en="Keep your booking details in one place" />
            </li>
            <li>
              <Headphones size={18} />
              <Link href="/support">
                <Text bn="সহায়তা প্রয়োজন? আমাদের জানান" en="Need help? Contact support" />
              </Link>
            </li>
            <li>
              <Wrench size={18} />
              <Text bn="কাজের পরিধি আগে নিশ্চিত করুন" en="Confirm the work before it begins" />
            </li>
          </ul>
          <div className="electrician-why-mark">
              <Photo
                src="/images/photos/electrician-worker-reference.jpg"
                alt=""
                className="electrician-why-photo"
              />
              <div>
              <strong>U Service BD</strong>
              <small>
                <Text bn="আপনার প্রতিদিনের সঙ্গী" en="Here for your everyday" />
              </small>
            </div>
        </div>
        </aside>
      </div>
    </div>
  );
}
