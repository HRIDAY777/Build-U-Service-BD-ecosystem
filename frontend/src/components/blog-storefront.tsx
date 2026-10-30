"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Eye,
  Film,
  Flame,
  Grid2X2,
  HeartPulse,
  House,
  Mail,
  Menu,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { Photo } from "@/components/photo";
import { Text, useApp } from "@/components/provider";

const navigation = [
  { href: "/", bn: "হোম", en: "Home" },
  { href: "/catalog?division=food", bn: "খাবার", en: "Food" },
  { href: "/catalog?division=pharmacy", bn: "ঔষধ", en: "Pharmacy" },
  { href: "/catalog?division=shop", bn: "অনলাইন শপিং", en: "Shopping" },
  { href: "/catalog?division=services", bn: "হোম সার্ভিস", en: "Home services" },
  { href: "/pages/about", bn: "কেন U Service?", en: "Why U Service?" },
  { href: "/blog", bn: "নিউজ ও ব্লগ", en: "News & blog", current: true },
  { href: "/contact", bn: "যোগাযোগ", en: "Contact" },
];

const PRESENTATION_CHAPTERS = [
  {
    time: 0,
    stamp: "0:00",
    bn: "০১ · কোম্পানি পরিচিতি ও ভিশন",
    en: "01 · Company Profile & Vision",
  },
  {
    time: 6,
    stamp: "0:06",
    bn: "০২ · শপ, খাবার ও অনলাইন ফার্মেসি",
    en: "02 · U Shop, Food & Pharmacy",
  },
  {
    time: 12,
    stamp: "0:12",
    bn: "০৩ · হোম সার্ভিস, ইলেকট্রিশিয়ান ও মেকানিক",
    en: "03 · Home Services & Auto Mechanic",
  },
  {
    time: 18,
    stamp: "0:18",
    bn: "০৪ · পার্সেল ডেলিভারি ও বিয়ে/ইভেন্ট আয়োজন",
    en: "04 · Parcel Delivery & Events",
  },
  {
    time: 24,
    stamp: "0:24",
    bn: "০৫ · প্রজেক্ট বাস্তবায়ন ও বিনিয়োগ পরিকল্পনা",
    en: "05 · Managed Projects & Investment",
  },
  {
    time: 30,
    stamp: "0:30",
    bn: "০৬ · ১১টি পেমেন্ট গেটওয়ে ও রোল ড্যাশবোর্ড",
    en: "06 · 11 Payment Gateways & Portals",
  },
  {
    time: 36,
    stamp: "0:36",
    bn: "০৭ · আমাদের সাথে যুক্ত হোন",
    en: "07 · Join U Service BD Limited",
  },
];

const categories = [
  { key: "all", bn: "সব পোস্ট", en: "All posts", Icon: Grid2X2 },
  { key: "updates", bn: "আমাদের আপডেট", en: "Our updates", Icon: Zap },
  { key: "tips", bn: "সেবা টিপস", en: "Service tips", Icon: Sparkles },
  { key: "health", bn: "স্বাস্থ্য ও সুস্থতা", en: "Health & wellness", Icon: HeartPulse },
  { key: "home", bn: "ঘর ও জীবনধারা", en: "Home & lifestyle", Icon: House },
  { key: "tech", bn: "প্রযুক্তি ও নিরাপত্তা", en: "Technology & safety", Icon: ShieldCheck },
  { key: "business", bn: "ব্যবসা ও আয়", en: "Business & earnings", Icon: ShoppingBag },
];

