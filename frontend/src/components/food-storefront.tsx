"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Search,
  ShoppingCart,
  UserRound,
  Menu,
  Bike,
  ShieldCheck,
  UtensilsCrossed,
  BadgePercent,
  Headphones,
  MapPin,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { LanguageToggle } from "./language-toggle";
import { Text, useApp } from "./provider";
import { Photo } from "./photo";
import { LocalityInput } from "./location-picker";
import { Restaurant } from "./restaurant-info";
import { Offering } from "@/lib/api";
import { offeringPhoto } from "@/lib/photos";
import "@/app/food-reference.css";
type Category = {
  id: number;
  name: string;
  name_bn: string;
  parent: number | null;
};
const foodIcon = (name: string) =>
  /drink|beverage|juice/i.test(name)
    ? "🥤"
    : /pizza/i.test(name)
      ? "🍕"
      : /burger|fast/i.test(name)
        ? "🍔"
        : /sweet|dessert/i.test(name)
          ? "🍮"
          : /rice|biryani/i.test(name)
            ? "🍛"
            : /veget|salad|healthy/i.test(name)
              ? "🥗"
              : /kebab|grill/i.test(name)
                ? "🍢"
                : /chinese|noodle/i.test(name)
                  ? "🍜"
                  : "🍲";
