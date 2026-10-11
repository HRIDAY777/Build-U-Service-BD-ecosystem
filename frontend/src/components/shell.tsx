"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import {
  ArrowUpRight,
  Menu,
  ShoppingBag,
  UserRound,
  X,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { useApp, Text } from "./provider";
import { BrandLogo } from "./brand-logo";
export function Header() {
  const { lang, setLang, user, cart } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="announcement">
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
      <header className="header">
        <Link href="/" className="brand">
          <BrandLogo eager />
        </Link>
        <nav
          className={open ? "nav open" : "nav"}
          aria-label="Main navigation"
          onClick={() => setOpen(false)}
        >
          <Link href="/catalog">
            <Text bn="আমাদের সেবা" en="Explore services" />
          </Link>
          <Link href="/events">
            <Text bn="ইভেন্ট ম্যানেজমেন্ট" en="Events" />
          </Link>
          <Link href="/wishlist">
            <Text bn="পছন্দের তালিকা" en="Wishlist" />
          </Link>
          <Link href="/pages/about">
            <Text bn="আমাদের গল্প" en="Our story" />
          </Link>
          <Link href="/#how-it-works">
            <Text bn="যেভাবে কাজ করে" en="How it works" />
          </Link>
          <Link href="/contact">
            <Text bn="যোগাযোগ" en="Contact" />
          </Link>
        </nav>
        <div className="header-actions">
          <button
            className="lang-switch"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            aria-label="Change language"
          >
            {lang === "bn" ? "EN" : "বাংলা"}
          </button>
          <Link
            href="/checkout"
            className="icon-button"
            aria-label={`Shopping bag, ${cart.reduce((s, i) => s + i.quantity, 0)} items`}
          >
            <ShoppingBag size={21} />
            {cart.length > 0 && (
              <span className="badge">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
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
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <Link href="/" className="brand">
            <BrandLogo />
          </Link>
          <p>
            <Text
              bn="প্রতিদিনের জীবনকে আরও সহজ করতে, আপনার পাশে।"
              en="A little less hassle. A lot more living. We’re here for your everyday."
            />
          </p>
          <span className="location">
            <MapPin size={16} /> Bangladesh · BDT ৳
          </span>
        </div>
        <div>
          <h3>
            <Text bn="আমাদের বিভাগ" en="Our divisions" />
          </h3>
          <Link href="/catalog?division=food">
            <UiText text={"U Food"} />
          </Link>
          <Link href="/catalog?division=shop">
            <UiText text={"U Shop"} />
          </Link>
          <Link href="/catalog?division=pharmacy">
            <UiText text={"U Pharmacy"} />
          </Link>
          <Link href="/catalog?division=services">
            <UiText text={"U Services"} />
          </Link>
          <Link href="/events">
            <UiText text={"Wedding & events"} />
          </Link>
        </div>
        <div>
          <h3>
            <Text bn="একসাথে এগিয়ে চলুন" en="Build with us" />
          </h3>
          <Link href="/contact?interest=partner">
            <UiText text={"Become a partner"} />
          </Link>
          <Link href="/projects">
            <Text
              bn="প্রজেক্ট ও বিনিয়োগ পরিকল্পনা"
              en="Projects & investment plans"
            />
          </Link>
          <Link href="/project-account">
            <Text bn="প্রজেক্ট অ্যাকাউন্ট" en="Project account" />
          </Link>
          <Link href="/partner-application">
            <Text bn="পার্টনার আবেদন" en="Partner application" />
          </Link>
          <Link href="/contact?interest=provider">
            <UiText text={"Become a provider"} />
          </Link>
          <Link href="/contact?interest=rider">
            <UiText text={"Become a rider"} />
          </Link>
          <Link href="/portal">
            <UiText text={"Operations portal"} />
          </Link>
          <Link href="/provider">প্রোভাইডার পোর্টাল</Link>
          <Link href="/rider">রাইডার পোর্টাল</Link>
        </div>
        <div>
          <h3>
            <Text bn="আমরা আছি পাশে" en="Here to help" />
          </h3>
          <Link href="/account">
            <UiText text={"Your account"} />
          </Link>
          <Link href="/returns">Returns / পণ্য ফেরত</Link>
          <Link href="/loyalty">Loyalty points / লয়্যালটি পয়েন্ট</Link>
          <Link href="/reviews">Your reviews / আপনার রিভিউ</Link>
          <Link href="/stores">Stores & providers / প্রতিষ্ঠানসমূহ</Link>
          <Link href="/support">Support / সহায়তা</Link>
          <Link href="/photo-credits">ছবির উৎস / Photo credits</Link>
          <Link href="/contact">
            <UiText text={"Contact & support"} />
          </Link>
          <Link href="/pages/privacy">
            <UiText text={"Privacy information"} />
          </Link>
          <Link href="/pages/terms">
            <UiText text={"Terms of use"} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} U Service BD Limited</span>
        <span>
          <Text
            bn="বাংলাদেশের জন্য, ভালোবাসা নিয়ে।"
            en="Made for everyday life in Bangladesh."
          />
        </span>
      </div>
    </footer>
  );
}