const articles = [
  {
    id: "company-presentation",
    category: "updates",
    categoryBn: "কোম্পানি প্রেজেন্টেশন",
    categoryEn: "Company Presentation",
    titleBn:
      "ভিডিও প্রেজেন্টেশন: এক নজরে U Service BD Limited-এর সকল সেবা ও ভবিষ্যৎ পরিকল্পনা",
    titleEn:
      "Video Presentation: Inside U Service BD Limited's Unified Multi-Service Ecosystem",
    image: "/images/photos/u-service-presentation-poster.jpg",
    dateBn: "৩০ অক্টোবর ২০২৬",
    dateEn: "30 October 2026",
    readBn: "৪২ সেকেন্ড ভিডিও",
    readEn: "0:42 HD Video",
    href: "#company-presentation-video",
  },
  {
    id: "ac-care",
    category: "tips",
    categoryBn: "সেবা টিপস",
    categoryEn: "Service tips",
    titleBn: "এসি সার্ভিস কখন করাবেন? কয়েকটি লক্ষণ চিনে নিন",
    titleEn: "When should you service your AC? Know the signs",
    image: "/images/photos/electrician-worker-reference.jpg",
    dateBn: "১২ অক্টোবর ২০২৬",
    dateEn: "12 October 2026",
    readBn: "৪ মিনিট পড়ুন",
    readEn: "4 min read",
    href: "/catalog?division=electrician",
  },
  {
    id: "healthy-food",
    category: "health",
    categoryBn: "স্বাস্থ্য ও সুস্থতা",
    categoryEn: "Health & wellness",
    titleBn: "ব্যস্ত জীবনে সুস্থ থাকার ৫টি সহজ অভ্যাস",
    titleEn: "5 easy habits for a healthier busy life",
    image: "/images/photos/food.jpg",
    dateBn: "১০ অক্টোবর ২০২৬",
    dateEn: "10 October 2026",
    readBn: "৩ মিনিট পড়ুন",
    readEn: "3 min read",
    href: "/catalog?division=food",
  },
  {
    id: "home-cleaning",
    category: "home",
    categoryBn: "ঘর ও জীবনধারা",
    categoryEn: "Home & lifestyle",
    titleBn: "ঘর পরিষ্কার রাখার উপায়: সহজ ও কার্যকর কিছু টিপস",
    titleEn: "Simple, effective ways to keep your home clean",
    image: "/images/photos/services.jpg",
    dateBn: "৮ অক্টোবর ২০২৬",
    dateEn: "8 October 2026",
    readBn: "৫ মিনিট পড়ুন",
    readEn: "5 min read",
    href: "/catalog?division=services",
  },
  {
    id: "app-guide",
    category: "tech",
    categoryBn: "প্রযুক্তি ও নিরাপত্তা",
    categoryEn: "Technology & safety",
    titleBn: "U Service প্ল্যাটফর্ম ব্যবহার করে সেবা খুঁজে নিন সহজে",
    titleEn: "Find the services you need with the U Service platform",
    image: "/images/photos/home-hero-art.webp",
    dateBn: "৬ অক্টোবর ২০২৬",
    dateEn: "6 October 2026",
    readBn: "৪ মিনিট পড়ুন",
    readEn: "4 min read",
    href: "/catalog",
  },
  {
    id: "small-business",
    category: "business",
    categoryBn: "ব্যবসা ও আয়",
    categoryEn: "Business & earnings",
    titleBn: "ছোট ব্যবসার জন্য প্রয়োজনীয় সেবা সঙ্গী",
    titleEn: "Everyday service partners for small businesses",
    image: "/images/photos/offers-shopper.webp",
    dateBn: "২ অক্টোবর ২০২৬",
    dateEn: "2 October 2026",
    readBn: "৫ মিনিট পড়ুন",
    readEn: "5 min read",
    href: "/contact?interest=partner",
  },
  {
    id: "car-care",
    category: "tips",
    categoryBn: "সেবা টিপস",
    categoryEn: "Service tips",
    titleBn: "গাড়ির নিয়মিত মেইনটেন্যান্স কেন গুরুত্বপূর্ণ?",
    titleEn: "Why regular vehicle maintenance matters",
    image: "/images/photos/mechanic.jpg",
    dateBn: "২৮ সেপ্টেম্বর ২০২৬",
    dateEn: "28 September 2026",
    readBn: "৪ মিনিট পড়ুন",
    readEn: "4 min read",
    href: "/mechanic",
  },
  {
    id: "calm-home",
    category: "home",
    categoryBn: "ঘর ও জীবনধারা",
    categoryEn: "Home & lifestyle",
    titleBn: "ঘরে আরামদায়ক পরিবেশ তৈরির সহজ উপায়",
    titleEn: "Simple ways to make your home feel more comfortable",
    image: "/images/photos/home-reference-details.webp",
    dateBn: "২৬ সেপ্টেম্বর ২০২৬",
    dateEn: "26 September 2026",
    readBn: "৩ মিনিট পড়ুন",
    readEn: "3 min read",
    href: "/catalog?division=services",
  },
  {
    id: "new-updates",
    category: "updates",
    categoryBn: "আমাদের আপডেট",
    categoryEn: "Our updates",
    titleBn: "U Service BD-তে নতুন সেবা ও আপডেট",
    titleEn: "New services and updates from U Service BD",
    image: "/images/photos/delivery-rider-reference.jpg",
    dateBn: "২০ সেপ্টেম্বর ২০২৬",
    dateEn: "20 September 2026",
    readBn: "২ মিনিট পড়ুন",
    readEn: "2 min read",
    href: "/catalog",
  },
];