export function FoodStorefront({
  categories,
  restaurants,
  items,
  query,
  selected,
}: {
  categories: Category[];
  restaurants: Restaurant[] | null;
  items: Offering[];
  query?: string;
  selected?: string;
}) {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);
  const deals = items
    .filter(
      (o) =>
        Number(o.current_price) > 0 &&
        Number(o.current_price) < Number(o.price),
    )
    .slice(0, 2);
  const picks = deals.length ? deals : items.slice(0, 2);
  return (
    <>
      <header className="food-nav">
        <Link href="/" className="food-brand">
          <BrandLogo eager animated />
        </Link>
        <nav
          className={open ? "open" : ""}
          id="food-navigation"
          aria-label={lang === "bn" ? "খাবারের মেনু" : "Food navigation"}
          onClick={() => setOpen(false)}
        >
          {[
            ["/", "হোম", "Home"],
            ["/catalog", "বিভাগসমূহ", "Divisions"],
            ["/projects", "প্রকল্প", "Projects"],
            ["/events", "ইভেন্ট", "Events"],
            ["/offers", "অফার", "Offers"],
            ["/catalog?division=food", "খাবার", "Food"],
            ["/stores?division=food", "রেস্টুরেন্ট", "Restaurants"],
            ["/pages/about", "আমাদের সম্পর্কে", "About us"],
            ["/contact", "যোগাযোগ", "Contact"],
          ].map(([href, bn, en]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                href === "/catalog?division=food" ? "page" : undefined
              }
            >
              <Text bn={bn} en={en} />
            </Link>
          ))}
        </nav>
        <form action="/catalog" className="food-header-search">
          <input type="hidden" name="division" value="food" />
          <input
            name="q"
            aria-label={lang === "bn" ? "খাবার খুঁজুন" : "Search food"}
            placeholder={
              lang === "bn"
                ? "আপনার পছন্দের খাবার খুঁজুন..."
                : "Find your favourite food..."
            }
          />
          <button aria-label={lang === "bn" ? "খুঁজুন" : "Search"}>
            <Search size={20} />
          </button>
        </form>
        <Link
          href="/checkout"
          className="food-cart"
          aria-label={lang === "bn" ? "কার্ট" : "Cart"}
        >
          <ShoppingCart />
          <sup>{cart.reduce((n, c) => n + c.quantity, 0)}</sup>
        </Link>
        <LanguageToggle className="food-language" />
        <Link className="food-login" href={user ? "/account" : "/login"}>
          <UserRound />
          <Text
            bn={user ? "অ্যাকাউন্ট" : "লগইন"}
            en={user ? "Account" : "Login"}
          />
        </Link>
        <Link className="food-register" href="/login?register=1">
          <Text bn="একাউন্ট তৈরি" en="Create account" />
        </Link>
        <button
          className="food-menu"
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
          aria-controls="food-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <section className="food-hero">
        <div
          className="food-hero-art"
          role="img"
          aria-label={
            lang === "bn"
              ? "খাবার বাছাই করছেন একজন গ্রাহক, ডেলিভারি রাইডার ও বিরিয়ানি"
              : "A customer choosing food, a delivery rider and biryani"
          }
        />
        <div className="food-hero-copy">
          <div className="food-crumb">
            <Link href="/">
              <Text bn="হোম" en="Home" />
            </Link>{" "}
            › <Text bn="খাবার" en="Food" />
          </div>
          <h1>
            <Text bn="আপনার পছন্দের" en="Your favourite meals," />
            <br />
            <em>
              <Text bn="সেরা খাবার এখন ঘরে" en="delivered to your door" />
            </em>
          </h1>
          <p>
            <Text
              bn="প্রিয় রেস্টুরেন্টের সুস্বাদু খাবার অর্ডার করুন সহজে —"
              en="Discover delicious food from your favourite restaurants —"
            />{" "}
            <strong>U Service BD</strong>
            <Text bn=" এর সাথে।" en=" brings it together." />
          </p>
          <div className="food-search-bar">
            <form action="/stores" className="food-area-search">
              <input type="hidden" name="division" value="food" />
              <MapPin size={21} />
              <label>
                <span className="sr-only">
                  <Text bn="এলাকা" en="Area" />
                </span>
                <LocalityInput name="area" />
              </label>
              <button
                aria-label={
                  lang === "bn"
                    ? "এলাকার রেস্টুরেন্ট দেখুন"
                    : "Find nearby restaurants"
                }
              >
                <ArrowRight size={18} />
              </button>
            </form>
            <form action="/catalog" className="food-meal-search">
              <input type="hidden" name="division" value="food" />
              <input
                name="q"
                defaultValue={query}
                aria-label={lang === "bn" ? "খাবারের নাম" : "Food name"}
                placeholder={
                  lang === "bn"
                    ? "পছন্দের খাবার খুঁজুন..."
                    : "Search your favourite food..."
                }
              />
              <button
                aria-label={lang === "bn" ? "খাবার খুঁজুন" : "Search meals"}
              >
                <Search />
              </button>
            </form>
          </div>
        </div>
      </section>
      <nav
        className="food-categories"
        aria-label={lang === "bn" ? "খাবারের ক্যাটাগরি" : "Food categories"}
      >
        <Link
          className={!selected ? "active" : ""}
          href="/catalog?division=food#food-results"
        >
          <span>🍲</span>
          <Text bn="সব খাবার" en="All food" />
        </Link>
        {categories
          .filter((c) => c.parent === null)
          .map((c) => (
            <Link
              className={selected === String(c.id) ? "active" : ""}
              key={c.id}
              href={`/catalog?division=food&category=${c.id}#food-results`}
            >
              <span>{foodIcon(c.name)}</span>
              <Text bn={c.name_bn || c.name} en={c.name} />
            </Link>
          ))}
        <Link href="#food-results">
          <span>•••</span>
          <Text bn="আরও" en="More" />
        </Link>
      </nav>
      <div className="food-discovery">
        <section className="food-assurances">
          {[
            {
              I: Bike,
              bn: "ডেলিভারি",
              en: "Delivery",
              sub: "আপনার ঠিকানায়",
              suben: "To your address",
              href: "/delivery",
            },
            {
              I: ShieldCheck,
              bn: "অর্ডার যাচাই",
              en: "Order review",
              sub: "নিশ্চিত করে অর্ডার করুন",
              suben: "Check before confirming",
              href: "/checkout",
            },
            {
              I: UtensilsCrossed,
              bn: "রেস্টুরেন্ট",
              en: "Restaurants",
              sub: "মেনু দেখে বাছুন",
              suben: "Explore their menus",
              href: "/stores?division=food",
            },
            {
              I: BadgePercent,
              bn: "খাবারের অফার",
              en: "Food offers",
              sub: "বর্তমান মূল্য দেখুন",
              suben: "See current prices",
              href: "#food-offers",
            },
            {
              I: Headphones,
              bn: "সহায়তা",
              en: "Support",
              sub: "আমরা পাশে আছি",
              suben: "We are here to help",
              href: "/support",
            },
          ].map(({ I, bn, en, sub, suben, href }) => (
            <Link key={en} href={href}>
              <I />
              <div>
                <strong>
                  <Text bn={bn} en={en} />
                </strong>
                <small>
                  <Text bn={sub} en={suben} />
                </small>
              </div>
            </Link>
          ))}
        </section>
        <Link className="food-promo" href="#food-results">
          <div>
            <h2>
              <Text bn="আজকের পছন্দের খাবার" en="Find your next favourite" />
            </h2>
            <span>
              <Text bn="এখনই মেনু দেখুন →" en="Explore the menu →" />
            </span>
          </div>
          <Photo src="/images/photos/food.jpg" alt="Biryani meal" />
        </Link>
        <section className="food-restaurants">
          <div className="food-section-heading">
            <h2>
              <Text bn="আপনার জন্য" en="Discover" />{" "}
              <em>
                <Text bn="রেস্টুরেন্ট" en="restaurants" />
              </em>
            </h2>
            <Link href="/stores?division=food">
              <Text bn="সব দেখুন →" en="View all →" />
            </Link>
          </div>
          <div className="food-restaurant-grid">
            {restaurants?.slice(0, 4).map((r, i) => {
              const item = items.find((o) => o.organization === r.id);
              return (
                <Link
                  className="food-restaurant-card"
                  key={r.id}
                  href={`/catalog?division=food&organization=${r.id}#food-results`}
                >
                  <div className={`food-restaurant-image food-image-${i}`}>
                    <Photo
                      src={
                        (item && offeringPhoto(item)) ||
                        "/images/photos/food.jpg"
                      }
                      alt={
                        lang === "bn"
                          ? "খাবারের দৃষ্টান্তমূলক ছবি"
                          : "Illustrative food photo"
                      }
                    />
                  </div>
                  <div>
                    <h3>{r.name}</h3>
                    <p>
                      <UtensilsCrossed size={14} />
                      <Text bn="মেনু ও খাবারের তালিকা" en="Explore the menu" />
                    </p>
                    <small>
                      <Clock size={14} />
                      {r.preparation_minutes}{" "}
                      <Text bn="মিনিট প্রস্তুতি" en="min preparation" />
                    </small>
                    <span className="food-card-arrow">
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {!restaurants?.length && (
            <p className="food-empty">
              <Text
                bn={
                  restaurants
                    ? "এখনও কোনো রেস্টুরেন্ট তালিকাভুক্ত নেই।"
                    : "রেস্টুরেন্টের তালিকা এখন পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।"
                }
                en={
                  restaurants
                    ? "No restaurants are listed yet."
                    : "Restaurant listings are temporarily unavailable. Please try again."
                }
              />
            </p>
          )}
        </section>
        <aside className="food-offers" id="food-offers">
          <div className="food-section-heading">
            <h2>
              <Text
                bn={deals.length ? "আজকের বিশেষ অফার" : "আজকের খাবার"}
                en={deals.length ? "Today's offers" : "On the menu"}
              />
            </h2>
          </div>
          {picks.map((o) => (
            <Link
              className="food-offer-card"
              key={o.id}
              href={`/catalog/${o.id}`}
            >
              <Photo
                src={offeringPhoto(o) || "/images/photos/food.jpg"}
                alt={lang === "bn" ? o.name_bn || o.name : o.name}
              />
              <div>
                <h3>
                  <Text bn={o.name_bn || o.name} en={o.name} />
                </h3>
                <strong>
                  ৳
                  {Number(o.current_price).toLocaleString(
                    lang === "bn" ? "bn-BD" : "en-US",
                  )}
                </strong>
                <span>
                  <Text bn="বিস্তারিত দেখুন →" en="View details →" />
                </span>
              </div>
            </Link>
          ))}
          {!picks.length && (
            <p>
              <Text
                bn="খাবারের তালিকা শীঘ্রই দেখানো হবে।"
                en="Food listings will appear here when available."
              />
            </p>
          )}
        </aside>
      </div>
      <div className="food-how" id="food-how">
        <Text bn="খাবার বাছুন" en="Choose a meal" />
        <ArrowRight />
        <Text
          bn="ঠিকানা ও অর্ডার যাচাই করুন"
          en="Review your address and order"
        />
        <ArrowRight />
        <Text
          bn="অ্যাকাউন্টে অগ্রগতি দেখুন"
          en="Follow progress in your account"
        />
      </div>
    </>
  );
}
