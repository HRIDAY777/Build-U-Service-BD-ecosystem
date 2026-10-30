"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Baby,
  BadgeCheck,
  Bandage,
  ChevronRight,
  Clock3,
  Eye,
  Headphones,
  HeartPulse,
  Laptop,
  MapPin,
  Menu,
  PackageCheck,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, Offering, PageResult } from "@/lib/api";
import { offeringPhoto } from "@/lib/photos";
import { LanguageToggle } from "./language-toggle";
import { BrandLogo } from "./brand-logo";
import { Photo } from "./photo";
import { Text, useApp } from "./provider";

type Category = {
  id: number;
  division_slug: string;
  name: string;
  name_bn: string;
  parent: number | null;
};

const categoryVisuals = [
  {
    match: /all|সব/u,
    image: "/images/pharmacy/cat_all.webp",
    Icon: Pill,
  },
  {
    match: /fever|cold|জ্বর|ঠান্ডা/u,
    image: "/images/pharmacy/cat_fever.webp",
    Icon: Bandage,
  },
  {
    match: /antibiotic|অ্যান্টিবায়োটিক/u,
    image: "/images/pharmacy/cat_antibiotic.webp",
    Icon: Pill,
  },
  {
    match: /diabet|ডায়াবেট/u,
    image: "/images/pharmacy/cat_diabetes.webp",
    Icon: HeartPulse,
  },
  {
    match: /pressure|bp|রক্তচাপ/u,
    image: "/images/pharmacy/cat_bp.webp",
    Icon: HeartPulse,
  },
  {
    match: /heart|হৃদ/u,
    image: "/images/pharmacy/cat_bp.webp",
    Icon: HeartPulse,
  },
  {
    match: /gastric|গ্যাস্ট্রিক/u,
    image: "/images/pharmacy/cat_gastric.webp",
    Icon: Bandage,
  },
  {
    match: /vitamin|ভিটামিন/u,
    image: "/images/pharmacy/cat_vitamins.webp",
    Icon: Pill,
  },
  {
    match: /baby|child|শিশু|বাচ্চা/u,
    image: "/images/pharmacy/cat_baby.webp",
    Icon: Baby,
  },
  {
    match: /skin|ত্বক/u,
    image: "/images/pharmacy/cat_skincare.webp",
    Icon: Bandage,
  },
  {
    match: /eye|চোখ/u,
    image: "/images/pharmacy/cat_eyedrop.webp",
    Icon: Eye,
  },
  {
    match: /device|medical|মেডিকেল|যন্ত্র/u,
    image: "/images/pharmacy/cat_devices.webp",
    Icon: Laptop,
  },
];

function categoryVisual(category: Category) {
  const name = `${category.name} ${category.name_bn}`;
  return categoryVisuals.find((visual) => visual.match.test(name));
}

function productImage(offering: Offering) {
  const key = `${offering.slug} ${offering.name} ${offering.name_bn}`.toLowerCase();
  if (/napa|paracetamol tablet/.test(key))
    return "/images/pharmacy/item_napa.webp";
  if (/a.?to.?z|multivitamin|multivitamin/.test(key))
    return "/images/pharmacy/item_atoz.webp";
  if (/histac|antihistamine/.test(key))
    return "/images/pharmacy/item_histac.webp";
  if (/omeprazole|gastric/.test(key))
    return "/images/pharmacy/item_omeprazole.webp";
  if (/paracetamol syrup|syrup/.test(key))
    return "/images/pharmacy/item_paracetamol.webp";
  if (/vitamin.?c|vitamin c/.test(key))
    return "/images/pharmacy/item_vitaminc.webp";
  return offeringPhoto(offering) || "/images/photos/pharmacy.jpg";
}

function productLabel(offering: Offering, lang: "bn" | "en") {
  const displayName = lang === "bn" ? offering.name_bn || offering.name : offering.name;
  return displayName;
}

