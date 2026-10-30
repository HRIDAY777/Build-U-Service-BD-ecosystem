"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Headphones,
  House,
  Mail,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { LanguageToggle } from "./language-toggle";
import { BrandLogo } from "./brand-logo";
import { ContactForm } from "./forms";
import { Photo } from "./photo";
import { Text, useApp } from "./provider";

const navigation = [
  ["/", "হোম", "Home"],
  ["/catalog", "বিভাগসমূহ", "Divisions"],
  ["/projects", "প্রকল্প", "Projects"],
  ["/events", "ইভেন্ট", "Events"],
  ["/offers", "অফার", "Offers"],
  ["/pages/about", "আমাদের সম্পর্কে", "About us"],
  ["/contact", "যোগাযোগ", "Contact"],
];

const faqs = [
  {
    questionBn: "অর্ডার বা বুকিংয়ের বিষয়ে কোথায় দেখব?",
    questionEn: "Where can I check an order or booking?",
    answerBn:
      "লগইন করে আপনার অ্যাকাউন্টের অর্ডার ও বুকিং অংশে অনুরোধের তথ্য দেখুন।",
    answerEn:
      "Sign in and open the orders and bookings section of your account to view your requests.",
  },
  {
    questionBn: "ডেলিভারির অনুরোধ কীভাবে করব?",
    questionEn: "How do I request a delivery?",
    answerBn:
      "ডেলিভারি পেজে পিকআপ ও গন্তব্যের ঠিকানা, পার্সেলের তথ্য দিয়ে আগে চার্জ দেখুন; তারপর অনুরোধ জমা দিন।",
    answerEn:
      "On the delivery page, add pickup and destination addresses and parcel details to review the fee before submitting a request.",
  },
  {
    questionBn: "ব্যবসা বা পার্টনারশিপ নিয়ে কথা বলতে চাই।",
    questionEn: "How can I discuss a business partnership?",
    answerBn:
      "যোগাযোগ ফর্মে “Business partnership” নির্বাচন করে আপনার প্রস্তাব পাঠান।",
    answerEn:
      "Choose “Business partnership” in the contact form and send us your proposal.",
  },
  {
    questionBn: "অ্যাকাউন্ট বা পেমেন্টে সাহায্য কোথায় পাব?",
    questionEn: "Where can I get account or payment help?",
    answerBn:
      "সাপোর্ট পোর্টালে লগইন করে একটি সহায়তা অনুরোধ জমা দিন।",
    answerEn:
      "Sign in to the support portal to submit a support request.",
  },
  {
    questionBn: "যোগাযোগ ফর্মে কী তথ্য দেব?",
    questionEn: "What should I include in the contact form?",
    answerBn:
      "আপনার নাম, যোগাযোগের তথ্য ও বিষয় নির্বাচন করে সংক্ষেপে কী সহায়তা প্রয়োজন তা লিখুন।",
    answerEn:
      "Add your name, contact details and topic, then briefly describe how we can help.",
  },
];

