"use client";
import {
  TranslatedInput,
  TranslatedButton,
} from "@/components/translated-elements";

import { UiText } from "@/components/ui-text";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  Zap,
  Wrench,
  Truck,
  House,
  ShieldCheck,
  Layers,
  HeartHandshake,
  Check,
  Plus,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Division, Offering } from "@/lib/api";
import { useApp, Text } from "./provider";
import { OfferingCard } from "./offering-card";
import { Photo } from "./photo";
import { divisionPhotos } from "@/lib/photos";
import { DistrictGallery } from "./district-photo";
import { BrandLogo } from "./brand-logo";
export const divisionIcons: Record<string, typeof Truck> = {
  food: UtensilsCrossed,
  pharmacy: Pill,
  shop: ShoppingBag,
  electrician: Zap,
  mechanic: Wrench,
  services: House,
  delivery: Truck,
};
export function Home({
  divisions,
  offerings,
  faqs,
  online,
  businesses,
}: {
  divisions: Division[];
  offerings: Offering[];
  faqs: {
    id: number;
    question: string;
    question_bn: string;
    answer: string;
    answer_bn: string;
  }[];
  online: boolean;
  businesses: {
    id: number;
    name: string;
    address: string;
    area: string;
    division_slug: string;
  }[];
}) {
  const { lang } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  function search(e: FormEvent) {
    e.preventDefault();
    router.push(`/catalog?q=${encodeURIComponent(query)}`);
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" />
            <Text
              bn="আপনার জীবন, আরও সহজ"
              en="A LITTLE HELP. A BETTER EVERYDAY."
            />
          </div>
          <h1>
            <Text bn="প্রতিদিনের সব প্রয়োজনে," en="Life happens." />
            <br />
            <span>
              <Text bn="আপনার পাশে।" en="We’re here for it." />
            </span>
          </h1>
          <p>
            <Text
              bn="পছন্দের খাবার থেকে ঘরের যত্ন — বিশ্বস্ত সেবা এখন এক জায়গায়। আপনার সময় থাকুক আপনার জন্য।"
              en="From your favourite meal to a happier home. Find the services you need, with people you can count on."
            />
          </p>
          <form className="hero-search" onSubmit={search}>
            <Search size={22} />
            <TranslatedInput
              aria-label="Search services"
              placeholder={
                lang === "bn"
                  ? "কী সেবা খুঁজছেন?"
                  : "What can we help you with?"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <TranslatedButton type="submit" aria-label="Search">
              <ArrowRight size={22} />
            </TranslatedButton>
          </form>
          <div className="hero-tags">
            <span>
              <Text bn="জনপ্রিয়:" en="TRY:" />
            </span>
            <Link href="/catalog?division=food">
              <Text bn="খাবার" en="Food delivery" />
            </Link>
            <Link href="/catalog?division=electrician">
              <Text bn="ইলেকট্রিশিয়ান" en="Electrician" />
            </Link>
            <Link href="/catalog?division=services">
              <Text bn="বাসার যত্ন" en="Home care" />
            </Link>
          </div>
          <div className="hero-proof">
            <span className="proof-icon">
              <ShieldCheck size={20} />
            </span>
            <span>
              <Text
                bn="একটি অ্যাকাউন্ট, সব সেবায় সংযুক্ত"
                en="One account. Every part of your day."
              />
              <small>
                <Text
                  bn="সহজ অর্ডার · স্পষ্ট মূল্য · সেবার আপডেট"
                  en="Easy ordering · Clear pricing · Status updates"
                />
              </small>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-caption">
            <span className="status-dot" />
            <UiText text={"MADE FOR YOUR EVERYDAY"} />
          </div>
          <div className="hero-mosaic">
            <Photo
              src={divisionPhotos.food}
              alt="বাংলাদেশের খাবার / Bangladeshi food"
              eager
            />
            <Photo
              src={divisionPhotos.services}
              alt="ঘরের যত্ন / Home cleaning"
            />
            <Photo
              src={divisionPhotos.shop}
              alt="কটন ব্যাগ / Cotton tote bag"
            />
            <span className="mosaic-stamp">
              <UiText text={"প্রতিদিনের গল্প"} />
              <br />
              <strong>
                <UiText text={"এক জায়গায়।"} />
              </strong>
            </span>
          </div>
          <div className="floating-card food-float">
            <span className="float-icon peach">
              <UtensilsCrossed size={23} />
            </span>
            <div>
              <strong>
                <Text bn="মনভরা খাবার" en="Good food, good mood" />
              </strong>
              <small>
                <Text
                  bn="আপনার পছন্দ, আপনার দরজায়"
                  en="Your favourites, at your door"
                />
              </small>
            </div>
          </div>
          <div className="floating-card home-float">
            <span className="float-icon mint">
              <Check size={24} />
            </span>
            <div>
              <strong>
                <Text bn="ঘরের যত্নে আমরা" en="Home, taken care of" />
              </strong>
              <small>
                <Text
                  bn="দৈনন্দিন কাজে বিশ্বস্ত সঙ্গী"
                  en="A helping hand you can trust"
                />
              </small>
            </div>
          </div>
          <span className="art-spark">✳</span>
        </div>
      </section>
      <section className="division-strip" aria-label="Business divisions">
        {divisions.map((d) => {
          const Icon = divisionIcons[d.slug] || House;
          return (
            <Link
              key={d.id}
              href={
                d.kind === "delivery"
                  ? "/delivery"
                  : d.slug === "mechanic"
                    ? "/mechanic"
                    : `/catalog?division=${d.slug}`
              }
            >
              <span className={`division-icon ${d.slug}`}>
                <Icon size={25} />
              </span>
              <span>{lang === "bn" ? d.name_bn : d.name}</span>
              <ArrowUpRight size={15} />
            </Link>
          );
        })}
      </section>
      {!online && (
        <div className="notice">
          <UiText
            text={
              "সার্ভারের সাথে সংযোগ পাওয়া যায়নি। / The service is temporarily unavailable. Please try again shortly."
            }
          />
        </div>
      )}
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <Text
                bn="এক প্ল্যাটফর্ম, অনেক সম্ভাবনা"
                en="ONE U. MANY POSSIBILITIES."
              />
            </span>
            <h2>
              <Text
                bn="আপনার দিনের প্রতিটি অংশে"
                en="For every part of your day"
              />
            </h2>
          </div>
          <p>
            <Text
              bn="বড় কাজ হোক বা ছোট প্রয়োজন — শুরু হোক এখান থেকেই।"
              en="The big jobs. The little things. A simpler way to get them done."
            />
          </p>
        </div>
        <div className="division-grid">
          {divisions.map((d, i) => {
            const Icon = divisionIcons[d.slug] || House;
            return (
              <Link
                className={`division-card card-${d.slug}`}
                href={
                  d.kind === "delivery"
                    ? "/delivery"
                    : d.slug === "mechanic"
                      ? "/mechanic"
                      : `/catalog?division=${d.slug}`
                }
                key={d.id}
              >
                <div className="card-topline">
                  <span>0{i + 1}</span>
                  <ArrowUpRight size={23} />
                </div>
                <div className="division-illustration">
                  {divisionPhotos[d.slug] ? (
                    <Photo
                      src={divisionPhotos[d.slug]}
                      alt={lang === "bn" ? d.name_bn : d.name}
                    />
                  ) : (
                    <Icon strokeWidth={1.1} />
                  )}
                </div>
                <div>
                  <h3>{lang === "bn" ? d.name_bn : d.name}</h3>
                  <p>{lang === "bn" ? d.description_bn : d.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="occasion-feature section">
        <div className="occasion-photo">
          <Photo
            src="/images/photos/wedding.jpg"
            alt="বাংলাদেশের একটি বিয়ের অনুষ্ঠান / Wedding ceremony in Bangladesh"
          />
          <span className="photo-demo-label">
            <UiText text={"পরিকল্পনার অনুপ্রেরণা · স্টক ছবি"} />
          </span>
        </div>
        <div className="occasion-copy">
          <span className="eyebrow">
            <UiText text={"U EVENTS · YOUR SPECIAL DAYS"} />
          </span>
          <h2>
            <Text
              bn="আপনার গল্পের সবচেয়ে সুন্দর দিন।"
              en="A day that feels entirely yours."
            />
          </h2>
          <p>
            <Text
              bn="বিয়ে, গায়ে হলুদ কিংবা পরিবারের আনন্দ আয়োজন—ভেন্যু, সাজসজ্জা ও খাবারের পরিকল্পনা শুরু হোক আপনার ইচ্ছা থেকে।"
              en="Weddings, celebrations and family gatherings. Plan the venue, decor and catering around your story."
            />
          </p>
          <Link className="button" href="/events">
            <Text bn="অনুষ্ঠানের পরিকল্পনা করুন" en="Plan your celebration" />
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      {businesses.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                <UiText text={"LOCAL BUSINESSES. EVERYDAY CARE."} />
              </span>
              <h2>
                <Text
                  bn="আপনার কাজের জন্য, পরিচিত মুখ।"
                  en="Find the right people for your day."
                />
              </h2>
            </div>
            <Link className="text-link" href="/stores">
              <Text bn="সব প্রতিষ্ঠান দেখুন" en="Meet the businesses" />
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="provider-grid">
            {businesses.slice(0, 3).map((business) => (
              <Link
                className="provider-preview"
                href={`/catalog?organization=${business.id}`}
                key={business.id}
              >
                <div className="provider-photo">
                  <Photo
                    src={divisionPhotos[business.division_slug] || ""}
                    alt={`${business.name} — ${lang === "bn" ? "সেবার দৃষ্টান্তমূলক ছবি" : "illustrative service photo"}`}
                  />
                  <span className="photo-demo-label">
                    <UiText text={"স্টক ছবি · ডেমো প্রিভিউ"} />
                  </span>
                </div>
                <div>
                  <h3>{business.name}</h3>
                  <p>
                    <MapPin size={14} /> {business.area}
                  </p>
                  <small>
                    <UiText text={business.address} />
                  </small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <DistrictGallery />
      <section className="story-band">
        <BrandLogo className="story-company-logo" />
        <div>
          <span className="eyebrow">
            <Text bn="আমাদের প্রতিশ্রুতি" en="MORE THAN A SERVICE" />
          </span>
          <h2>
            <Text
              bn="আপনার সময় মূল্যবান।\nআমরা সেটা বুঝি।"
              en="More time for what matters."
            />
          </h2>
          <p>
            <Text
              bn="U Service BD দৈনন্দিন প্রয়োজনকে একসাথে যুক্ত করে। সহজ প্রযুক্তি আর মানুষের যত্নে গড়ে উঠুক আপনার আরও সুন্দর দিন।"
              en="We’re connecting everyday needs across Bangladesh. Thoughtful technology, real people, and a shared belief that life can be a little easier."
            />
          </p>
          <Link href="/pages/about" className="text-link">
            <Text bn="আমাদের গল্প জানুন" en="Get to know us" />
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="story-values">
          <span>
            <ShieldCheck />
            <Text bn="বিশ্বাসের সাথে সেবা" en="Care you can count on" />
          </span>
          <span>
            <Layers />
            <Text bn="সব সেবা একই অ্যাকাউন্টে" en="Your world, connected" />
          </span>
          <span>
            <HeartHandshake />
            <Text bn="স্থানীয় মানুষের পাশে" en="Growing with local people" />
          </span>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <Text
                bn="খুঁজে নিন আপনার প্রয়োজন"
                en="A FEW EVERYDAY ESSENTIALS"
              />
            </span>
            <h2>
              <Text bn="আজ কী প্রয়োজন আপনার?" en="What’s on your list today?" />
            </h2>
          </div>
          <Link href="/catalog" className="text-link">
            <Text bn="সব দেখুন" en="Explore everything" />
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="offering-grid">
          {offerings.slice(0, 4).map((o) => (
            <OfferingCard key={o.id} offering={o} />
          ))}
        </div>
        <p className="demo-note">
          <Text
            bn="স্থানীয় ডেমো পরিবেশ: তালিকাভুক্ত পণ্য, ব্যবসা ও মূল্য উদাহরণ হিসেবে দেওয়া।"
            en="Local demonstration: catalog items, businesses and prices are sample data."
          />
        </p>
      </section>
      <section className="steps-section section" id="how-it-works">
        <span className="eyebrow">
          <Text bn="সহজ, শুরু থেকে শেষ" en="LESS EFFORT. MORE EVERYDAY." />
        </span>
        <h2>
          <Text bn="মাত্র তিনটি ধাপ" en="You’re three steps away" />
        </h2>
        <div className="steps-grid">
          {[
            [
              "আপনার সেবা বেছে নিন",
              "Find your everyday",
              "খাবার, পণ্য কিংবা ঘরের কাজ — প্রয়োজন অনুযায়ী বেছে নিন।",
              "Browse food, essentials and services in one place.",
            ],
            [
              "ঠিকানা ও সময় জানান",
              "Make it yours",
              "কোথায় আর কখন দরকার, সেটুকু জানান আমাদের।",
              "Tell us where you are and when you need us.",
            ],
            [
              "বাকিটা আমাদের সাথে",
              "Get on with your day",
              "আপনার অ্যাকাউন্টেই দেখুন অর্ডার ও সেবার আপডেট।",
              "Follow progress and find support in your account.",
            ],
          ].map((s, i) => (
            <div className="step" key={s[0]}>
              <span>0{i + 1}</span>
              <h3>{s[lang === "bn" ? 0 : 1]}</h3>
              <p>{s[lang === "bn" ? 2 : 3]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="partner-banner">
        <div>
          <span className="eyebrow">
            <Text bn="একসাথে, আরও দূরে" en="LET’S BUILD SOMETHING TOGETHER" />
          </span>
          <h2>
            <Text
              bn="আপনার দক্ষতা।\nআমাদের সাথে নতুন সম্ভাবনা।"
              en="Local talent.\nBigger possibilities."
            />
          </h2>
          <p>
            <Text
              bn="ব্যবসা, পেশাগত দক্ষতা কিংবা ডেলিভারি — আমাদের সাথে যুক্ত হোন।"
              en="Bring your business, your skills, or your drive. Let’s grow together."
            />
          </p>
          <Link href="/contact?interest=partner" className="button white">
            <Text bn="আমাদের সাথে যুক্ত হোন" en="Become a partner" />
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="partner-art">
          <House size={100} strokeWidth={1} />
          <span className="partner-company-logo">
            <BrandLogo />
          </span>
          <HeartHandshake size={80} strokeWidth={1} />
        </div>
      </section>
      <section className="section faq-section">
        <div>
          <span className="eyebrow">
            <Text bn="জানতে চান?" en="A LITTLE CLARITY" />
          </span>
          <h2>
            <Text
              bn="আপনার প্রশ্ন,\nআমাদের উত্তর।"
              en="Good questions.\nClear answers."
            />
          </h2>
          <Link href="/contact" className="text-link">
            <Text bn="আরও সাহায্য প্রয়োজন?" en="Need a hand?" />
            <ArrowUpRight size={18} />
          </Link>
          <p className="location">
            <MapPin size={17} />
            <Text
              bn="এলাকাভিত্তিক সেবা উপলব্ধ"
              en="Availability depends on your area"
            />
          </p>
        </div>
        <div className="faqs">
          {faqs.map((f) => (
            <details key={f.id}>
              <summary>
                {lang === "bn" ? f.question_bn : f.question}
                <Plus size={18} />
              </summary>
              <p>{lang === "bn" ? f.answer_bn : f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