function BlogHeader({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (value: string) => void;
}) {
  const { lang, user } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="blog-header">
      <Link href="/" className="blog-brand" aria-label="U Service BD">
        <BrandLogo eager />
      </Link>
      <nav
        id="blog-navigation"
        className={menuOpen ? "blog-nav open" : "blog-nav"}
        aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}
        onClick={() => setMenuOpen(false)}
      >
        {navigation.map(({ href, bn, en, current }) => (
          <Link
            href={href}
            key={href}
            aria-current={current ? "page" : undefined}
          >
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>
      <form
        className="blog-header-search"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <Search size={16} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={lang === "bn" ? "ব্লগ খুঁজুন" : "Search blog"}
          placeholder={lang === "bn" ? "আপনার জন্য কিছু খুঁজুন..." : "Search articles..."}
        />
      </form>
      <div className="blog-header-actions">
        <Link
          href="/checkout"
          className="blog-cart"
          aria-label={lang === "bn" ? "কার্ট" : "Shopping cart"}
        >
          <ShoppingBag size={20} />
        </Link>
        <LanguageToggle className="blog-language" />
        <Link href={user ? "/account" : "/login"} className="blog-login">
          <UserRound size={15} />
          <Text bn={user ? "অ্যাকাউন্ট" : "লগইন"} en={user ? "Account" : "Sign in"} />
        </Link>
        {!user && (
          <Link href="/login?register=1" className="blog-register">
            <Text bn="অ্যাকাউন্ট তৈরি" en="Create account" />
          </Link>
        )}
        <button
          className="blog-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="blog-navigation"
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
    </header>
  );
}

export function BlogStorefront() {
  const { lang } = useApp();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const visibleArticles = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    return articles.filter((article) => {
      const matchesCategory =
        activeCategory === "all" || article.category === activeCategory;
      const matchesQuery =
        !searchTerm ||
        `${article.titleBn} ${article.titleEn} ${article.categoryBn} ${article.categoryEn}`
          .toLocaleLowerCase()
          .includes(searchTerm);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const popular = [articles[0], articles[1], articles[3], articles[4]];

  function jumpToChapter(index: number) {
    const target = PRESENTATION_CHAPTERS[index];
    if (!target) return;
    setActiveChapterIdx(index);
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = target.time;
      void vid.play();
    }
  }

  function handleTimeUpdate() {
    const vid = videoRef.current;
    if (!vid) return;
    const t = vid.currentTime;
    let current = 0;
    for (let i = 0; i < PRESENTATION_CHAPTERS.length; i++) {
      if (t >= PRESENTATION_CHAPTERS[i].time) {
        current = i;
      }
    }
    if (current !== activeChapterIdx) {
      setActiveChapterIdx(current);
    }
  }

  return (
    <div className="blog-reference-page">
      <BlogHeader query={query} setQuery={setQuery} />
      <div className="blog-page-main">
        <section className="blog-hero">
          <div className="blog-hero-copy">
            <span className="blog-hero-kicker">
              <Sparkles size={16} />
              <Text bn="U Service BD — নিউজ ও ব্লগ" en="U Service BD — News & blog" />
            </span>
            <h1>
              <Text bn="আপনার দৈনন্দিন জীবনে" en="Everyday ideas" />
              <br />
              <Text bn="সহজ সমাধানের জন্য" en="for a simpler life" />
              <br />
              <strong>
                <Text bn="প্রয়োজনীয় তথ্য ও পরামর্শ" en="Helpful tips & advice" />
              </strong>
            </h1>
            <p>
              <Text
                bn="আমাদের অফিশিয়াল কোম্পানি প্রেজেন্টেশন ভিডিও, স্মার্ট সার্ভিস গাইড, ঘর-পরিবারের সমাধান ও সর্বশেষ আপডেট — সব এক জায়গায়।"
                en="Watch our official company presentation video alongside practical service guides, home tips and updates from U Service BD."
              />
            </p>
          </div>
          <div
            className="blog-hero-image"
            role="img"
            aria-label={
              lang === "bn"
                ? "U Service BD-এর সঙ্গে সহজ জীবনের পরামর্শ"
                : "Everyday advice from U Service BD"
            }
          />
          <aside className="blog-hero-search">
            <h2>
              <Search size={20} />
              <Text bn="ব্লগ পোস্ট খুঁজুন" en="Search blog posts" />
            </h2>
            <form role="search" onSubmit={(event) => event.preventDefault()}>
              <Search size={17} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={
                  lang === "bn" ? "কী জানতে চান?" : "What would you like to know?"
                }
                placeholder={
                  lang === "bn"
                    ? "আপনি কী জানতে চান?"
                    : "What would you like to know?"
                }
              />
              {query && (
                <button
                  type="button"
                  className="blog-clear-search"
                  aria-label={lang === "bn" ? "সার্চ মুছুন" : "Clear search"}
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
              <button type="submit" className="blog-search-submit">
                <Text bn="খুঁজুন" en="Search" />
              </button>
            </form>
          </aside>
        </section>

        {/* OFFICIAL COMPANY PRESENTATION VIDEO SHOWCASE */}
        <section
          id="company-presentation-video"
          className="blog-presentation-showcase"
          aria-label={
            lang === "bn"
              ? "কোম্পানি প্রেজেন্টেশন ভিডিও"
              : "Company Presentation Video"
          }
        >
          <div className="blog-presentation-head">
            <div>
              <span className="blog-presentation-badge">
                <Film size={14} />
                <Text
                  bn="অফিশিয়াল কোম্পানি প্রেজেন্টেশন · FULL HD (1080p)"
                  en="OFFICIAL COMPANY PRESENTATION · FULL HD (1080p)"
                />
              </span>
              <h2>
                <Text
                  bn="এক নজরে U Service BD Limited — সম্পূর্ণ কোম্পানি প্রেজেন্টেশন"
                  en="U Service BD Limited — Complete Company Presentation Video"
                />
              </h2>
              <p>
                <Text
                  bn="খাবার, অনলাইন শপ, ফার্মেসি, হোম সার্ভিস, মেকানিক, পার্সেল ডেলিভারি, বিয়ে ও ইভেন্ট এবং প্রজেক্ট বিনিয়োগ — আমাদের পুরো ইকোসিস্টেম কীভাবে কাজ করে তা এই ভিডিও প্রেজেন্টেশনে দেখুন।"
                  en="Explore how our unified ecosystem connects Food, Shop, Pharmacy, Home Services, Mechanics, Parcel Delivery, Events and Managed Projects across Bangladesh."
                />
              </p>
            </div>

            <div className="blog-presentation-actions">
              <button
                type="button"
                className="blog-pres-btn primary"
                onClick={() => {
                  const vid = videoRef.current;
                  if (vid) void vid.play();
                }}
              >
                <Play size={15} />
                <Text bn="প্রেজেন্টেশন চালু করুন" en="Play Presentation" />
              </button>
              <button
                type="button"
                className="blog-pres-btn"
                onClick={() => jumpToChapter(0)}
              >
                <RotateCcw size={15} />
                <Text bn="শুরু থেকে দেখুন" en="Restart" />
              </button>
              <Link href="/catalog" className="blog-pres-btn green">
                <ShoppingBag size={15} />
                <Text bn="সব সেবা দেখুন" en="Explore Services" />
              </Link>
            </div>
          </div>

          <div className="blog-presentation-grid">
            <div className="blog-video-frame">
              <video
                ref={videoRef}
                src="/videos/u-service-bd-presentation.webm"
                poster="/images/photos/u-service-presentation-poster.jpg"
                controls
                preload="metadata"
                playsInline
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            <div className="blog-chapters-panel">
              <div className="blog-chapters-title">
                <Text
                  bn="প্রেজেন্টেশন অধ্যায়সমূহ (ক্লিক করে সরাসরি দেখুন)"
                  en="Presentation Chapters (Click to jump)"
                />
              </div>
              {PRESENTATION_CHAPTERS.map((chap, idx) => (
                <button
                  key={chap.time}
                  type="button"
                  className={`blog-chapter-item${activeChapterIdx === idx ? " active" : ""}`}
                  onClick={() => jumpToChapter(idx)}
                >
                  <span>
                    <Text bn={chap.bn} en={chap.en} />
                  </span>
                  <span className="blog-chapter-time">{chap.stamp}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="blog-layout">
          <div className="blog-main-column">
            <nav
              className="blog-categories"
              aria-label={lang === "bn" ? "ব্লগ বিভাগ" : "Blog categories"}
            >
              {categories.map(({ key, bn, en, Icon }) => (
                <button
                  type="button"
                  key={key}
                  className={activeCategory === key ? "active" : ""}
                  aria-pressed={activeCategory === key}
                  onClick={() => setActiveCategory(key)}
                >
                  <Icon size={16} />
                  <Text bn={bn} en={en} />
                </button>
              ))}
            </nav>

            <section className="blog-articles" id="blog-posts" aria-live="polite">
              {visibleArticles.length ? (
                visibleArticles.map((article) => (
                  <article className="blog-card" id={article.id} key={article.id}>
                    <Link href={article.href} className="blog-card-image">
                      <Photo
                        src={article.image}
                        alt={lang === "bn" ? article.titleBn : article.titleEn}
                      />
                      <span
                        className={`blog-card-category blog-category-${article.category}`}
                      >
                        <Text bn={article.categoryBn} en={article.categoryEn} />
                      </span>
                    </Link>
                    <div className="blog-card-body">
                      <Link href={article.href} className="blog-card-title">
                        <Text bn={article.titleBn} en={article.titleEn} />
                      </Link>
                      <div className="blog-card-meta">
                        <span>
                          <Clock3 size={13} />
                          <Text bn={article.dateBn} en={article.dateEn} />
                        </span>
                        <span>
                          <Eye size={14} />
                          <Text bn={article.readBn} en={article.readEn} />
                        </span>
                        <Link href={article.href}>
                          <Text
                            bn={
                              article.id === "company-presentation"
                                ? "ভিডিও দেখুন"
                                : "আরও পড়ুন"
                            }
                            en={
                              article.id === "company-presentation"
                                ? "Watch video"
                                : "Read more"
                            }
                          />
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="blog-empty">
                  <Search size={24} />
                  <h2>
                    <Text bn="কোনো পোস্ট পাওয়া যায়নি" en="No posts found" />
                  </h2>
                  <p>
                    <Text
                      bn="অন্য শব্দ দিয়ে খুঁজুন অথবা সব পোস্ট দেখুন।"
                      en="Try another search or browse all posts."
                    />
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setActiveCategory("all");
                    }}
                  >
                    <Text bn="সব পোস্ট দেখুন" en="Show all posts" />
                  </button>
                </div>
              )}
            </section>
          </div>

          <aside className="blog-sidebar">
            <section className="blog-popular">
              <h2>
                <Flame size={20} fill="#ff5c35" />
                <Text bn="জনপ্রিয় পোস্ট" en="Popular posts" />
                <a href="#blog-posts">
                  <Text bn="সব দেখুন" en="See all" />
                  <ArrowRight size={14} />
                </a>
              </h2>
              <div>
                {popular.map((article) => (
                  <Link
                    href={
                      article.id === "company-presentation"
                        ? "#company-presentation-video"
                        : `#${article.id}`
                    }
                    className="blog-popular-item"
                    key={article.id}
                  >
                    <Photo src={article.image} alt="" />
                    <span>
                      <strong>
                        <Text bn={article.titleBn} en={article.titleEn} />
                      </strong>
                      <small>
                        <Clock3 size={12} />
                        <Text bn={article.dateBn} en={article.dateEn} />
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="blog-newsletter">
              <h2>
                <Mail size={24} />
                <Text bn="নতুন পোস্টের আপডেট পান" en="Get the latest updates" />
              </h2>
              <p>
                <Text
                  bn="সার্ভিস টিপস, বিশেষ অফার এবং গুরুত্বপূর্ণ তথ্য পেতে আমাদের সাথে থাকুন।"
                  en="Stay up to date with service tips, special offers and useful advice."
                />
              </p>
              <form action="/contact" method="get">
                <input type="hidden" name="interest" value="blog-updates" />
                <label className="sr-only" htmlFor="blog-newsletter-email">
                  <Text bn="আপনার ইমেইল" en="Your email" />
                </label>
                <input
                  id="blog-newsletter-email"
                  name="email"
                  type="email"
                  required
                  placeholder={
                    lang === "bn" ? "আপনার ইমেইল লিখুন..." : "Enter your email..."
                  }
                />
                <button type="submit">
                  <Mail size={16} />
                  <Text bn="সাবস্ক্রাইব করুন" en="Subscribe" />
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>
      <footer className="blog-footer">
        <Link href="/" aria-label="U Service BD">
          <BrandLogo />
        </Link>
        <span>
          <Text
            bn="এক প্ল্যাটফর্ম, প্রতিদিনের সব সেবা"
            en="One platform for everyday services"
          />
        </span>
        <Link href="/contact">
          <Text bn="যোগাযোগ" en="Contact us" />
          <Truck size={15} />
        </Link>
      </footer>
    </div>
  );
}
