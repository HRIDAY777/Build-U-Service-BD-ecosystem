"use client";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { LanguageToggle } from "./language-toggle";
import {
  Search,
  ShoppingBag,
  Shirt,
  House,
  BookOpen,
  Cable,
  Package,
  CookingPot,
  LayoutGrid,
  Headphones,
  Truck,
  RotateCcw,
  BadgeCheck,
  Menu,
  X,
  UserRound,
} from "lucide-react";
import { Text, useApp } from "./provider";

type Category = {
  id: number;
  name: string;
  name_bn: string;
  parent: number | null;
};
const categoryIcon = (name: string) =>
  /cloth|wear/i.test(name)
    ? Shirt
    : /bag/i.test(name)
      ? ShoppingBag
      : /home/i.test(name)
        ? House
        : /station|writ/i.test(name)
          ? BookOpen
          : /accessor/i.test(name)
            ? Cable
            : /kitchen/i.test(name)
              ? CookingPot
              : Package;
export function ShopHeader() {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="shop-nav">
      <Link href="/" className="brand">
        <BrandLogo eager animated />
      </Link>
      <nav
        className={open ? "shop-nav-links open" : "shop-nav-links"}
        id="shop-navigation"
        aria-label={lang === "bn" ? "শপিং মেনু" : "Shopping navigation"}
        onClick={() => setOpen(false)}
      >
        {[
          ["/", "হোম", "Home"],
          ["/catalog", "বিভাগসমূহ", "Divisions"],
          ["/catalog?division=shop", "শপিং", "Shopping"],
          ["/projects", "প্রকল্প", "Projects"],
          ["/events", "ইভেন্ট", "Events"],
          ["/offers", "অফার", "Offers"],
          ["/pages/about", "আমাদের সম্পর্কে", "About us"],
          ["/contact", "যোগাযোগ", "Contact"],
        ].map(([href, bn, en]) => (
          <Link
            key={href}
            href={href}
            aria-current={href === "/catalog?division=shop" ? "page" : undefined}
          >
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>
      <div className="shop-nav-actions">
        <LanguageToggle className="shop-language-switch" />
        <Link
          href="/checkout"
          className="shop-cart-link"
          aria-label={lang === "bn" ? "কেনাকাটার ব্যাগ" : "Shopping bag"}
        >
          <ShoppingBag />
          <span>{cart.reduce((n, c) => n + c.quantity, 0)}</span>
        </Link>
        <Link className="shop-login-link" href={user ? "/account" : "/login"}>
          <UserRound />
          <Text
            bn={user ? "অ্যাকাউন্ট" : "লগইন"}
            en={user ? "Account" : "Login"}
          />
        </Link>
        {!user && (
          <Link className="shop-register-link" href="/login?register=1">
            <Text bn="অ্যাকাউন্ট তৈরি" en="Create account" />
          </Link>
        )}
        <button
          className="shop-menu-toggle"
          type="button"
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
          aria-controls="shop-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </div>
  );
}
export function ShopBenefits() {
  return (
    <aside className="shop-information">
      <h2>
        <Text
          bn="কেন U Service থেকে শপিং করবেন?"
          en="Shopping with U Service"
        />
      </h2>
      <Link href="/stores?division=shop">
        <BadgeCheck />
        <Text
          bn="পণ্য ও দোকানের বিস্তারিত দেখুন"
          en="Explore products and stores"
        />
      </Link>
      <Link href="/checkout">
        <ShoppingBag />
        <Text bn="এক ব্যাগে পছন্দের পণ্য" en="Your favourites in one bag" />
      </Link>
      <Link href="/account">
        <Truck />
        <Text bn="অর্ডারের অগ্রগতি দেখুন" en="Follow your order progress" />
      </Link>
      <Link href="/returns">
        <RotateCcw />
        <Text bn="রিটার্ন ও রিফান্ডের নিয়ম" en="Return and refund policy" />
      </Link>
      <Link href="/support">
        <Headphones />
        <Text bn="কেনাকাটায় সহায়তা নিন" en="Get shopping support" />
      </Link>
    </aside>
  );
}
export function ShopStorefront({
  categories,
  query,
  selected,
}: {
  categories: Category[];
  query?: string;
  selected?: string;
}) {
  const { lang } = useApp();
  const top = categories.filter((c) => c.parent === null);
  const categoryOptions = [
    ...top.flatMap((parent) => [
      parent,
      ...categories.filter((category) => category.parent === parent.id),
    ]),
    ...categories.filter(
      (category) =>
        category.parent !== null &&
        !top.some((parent) => parent.id === category.parent),
    ),
  ];
  const url = (id?: number) =>
    `/catalog?division=shop${id ? `&category=${id}` : ""}#shop-products`;
  return (
    <>
      <section className="shop-reference-hero shop-clean-hero">
        <div className="shop-reference-copy">
          <h1>
            <Text bn="U Shop — সব পণ্য" en="U Shop — All Products," />{" "}
            <span>
              <Text bn="এক জায়গায়" en="in one place." />
            </span>
          </h1>
          <p>
            <Text
              bn="দৈনন্দিন প্রয়োজনীয় পণ্য, ফ্যাশন, গ্যাজেট ও ঘরের সামগ্রী সরাসরি অর্ডার করুন।"
              en="Order everyday essentials, fashion, gadgets and home items directly."
            />
          </p>
          <form
            action="/catalog"
            className="shop-reference-search"
            role="search"
          >
            <input type="hidden" name="division" value="shop" />
            <select
              name="category"
              defaultValue={selected || ""}
              aria-label={
                lang === "bn" ? "পণ্যের ক্যাটাগরি" : "Product category"
              }
            >
              <option value="">
                {lang === "bn" ? "সব ক্যাটাগরি" : "All categories"}
              </option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? "— " : ""}
                  {lang === "bn" ? c.name_bn || c.name : c.name}
                </option>
              ))}
            </select>
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder={
                lang === "bn"
                  ? "আপনার পছন্দের পণ্য খুঁজুন..."
                  : "Find your favourite products..."
              }
              aria-label={
                lang === "bn" ? "পণ্য খুঁজুন" : "Search shop products"
              }
            />
            <button aria-label={lang === "bn" ? "খুঁজুন" : "Search"}>
              <Search size={22} />
            </button>
          </form>
          <div className="shop-reference-benefits">
            <Link href="/stores?division=shop">
              <BadgeCheck />
              <Text bn="ভেরিফায়েড স্টোর" en="Verified stores" />
            </Link>
            <Link href="/account">
              <Truck />
              <Text bn="দ্রুত ডেলিভারি" en="Fast delivery" />
            </Link>
            <Link href="/returns">
              <RotateCcw />
              <Text bn="সহজ রিটার্ন" en="Easy returns" />
            </Link>
            <Link href="/support">
              <Headphones />
              <Text bn="সার্বক্ষণিক সহায়তা" en="24/7 Support" />
            </Link>
          </div>
        </div>
      </section>
      <nav
        className="shop-category-rail"
        aria-label={lang === "bn" ? "শপিং ক্যাটাগরি" : "Shopping categories"}
      >
        <Link
          className={!selected ? "active" : ""}
          href={url()}
          aria-current={!selected ? "page" : undefined}
        >
          <LayoutGrid />
          <span>
            <Text bn="সব পণ্য" en="All products" />
          </span>
        </Link>
        {top.map((c) => {
          const Icon = categoryIcon(c.name);
          return (
            <Link
              key={c.id}
              href={url(c.id)}
              className={selected === String(c.id) ? "active" : ""}
              aria-current={selected === String(c.id) ? "page" : undefined}
            >
              <Icon />
              <span>{lang === "bn" ? c.name_bn || c.name : c.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