export function ContactHeader() {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="contact-header">
      <Link href="/" className="contact-brand" aria-label="U Service BD">
        <BrandLogo eager />
      </Link>
      <nav
        id="contact-navigation"
        className={open ? "contact-nav open" : "contact-nav"}
        aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}
        onClick={() => setOpen(false)}
      >
        {navigation.map(([href, bn, en]) => (
          <Link
            href={href}
            key={href}
            aria-current={href === "/contact" ? "page" : undefined}
          >
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>
      <form className="contact-header-search" action="/catalog" role="search">
        <Search size={17} aria-hidden="true" />
        <input
          name="q"
          aria-label={lang === "bn" ? "সেবা খুঁজুন" : "Search services"}
          placeholder={
            lang === "bn"
              ? "আপনার প্রয়োজনীয় সেবা খুঁজুন..."
              : "Search for a service..."
          }
        />
      </form>
      <div className="contact-header-actions">
        <LanguageToggle className="contact-language" />
        <Link
          href="/checkout"
          className="contact-cart"
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
          className="contact-login"
        >
          <UserRound size={17} />
          <Text
            bn={user ? "অ্যাকাউন্ট" : "লগইন"}
            en={user ? "Account" : "Sign in"}
          />
        </Link>
        {!user && (
          <Link href="/login?register=1" className="contact-register">
            <Text bn="অ্যাকাউন্ট তৈরি" en="Create account" />
          </Link>
        )}
        <button
          type="button"
          className="contact-menu-toggle"
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
          aria-controls="contact-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

export function ContactStorefront() {
  return (
    <div className="contact-reference-page">
      <ContactHeader />
      <section className="contact-hero">
        <div className="contact-hero-copy">
          <div className="contact-breadcrumb">
            <Link href="/">
              <Text bn="হোম" en="Home" />
            </Link>
            <span>›</span>
            <Text bn="যোগাযোগ" en="Contact" />
          </div>
          <span className="contact-eyebrow">
            <MessageCircle size={18} />
            <Text bn="যোগাযোগ করুন" en="LET’S TALK" />
          </span>
          <h1>
            <Text bn="আপনার যে কোনো" en="Here when" />
            <br />
            <strong>
              <Text bn="প্রয়োজনে আমরা আছি" en="you need us" />
            </strong>
          </h1>
          <h2>
            <Text
              bn="U Service BD — আপনার শহর, আপনার সেবা"
              en="U Service BD — Your city, your services"
            />
          </h2>
          <p>
            <Text
              bn="কোনো প্রশ্ন, পরামর্শ বা সহযোগিতার প্রয়োজন? আমাদের সাথে সহজেই যোগাযোগ করুন। আপনার বার্তা সঠিক টিমের কাছে পৌঁছে দিতে বিষয়টি বেছে নিন।"
              en="Have a question, suggestion or need help? Get in touch using the form and choose a topic so your message can reach the right team."
            />
          </p>
          <div className="contact-hero-links">
            <a href="#contact-form">
              <Mail size={18} />
              <Text bn="বার্তা পাঠান" en="Send us a message" />
              <ArrowRight size={17} />
            </a>
            <Link href="/support">
              <Headphones size={18} />
              <Text bn="সাপোর্ট পোর্টাল" en="Support portal" />
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="contact-hero-art" aria-hidden="true">
          <div className="contact-hero-orbit" />
          <Photo
            src="/images/photos/home-person.png"
            alt=""
            className="contact-hero-person"
            eager
          />
          <div className="contact-speech">
            <MessageCircle size={19} />
            <Text
              bn="আপনার কথা আমাদের কাছে গুরুত্বপূর্ণ!"
              en="Your voice matters to us!"
            />
          </div>
          <div className="contact-hero-note">
            <CheckCircle2 size={17} />
            <Text
              bn="ফর্মে বিষয় বেছে বার্তা পাঠান"
              en="Choose a topic and send a message"
            />
          </div>
        </div>
        <section
          id="contact-form"
          className="contact-form-panel"
          aria-label="Contact form"
        >
          <div className="contact-form-heading">
            <Mail size={25} />
            <h2>
              <Text bn="আমাদের বার্তা পাঠান" en="Send us a message" />
            </h2>
          </div>
          <ContactForm />
        </section>
        <div className="contact-quick-links">
          <a href="#contact-form">
            <span className="contact-quick-icon phone">
              <Mail size={22} />
            </span>
            <span>
              <strong>
                <Text bn="বার্তা পাঠান" en="Send a message" />
              </strong>
              <small>
                <Text bn="যোগাযোগ ফর্ম ব্যবহার করুন" en="Use the contact form" />
              </small>
            </span>
          </a>
          <Link href="/support">
            <span className="contact-quick-icon support">
              <Headphones size={22} />
            </span>
            <span>
              <strong>
                <Text bn="সাহায্য কেন্দ্র" en="Help centre" />
              </strong>
              <small>
                <Text
                  bn="অ্যাকাউন্টে সাপোর্ট অনুরোধ"
                  en="Support requests in your account"
                />
              </small>
            </span>
          </Link>
          <Link href="/partner-application">
            <span className="contact-quick-icon partner">
              <UsersRound size={22} />
            </span>
            <span>
              <strong>
                <Text bn="পার্টনারশিপ" en="Partnerships" />
              </strong>
              <small>
                <Text
                  bn="আমাদের সাথে কাজ করুন"
                  en="Work with U Service"
                />
              </small>
            </span>
          </Link>
          <Link href="/account">
            <span className="contact-quick-icon account">
              <ShoppingBag size={22} />
            </span>
            <span>
              <strong>
                <Text bn="অর্ডার ও বুকিং" en="Orders & bookings" />
              </strong>
              <small>
                <Text
                  bn="আপনার অ্যাকাউন্টে দেখুন"
                  en="View them in your account"
                />
              </small>
            </span>
          </Link>
        </div>
      </section>

      <div className="contact-content-grid">
        <section className="contact-info-panel">
          <div className="contact-section-heading">
            <span className="contact-section-icon">
              <MessageCircle size={20} />
            </span>
            <div>
              <h2>
                <Text
                  bn="কীভাবে যোগাযোগ করবেন"
                  en="Ways to get in touch"
                />
              </h2>
              <p>
                <Text
                  bn="আপনার প্রয়োজন অনুযায়ী সঠিক চ্যানেলটি বেছে নিন।"
                  en="Choose the channel that best fits your needs."
                />
              </p>
            </div>
          </div>
          <div className="contact-method-list">
            <a href="#contact-form">
              <Mail size={18} />
              <span>
                <strong>
                  <Text bn="সাধারণ প্রশ্ন ও পরামর্শ" en="Questions & feedback" />
                </strong>
                <small>
                  <Text
                    bn="যোগাযোগ ফর্মে আপনার বিষয়টি লিখুন"
                    en="Tell us about it in the contact form"
                  />
                </small>
              </span>
              <ArrowRight size={16} />
            </a>
            <Link href="/support">
              <Headphones size={18} />
              <span>
                <strong>
                  <Text bn="অর্ডার বা অ্যাকাউন্ট সহায়তা" en="Order or account help" />
                </strong>
                <small>
                  <Text
                    bn="সাপোর্ট পোর্টালে অনুরোধ জমা দিন"
                    en="Submit a request in the support portal"
                  />
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/partner-application">
              <UsersRound size={18} />
              <span>
                <strong>
                  <Text bn="ব্যবসায়িক অংশীদারিত্ব" en="Business partnerships" />
                </strong>
                <small>
                  <Text
                    bn="পার্টনার আবেদন সম্পর্কে জানুন"
                    en="Learn about partner applications"
                  />
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="contact-privacy-note">
            <BadgeHelp size={18} />
            <p>
              <Text
                bn="অর্ডারসংক্রান্ত প্রশ্নে সহায়তা পেতে আপনার অ্যাকাউন্টে লগইন করুন।"
                en="For help with an order, sign in to your account."
              />
            </p>
          </div>
        </section>

        <section className="contact-faq-panel">
          <div className="contact-faq-heading">
            <span className="contact-section-icon">
              <CircleHelp size={20} />
            </span>
            <h2>
              <Text bn="সাধারণ প্রশ্ন (FAQ)" en="Frequently asked questions" />
            </h2>
            <Link href="/support">
              <Text bn="সাহায্য" en="Help" />
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="contact-faq-list">
            {faqs.map((faq) => (
              <details key={faq.questionEn}>
                <summary>
                  <CircleHelp size={14} />
                  <span>
                    <Text bn={faq.questionBn} en={faq.questionEn} />
                  </span>
                  <ChevronDown size={16} />
                </summary>
                <p>
                  <Text bn={faq.answerBn} en={faq.answerEn} />
                </p>
              </details>
            ))}
          </div>
        </section>

        <aside className="contact-support-card">
          <span className="contact-support-icon">
            <Headphones size={22} />
          </span>
          <h2>
            <Text bn="সাপোর্ট পোর্টাল" en="Support portal" />
          </h2>
          <p>
            <Text
              bn="অ্যাকাউন্ট, অর্ডার বা বুকিং নিয়ে সাহায্যের জন্য সাপোর্ট অনুরোধ জমা দিন।"
              en="Submit a support request for help with your account, order or booking."
            />
          </p>
          <Photo
            src="/images/photos/delivery-rider-reference.jpg"
            alt=""
            className="contact-support-photo"
          />
          <Link href="/support">
            <MessageCircle size={16} />
            <Text bn="সাপোর্টে যান" en="Go to support" />
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>

      <section className="contact-trust-strip">
        <div>
          <CheckCircle2 size={28} />
          <span>
            <strong>
              <Text bn="নিরাপদে বার্তা পাঠান" en="Send a message securely" />
            </strong>
            <small>
              <Text bn="অফিসিয়াল যোগাযোগ ফর্ম" en="Official contact form" />
            </small>
          </span>
        </div>
        <div>
          <Headphones size={28} />
          <span>
            <strong>
              <Text bn="সাপোর্ট অনুরোধ" en="Support requests" />
            </strong>
            <small>
              <Text bn="আপনার অ্যাকাউন্ট থেকে" en="Through your account" />
            </small>
          </span>
        </div>
        <div>
          <House size={28} />
          <span>
            <strong>
              <Text bn="সেবা বেছে নিন" en="Choose a service" />
            </strong>
            <small>
              <Text bn="U Service BD-তে ঘুরে দেখুন" en="Explore U Service BD" />
            </small>
          </span>
          <Link href="/catalog" aria-label="Explore services">
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
