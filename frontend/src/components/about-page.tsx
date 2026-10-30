"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Users,
  ShieldCheck,
  Headphones,
  Sprout,
  MapPin,
  Settings,
  Target,
  Eye,
  Gem,
  Check,
  Search,
  ShoppingCart,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { LanguageToggle } from "./language-toggle";
import { Text, useApp } from "./provider";
import "@/app/about-reference.css";
const pillars = [
  { Icon: Users, bn: "মানুষের জন্য প্রযুক্তি", en: "Technology for people" },
  {
    Icon: ShieldCheck,
    bn: "নিরাপদ ও বিশ্বাসযোগ্য সেবা",
    en: "Care you can trust",
  },
  { Icon: Headphones, bn: "গ্রাহক সহায়তা", en: "Customer support" },
  {
    Icon: Sprout,
    bn: "বাংলাদেশের জন্য একটি প্ল্যাটফর্ম",
    en: "A platform for Bangladesh",
  },
];
export function AboutPage() {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="about-reference">
      <header className="about-nav">
        <Link href="/" className="about-brand">
          <BrandLogo eager animated />
        </Link>
        <nav
          className={open ? "open" : ""}
          id="about-navigation"
          aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}
        >
          {[
            ["/", "হোম", "Home"],
            ["/catalog", "বিভাগসমূহ", "Divisions"],
            ["/projects", "প্রকল্প", "Projects"],
            ["/events", "ইভেন্ট", "Events"],
            ["/offers", "অফার", "Offers"],
            ["/pages/about", "আমাদের সম্পর্কে", "About us"],
            ["/contact", "যোগাযোগ", "Contact"],
          ].map(([href, bn, en]) => (
            <Link
              key={href}
              href={href}
              aria-current={href === "/pages/about" ? "page" : undefined}
            >
              <Text bn={bn} en={en} />
            </Link>
          ))}
        </nav>
        <form action="/catalog" className="about-nav-search">
          <Search size={20} />
          <input
            name="q"
            aria-label={lang === "bn" ? "সেবা খুঁজুন" : "Search services"}
            placeholder={
              lang === "bn"
                ? "আপনার যা দরকার খুঁজুন..."
                : "Find what you need..."
            }
          />
        </form>
        <Link
          className="about-cart"
          href="/checkout"
          aria-label={lang === "bn" ? "কার্ট" : "Cart"}
        >
          <ShoppingCart />
          <sup>{cart.reduce((n, c) => n + c.quantity, 0)}</sup>
        </Link>
        <LanguageToggle className="about-language" />
        <Link className="about-login" href={user ? "/account" : "/login"}>
          <UserRound />
          <Text
            bn={user ? "অ্যাকাউন্ট" : "লগইন"}
            en={user ? "Account" : "Login"}
          />
        </Link>
        <Link className="about-join" href="/login?register=1">
          <Text bn="একাউন্ট তৈরি" en="Create account" />
        </Link>
        <button
          className="about-menu"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="about-navigation"
          aria-label={
            open
              ? lang === "bn"
                ? "মেনু বন্ধ করুন"
                : "Close menu"
              : lang === "bn"
                ? "মেনু খুলুন"
                : "Open menu"
          }
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <section className="about-hero">
        <div
          className="about-art"
          role="img"
          aria-label={
            lang === "bn"
              ? "U Service-এর ভবন ও বিভিন্ন সেবার ধারণামূলক চিত্র"
              : "Illustration of a U Service building and service teams"
          }
        />
        <div className="about-intro">
          <div className="about-breadcrumb">
            <Link href="/">
              <Text bn="হোম" en="Home" />
            </Link>
            <span>›</span>
            <Text bn="আমাদের সম্পর্কে" en="About us" />
          </div>
          <h1>
            <Text bn="আমাদের" en="About" />{" "}
            <em>
              <Text bn="সম্পর্কে" en="us" />
            </em>
          </h1>
          <h2>U Service BD Limited</h2>
          <p>
            <Text
              bn="U Service BD Limited একটি আধুনিক প্রযুক্তিনির্ভর মাল্টি-সার্ভিস ডিজিটাল প্ল্যাটফর্ম, যা বাংলাদেশের মানুষের দৈনন্দিন জীবনের প্রয়োজনীয় সব সেবা এক প্ল্যাটফর্মে আনার লক্ষ্যে কাজ করছে।"
              en="U Service BD Limited is a technology-driven multi-service platform working to bring the everyday needs of people in Bangladesh together in one place."
            />
          </p>
          <div className="about-pillars">
            {pillars.map(({ Icon, bn, en }) => (
              <div key={en}>
                <span>
                  <Icon />
                </span>
                <Text bn={bn} en={en} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        className="about-values-strip"
        aria-label={lang === "bn" ? "আমাদের পরিচয়" : "What brings us together"}
      >
        {[
          {
            Icon: Users,
            bn: "একটি প্ল্যাটফর্ম",
            en: "One platform",
            sub: "মানুষের বহু প্রয়োজনের সমাধান",
            suben: "Solutions for everyday needs",
          },
          {
            Icon: MapPin,
            bn: "বাংলাদেশজুড়ে",
            en: "Across Bangladesh",
            sub: "সেবা বিস্তারের লক্ষ্য",
            suben: "Our ambition to expand services",
          },
          {
            Icon: Settings,
            bn: "বহু সেবা",
            en: "Many services",
            sub: "এক প্ল্যাটফর্মে",
            suben: "Connected in one place",
          },
          {
            Icon: ShieldCheck,
            bn: "নিরাপদ, সহজ",
            en: "Safe and simple",
            sub: "ও নির্ভরযোগ্য সেবা",
            suben: "With dependable service",
          },
        ].map(({ Icon, bn, en, sub, suben }) => (
          <div key={en}>
            <span className="about-value-icon">
              <Icon />
            </span>
            <div>
              <h3>
                <Text bn={bn} en={en} />
              </h3>
              <p>
                <Text bn={sub} en={suben} />
              </p>
            </div>
          </div>
        ))}
      </section>
      <section className="about-story-grid">
        <article className="about-journey">
          <h2>
            <Text bn="আমাদের" en="Our" />{" "}
            <em>
              <Text bn="যাত্রা" en="journey" />
            </em>
          </h2>
          <p>
            <Text
              bn="মানুষের দৈনন্দিন জীবনের প্রয়োজনীয় সেবা সহজ, দ্রুত ও বিশ্বাসযোগ্যভাবে পৌঁছে দেওয়ার লক্ষ্য নিয়ে আমরা শুরু করেছি U Service BD। ছোট একটি স্বপ্ন থেকে একটি সংযুক্ত মাল্টি-সার্ভিস প্ল্যাটফর্ম গড়ে তুলছি, যেখানে খাবার, ওষুধ, শপিং, হোম সার্ভিস, টেকনিক্যাল সাপোর্ট ও ডেলিভারি সহ আরও অনেক সেবা এক জায়গায় পাওয়া যায়।"
              en="We started U Service BD with a simple ambition: make everyday services easier to find and access. We are building a connected platform for food, pharmacy, shopping, home care, technical services and delivery—bringing more of daily life into one place."
            />
          </p>
        </article>
        <article className="about-story-card">
          <span>
            <Target />
          </span>
          <h3>
            <Text bn="আমাদের লক্ষ্য" en="Our mission" />
          </h3>
          <p>
            <Text
              bn="প্রযুক্তির মাধ্যমে মানুষের জীবন আরও সহজ, স্বাচ্ছন্দ্যময় এবং সুবিধাজনক করা।"
              en="Make everyday life simpler, more comfortable and more convenient through technology."
            />
          </p>
        </article>
        <article className="about-story-card">
          <span>
            <Eye />
          </span>
          <h3>
            <Text bn="আমাদের ভিশন" en="Our vision" />
          </h3>
          <p>
            <Text
              bn="বাংলাদেশের সবার জন্য একটি বিশ্বস্ত, পূর্ণাঙ্গ ও আধুনিক ডিজিটাল সেবা প্ল্যাটফর্ম গড়ে তোলা।"
              en="Build a trusted, comprehensive and modern digital service platform for people across Bangladesh."
            />
          </p>
        </article>
        <article className="about-story-card about-principles">
          <span>
            <Gem />
          </span>
          <h3>
            <Text bn="আমাদের মূল্যবোধ" en="Our values" />
          </h3>
          <ul>
            {[
              ["গ্রাহককেন্দ্রিক সেবা", "Customer-focused service"],
              ["বিশ্বাস ও সততা", "Trust and honesty"],
              ["মানসম্মত সেবা", "Quality service"],
              ["মানুষের জন্য প্রযুক্তি", "Technology for people"],
              ["বাংলাদেশের উন্নয়নে অবদান", "Contributing to Bangladesh"],
            ].map(([bn, en]) => (
              <li key={en}>
                <Check />
                <Text bn={bn} en={en} />
              </li>
            ))}
          </ul>
        </article>
        <aside className="about-quote">
          <blockquote>
            “
            <Text
              bn="একটি প্ল্যাটফর্ম একটি সহজ জীবন"
              en="One platform. A simpler life."
            />
            ”
          </blockquote>
          <Link href="/catalog">
            <Text bn="সেবাগুলো দেখুন →" en="Explore services →" />
          </Link>
        </aside>
      </section>
    </div>
  );
}