function PharmacyProductCard({ offering }: { offering: Offering }) {
  const { lang, add } = useApp();
  const displayName = productLabel(offering, lang);
  const displayPrice = Number(offering.current_price || offering.price);
  const productHref = `/catalog/${offering.id}`;
  const shouldChooseDetails =
    !!offering.prescription_required ||
    !!offering.variants?.length ||
    !offering.stock;

  return (
    <article className="pharmacy-product-card">
      <Link
        className="pharmacy-product-photo"
        href={productHref}
        aria-label={displayName}
      >
        <Photo src={productImage(offering)} alt={displayName} />
      </Link>
      <div className="pharmacy-product-details">
        <Link className="pharmacy-product-title" href={productHref}>
          <h3>{displayName}</h3>
        </Link>
        <p>
          {offering.prescription_required ? (
            <Text bn="প্রেসক্রিপশন প্রযোজ্য" en="Prescription may be required" />
          ) : offering.stock ? (
            <Text bn="প্যাকের বিবরণ দেখুন" en="See pack details" />
          ) : (
            <Text bn="এখন মজুত নেই" en="Currently unavailable" />
          )}
        </p>
        <strong className="pharmacy-product-price">
          ৳
          {displayPrice.toLocaleString(lang === "bn" ? "bn-BD" : "en-BD", {
            maximumFractionDigits: 2,
          })}
        </strong>
        <div className="pharmacy-product-actions">
          {shouldChooseDetails ? (
            <Link href={productHref} className="pharmacy-order-button">
              <Text
                bn={
                  offering.stock
                    ? offering.prescription_required
                      ? "প্রেসক্রিপশন দেখুন"
                      : "বিস্তারিত দেখুন"
                    : "বিস্তারিত দেখুন"
                }
                en={
                  offering.stock
                    ? offering.prescription_required
                      ? "Prescription details"
                      : "View details"
                    : "View details"
                }
              />
            </Link>
          ) : (
            <button
              type="button"
              className="pharmacy-order-button"
              onClick={() => add(offering)}
              disabled={!offering.stock}
            >
              <Text bn="অর্ডার করুন" en="Add to cart" />
            </button>
          )}
          <Link
            href={productHref}
            className="pharmacy-cart-button"
            aria-label={
              lang === "bn"
                ? `${displayName} এর বিস্তারিত`
                : `View details for ${displayName}`
            }
          >
            <ShoppingCart size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PharmacyHeader() {
  const { lang, user, cart } = useApp();
  const [open, setOpen] = useState(false);

  const nav = [
    ["/", "হোম", "Home"],
    ["/catalog", "বিভাগসমূহ", "Divisions"],
    ["/projects", "প্রকল্প", "Projects"],
    ["/events", "ইভেন্ট", "Events"],
    ["/offers", "অফার", "Offers"],
    ["/catalog?division=pharmacy", "ওষুধ", "Pharmacy"],
    ["/pages/about", "আমাদের সম্পর্কে", "About us"],
    ["/contact", "যোগাযোগ", "Contact"],
  ];

  return (
    <header className="pharmacy-header">
      <Link href="/" className="pharmacy-brand" aria-label="U Service BD">
        <BrandLogo eager />
      </Link>
      <nav
        id="pharmacy-navigation"
        className={open ? "pharmacy-nav open" : "pharmacy-nav"}
        aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}
        onClick={() => setOpen(false)}
      >
        {nav.map(([href, bn, en]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              href === "/catalog?division=pharmacy" ? "page" : undefined
            }
          >
            <Text bn={bn} en={en} />
          </Link>
        ))}
      </nav>
      <form className="pharmacy-header-search" action="/catalog" role="search">
        <input type="hidden" name="division" value="pharmacy" />
        <Search size={17} aria-hidden="true" />
        <input
          name="q"
          aria-label={lang === "bn" ? "ওষুধ খুঁজুন" : "Search medicines"}
          placeholder={
            lang === "bn" ? "ওষুধের নাম লিখুন..." : "Search medicines..."
          }
        />
      </form>
      <div className="pharmacy-header-actions">
        <LanguageToggle className="pharmacy-language" />
        <Link
          className="pharmacy-header-cart"
          href="/checkout"
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
          className="pharmacy-login"
          href={user ? "/account" : "/login"}
        >
          <UserRound size={17} />
          <Text
            bn={user ? "অ্যাকাউন্ট" : "লগইন"}
            en={user ? "Account" : "Sign in"}
          />
        </Link>
        {!user && (
          <Link className="pharmacy-register" href="/login?register=1">
            <Text bn="অ্যাকাউন্ট তৈরি" en="Create account" />
          </Link>
        )}
        <button
          type="button"
          className="pharmacy-menu-toggle"
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
          aria-controls="pharmacy-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

export function PharmacyStorefront({
  categories,
  items,
  query,
  selected,
}: {
  categories: Category[];
  items: PageResult<Offering> | null;
  query?: string;
  selected?: string;
}) {
  const { lang } = useApp();
  const [catalogItems, setCatalogItems] = useState(items);
  const [catalogCategories, setCatalogCategories] = useState(categories);
  const [catalogLoading, setCatalogLoading] = useState(!items);
  const [catalogError, setCatalogError] = useState(false);
  const categoriesTop = catalogCategories.filter(
    (category) => category.parent === null,
  );
  const products = catalogItems?.results || [];

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(false);
    const params = new URLSearchParams({ division: "pharmacy" });
    if (query) params.set("q", query);
    if (selected) params.set("category", selected);
    const requests: Promise<void>[] = [];
    if (!catalogItems) {
      requests.push(
        api<PageResult<Offering>>(`offerings/?${params}`).then(setCatalogItems),
      );
    }
    if (catalogCategories.length === 0) {
      requests.push(
        api<Category[]>("categories/?division=pharmacy").then(
          setCatalogCategories,
        ),
      );
    }
    try {
      await Promise.all(requests);
    } catch {
      setCatalogError(true);
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogCategories.length, catalogItems, query, selected]);

  useEffect(() => {
    if (!catalogItems || catalogCategories.length === 0) {
      void loadCatalog();
    }
  }, [catalogCategories.length, catalogItems, loadCatalog]);

  return (
    <div className="pharmacy-storefront">
      <section className="pharmacy-hero">
        <Photo
          src="/images/photos/pharmacy.jpg"
          alt=""
          className="pharmacy-hero-art"
          eager
        />
        <div className="pharmacy-hero-copy">
          <div className="pharmacy-breadcrumb">
            <Link href="/">
              <Text bn="হোম" en="Home" />
            </Link>
            <span>›</span>
            <Text bn="ফার্মেসি" en="Pharmacy" />
          </div>
          <span className="pharmacy-eyebrow">
            <ShieldCheck size={18} />
            <Text
              bn="আপনার পরিবারের স্বাস্থ্যের জন্য"
              en="FOR YOUR FAMILY’S HEALTH"
            />
          </span>
          <h1>
            <Text bn="আপনার পরিবারের" en="Care for" />
            <br />
            <Text bn="স্বাস্থ্যের জন্য" en="your family" />
            <br />
            <strong>
              <Text bn="বিশ্বস্ত ফার্মেসি সেবা" en="everyday health" />
            </strong>
          </h1>
          <p>
            <Text
              bn="ওষুধের তালিকা দেখুন, প্রয়োজনীয় তথ্য যাচাই করুন এবং উপলভ্যতা অনুযায়ী অর্ডার দিন।"
              en="Explore medicine listings, review important details and order based on availability."
            />
          </p>
          <form action="/catalog" className="pharmacy-hero-search">
            <input type="hidden" name="division" value="pharmacy" />
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              aria-label={lang === "bn" ? "ওষুধ খুঁজুন" : "Search medicines"}
              placeholder={
                lang === "bn"
                  ? "ওষুধের নাম লিখুন (যেমন: Napa, A to Z...)"
                  : "Search medicines (e.g. Napa, A to Z...)"
              }
            />
            <button type="submit">
              <Text bn="খুঁজুন" en="Search" />
            </button>
          </form>
          <div className="pharmacy-hero-assurances">
            <span>
              <ShieldCheck size={18} />
              <Text bn="প্রেসক্রিপশন তথ্য দেখুন" en="Review prescription details" />
            </span>
            <span>
              <Truck size={18} />
              <Text bn="ডেলিভারি অনুরোধ করুন" en="Request delivery" />
            </span>
            <span>
              <Headphones size={18} />
              <Text bn="সাপোর্ট সহায়তা" en="Support is available" />
            </span>
          </div>
        </div>
        <aside className="pharmacy-hero-benefits">
          {[
            {
              Icon: BadgeCheck,
              bn: "ওষুধের বিবরণ দেখুন",
              en: "Review medicine details",
            },
            {
              Icon: Stethoscope,
              bn: "প্রেসক্রিপশন নির্দেশনা",
              en: "Prescription guidance",
            },
            {
              Icon: Truck,
              bn: "ডেলিভারি অনুরোধ",
              en: "Delivery requests",
            },
            {
              Icon: PackageCheck,
              bn: "অর্ডার স্ট্যাটাস দেখুন",
              en: "Check order status",
            },
            {
              Icon: ShieldCheck,
              bn: "পণ্য ও মূল্য যাচাই",
              en: "Check item and price",
            },
            {
              Icon: Clock3,
              bn: "সাপোর্ট অনুরোধ দিন",
              en: "Contact support",
            },
          ].map(({ Icon, bn, en }, index) => (
            <Link
              href={
                index === 2
                  ? "/delivery"
                  : index === 3
                    ? "/account"
                    : index === 5
                      ? "/support"
                      : "#pharmacy-products"
              }
              key={en}
            >
              <Icon size={21} />
              <Text bn={bn} en={en} />
            </Link>
          ))}
        </aside>
      </section>

      <div className="pharmacy-trust-strip">
        {[
          {
            Icon: ShieldCheck,
            bn: "ওষুধের তথ্য",
            en: "Medicine details",
          },
          {
            Icon: Truck,
            bn: "ডেলিভারি অনুরোধ",
            en: "Delivery requests",
          },
          {
            Icon: BadgeCheck,
            bn: "মূল্য ও মজুত যাচাই",
            en: "Check price and stock",
          },
          {
            Icon: Headphones,
            bn: "সহায়তা পোর্টাল",
            en: "Support portal",
          },
          {
            Icon: MapPin,
            bn: "আপনার অ্যাকাউন্টে অর্ডার",
            en: "Orders in your account",
          },
        ].map(({ Icon, bn, en }, index) => (
          <Link
            href={
              index === 1
                ? "/delivery"
                : index === 3
                  ? "/support"
                  : index === 4
                    ? "/account"
                    : "#pharmacy-products"
            }
            key={en}
          >
            <Icon size={20} />
            <span>
              <strong>
                <Text bn={bn} en={en} />
              </strong>
            </span>
          </Link>
        ))}
      </div>

      <nav
        className="pharmacy-categories"
        aria-label={lang === "bn" ? "ওষুধের ক্যাটাগরি" : "Medicine categories"}
      >
        {categoriesTop.length === 0 ? (
          <Link
            className="pharmacy-categories-reference"
            href="/catalog?division=pharmacy#pharmacy-products"
            aria-label={
              lang === "bn" ? "সব ওষুধের ক্যাটাগরি দেখুন" : "Browse medicine categories"
            }
          >
            <Photo
              src="/images/pharmacy/categories_strip.webp"
              alt={
                lang === "bn"
                  ? "জ্বর ও ঠান্ডা, অ্যান্টিবায়োটিক, ডায়াবেটিস, রক্তচাপ, গ্যাস্ট্রিক, ভিটামিন, শিশু ও মা, ত্বকের যত্ন, চোখের ওষুধ এবং মেডিকেল ডিভাইস"
                  : "Medicine categories: fever and cold, antibiotics, diabetes, blood pressure, gastric care, vitamins, baby and mother, skin care, eye care, and medical devices"
              }
            />
          </Link>
        ) : (
          <>
            <Link
              className={!selected ? "active" : ""}
              href="/catalog?division=pharmacy#pharmacy-products"
            >
              <Photo src="/images/pharmacy/cat_all.webp" alt="" />
              <Text bn="সব ওষুধ" en="All medicines" />
            </Link>
            {categoriesTop.map((category) => {
              const visual = categoryVisual(category);
              const Icon = visual?.Icon || Pill;
              return (
                <Link
                  className={selected === String(category.id) ? "active" : ""}
                  key={category.id}
                  href={`/catalog?division=pharmacy&category=${category.id}#pharmacy-products`}
                >
                  {visual ? (
                    <Photo src={visual.image} alt="" />
                  ) : (
                    <Icon size={25} aria-hidden="true" />
                  )}
                  <Text
                    bn={category.name_bn || category.name}
                    en={category.name}
                  />
                </Link>
              );
            })}
            <Link href="#pharmacy-products">
              <Photo src="/images/pharmacy/cat_more.webp" alt="" />
              <Text bn="আরও" en="More" />
            </Link>
          </>
        )}
      </nav>

      <section
        className="pharmacy-promotions"
        aria-label={lang === "bn" ? "ফার্মেসি তথ্য" : "Pharmacy information"}
      >
        <Link href="#pharmacy-products">
          <Photo src="/images/pharmacy/promo2.webp" alt="" />
        </Link>
        <Link href="/support">
          <Photo src="/images/pharmacy/promo1.webp" alt="" />
        </Link>
        <Link href="#pharmacy-products">
          <Photo src="/images/pharmacy/promo3.webp" alt="" />
        </Link>
        <Link href="/support">
          <Photo src="/images/pharmacy/bottom_doctor.webp" alt="" />
        </Link>
      </section>

      <div className="pharmacy-content-grid">
        <section
          className="pharmacy-products-panel"
          id="pharmacy-products"
          aria-labelledby="pharmacy-products-title"
        >
          <div className="pharmacy-section-heading">
            <h2 id="pharmacy-products-title">
              <Text
                bn={selected ? "নির্বাচিত ক্যাটাগরির ওষুধ" : "জনপ্রিয় ওষুধ ও স্বাস্থ্য পণ্য"}
                en={selected ? "Selected category" : "Medicines & health products"}
              />
            </h2>
            <Link href="/stores?division=pharmacy">
              <Text bn="সব দেখুন" en="View all" />
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="pharmacy-products-grid">
            {products.slice(0, 6).map((offering) => (
              <PharmacyProductCard key={offering.id} offering={offering} />
            ))}
            {!products.length && (
              <div className="pharmacy-empty" role={catalogError ? "alert" : "status"}>
            <PackageCheck size={25} aria-hidden="true" />
            <p>
              <Text
                bn={
                  catalogLoading
                    ? "ওষুধের তালিকা লোড হচ্ছে..."
                    : catalogItems
                    ? "এই ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি।"
                    : "ওষুধের তালিকা এখন লোড করা যাচ্ছে না।"
                }
                en={
                  catalogLoading
                    ? "Loading medicine listings..."
                    : catalogItems
                    ? "No products are available in this category."
                    : "Medicine listings could not be loaded."
                }
              />
            </p>
            {!catalogItems && !catalogLoading && (
              <>
                <small>
                      <Text
                        bn="ইন্টারনেট সংযোগ যাচাই করে আবার চেষ্টা করুন।"
                        en="Check your connection and try again."
                      />
                    </small>
                    <button
                      type="button"
                      onClick={() => void loadCatalog()}
                      className="pharmacy-retry-button"
                    >
                      <RefreshCw size={14} />
                      <Text bn="আবার চেষ্টা করুন" en="Try again" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="pharmacy-services-panel">
          <div className="pharmacy-section-heading">
            <h2>
              <Text bn="স্বাস্থ্য সেবা ও পরামর্শ" en="Health services & help" />
            </h2>
            <Link href="/support">
              <Text bn="সাহায্য" en="Help" />
            </Link>
          </div>
          <div className="pharmacy-service-links">
            {[
              {
                Icon: Stethoscope,
                bn: "প্রেসক্রিপশন নির্দেশনা",
                en: "Prescription guidance",
                href: "/support",
              },
              {
                Icon: BadgeCheck,
                bn: "ওষুধের বিবরণ যাচাই",
                en: "Review medicine details",
                href: "#pharmacy-products",
              },
              {
                Icon: PackageCheck,
                bn: "অর্ডারের তথ্য",
                en: "Order information",
                href: "/account",
              },
              {
                Icon: HeartPulse,
                bn: "স্বাস্থ্য-সম্পর্কিত সহায়তা",
                en: "Health-related support",
                href: "/support",
              },
              {
                Icon: Truck,
                bn: "ডেলিভারি অনুরোধ",
                en: "Delivery request",
                href: "/delivery",
              },
              {
                Icon: HeartPulse,
                bn: "নারী স্বাস্থ্য পণ্য",
                en: "Women’s health",
                href: `/catalog?division=pharmacy&category=${
                  categoriesTop.find((category) =>
                    /women|নারী/u.test(`${category.name} ${category.name_bn}`),
                  )?.id || ""
                }#pharmacy-products`,
              },
            ].map(({ Icon, bn, en, href }) => (
              <Link href={href} key={en}>
                <Icon size={17} />
                <Text bn={bn} en={en} />
                <ChevronRight size={15} />
              </Link>
            ))}
          </div>
        </aside>

        <aside className="pharmacy-doctor-card">
          <Photo
            src="/images/pharmacy/doc_banner.webp"
            alt=""
            className="pharmacy-doctor-image"
          />
          <div>
            <span>
              <Text bn="স্বাস্থ্য বিষয়ক তথ্য" en="Health information" />
            </span>
            <h2>
              <Text
                bn="ওষুধের ব্যবহার নিয়ে প্রশ্ন?"
                en="Questions about a medicine?"
              />
            </h2>
            <p>
              <Text
                bn="ব্যবহারের আগে পণ্যের নির্দেশনা ও প্রেসক্রিপশন যাচাই করুন।"
                en="Review the product instructions and prescription before use."
              />
            </p>
            <Link href="/support">
              <Text bn="সহায়তা দেখুন" en="Get support" />
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>

      <section className="pharmacy-how-strip">
        <div>
          <ShieldCheck size={25} />
          <span>
            <strong>
              <Text bn="পণ্যের তথ্য দেখুন" en="Review product details" />
            </strong>
            <small>
              <Text bn="অর্ডারের আগে যাচাই করুন" en="Check before ordering" />
            </small>
          </span>
        </div>
        <div>
          <ShoppingCart size={25} />
          <span>
            <strong>
              <Text bn="পণ্য বেছে নিন" en="Choose products" />
            </strong>
            <small>
              <Text bn="কার্টে যোগ করুন" en="Add items to your cart" />
            </small>
          </span>
        </div>
        <div>
          <PackageCheck size={25} />
          <span>
            <strong>
              <Text bn="অর্ডার যাচাই করুন" en="Review your order" />
            </strong>
            <small>
              <Text bn="চেকআউটে বিবরণ নিশ্চিত করুন" en="Confirm details at checkout" />
            </small>
          </span>
        </div>
        <Link href="/delivery">
          <Truck size={25} />
          <span>
            <strong>
              <Text bn="ডেলিভারি অনুরোধ" en="Delivery request" />
            </strong>
            <small>
              <Text bn="উপলভ্য এলাকায়" en="In available areas" />
            </small>
          </span>
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
