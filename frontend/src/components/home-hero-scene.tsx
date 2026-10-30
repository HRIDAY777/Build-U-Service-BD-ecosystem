"use client";

import Link from "next/link";
import Image from "next/image";
import {
  House,
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  Wrench,
  Zap,
  Truck,
  MapPin,
  Search,
  LayoutGrid,
  ClipboardList,
  Bell,
  User,
} from "lucide-react";
import { Text, useApp } from "./provider";

interface ServiceItem {
  slug: string;
  bn: string;
  en: string;
  icon: typeof UtensilsCrossed;
  color: string;
  style: React.CSSProperties;
}

const services: ServiceItem[] = [
  {
    slug: "food",
    bn: "খাবার",
    en: "Food",
    icon: UtensilsCrossed,
    color: "#ed8c00",
    style: { top: "10.8%", left: "13%", width: "12.5%", height: "19%" },
  },
  {
    slug: "delivery",
    bn: "ডেলিভারি",
    en: "Delivery",
    icon: Truck,
    color: "#9827d4",
    style: { top: "35.2%", left: "7.6%", width: "14.3%", height: "21.7%" },
  },
  {
    slug: "mechanic",
    bn: "মেকানিক",
    en: "Mechanic",
    icon: Wrench,
    color: "#2866d8",
    style: { top: "63.7%", left: "5.8%", width: "15.2%", height: "21.7%" },
  },
  {
    slug: "pharmacy",
    bn: "ওষুধ",
    en: "Pharmacy",
    icon: Pill,
    color: "#078dbb",
    style: { top: "5.4%", left: "71.2%", width: "18.8%", height: "21.7%" },
  },
  {
    slug: "shop",
    bn: "শপিং",
    en: "Shopping",
    icon: ShoppingBag,
    color: "#e62291",
    style: { top: "28.5%", left: "78.3%", width: "16.1%", height: "21.7%" },
  },
  {
    slug: "electrician",
    bn: "ইলেকট্রিশিয়ান",
    en: "Electrician",
    icon: Zap,
    color: "#ef9b00",
    style: { top: "50.1%", left: "80.1%", width: "16.1%", height: "21.7%" },
  },
  {
    slug: "services",
    bn: "হোম সার্ভিস",
    en: "Home care",
    icon: House,
    color: "#08a877",
    style: { top: "71.8%", left: "80.1%", width: "16.1%", height: "21.7%" },
  },
];

const route = (slug: string) =>
  slug === "delivery"
    ? "/delivery"
    : slug === "mechanic"
      ? "/mechanic"
      : `/catalog?division=${slug}`;

export function HomeHeroScene() {
  const { lang } = useApp();
  return (
    <div className="home-phone-scene" aria-label={lang === "bn" ? "ইউ সার্ভিস প্ল্যাটফর্ম ও সেবা" : "U Service platform and services"}>
      {/* Master 3D artwork containing the metallic phone, smiling woman, 7 service photo cards, and 3D ribbons */}
      <div className="home-scene-art-wrap">
        <Image
          src="/images/photos/home-hero-art.webp"
          alt={
            lang === "bn"
              ? "ইউ সার্ভিস অ্যাপ, ডেলিভারি, মেকানিক, খাবার, ওষুধ ও হোম সার্ভিস"
              : "U Service mobile app, food delivery, doctor, pharmacy, mechanic and home care"
          }
          width={1117}
          height={738}
          priority
          className="home-scene-art-img"
          unoptimized
        />

        {/* Interactive clickable hotspot overlays for the 7 floating cards */}
        {services.map(({ slug, bn, en, style }) => (
          <Link
            key={slug}
            href={route(slug)}
            className={`scene-hotspot scene-hotspot-${slug}`}
            style={style}
            aria-label={lang === "bn" ? `${bn} সেবা দেখুন` : `Explore ${en} services`}
            title={lang === "bn" ? bn : en}
          >
            <span className="hotspot-highlight" />
          </Link>
        ))}

        {/* Interactive hotspot over the central phone */}
        <Link
          href="/catalog"
          className="scene-hotspot scene-hotspot-phone"
          style={{ top: "1.4%", left: "21%", width: "34%", height: "95.5%" }}
          aria-label={lang === "bn" ? "ইউ সার্ভিস অ্যাপ সেবাগুলো খুঁজুন" : "Explore U Service App"}
          title={lang === "bn" ? "ইউ সার্ভিস অ্যাপ" : "U Service App"}
        >
          <span className="hotspot-highlight phone-highlight" />
        </Link>
      </div>

      {/* Semantic accessible representation for screen readers, keyboard users, and automated test suites */}
      <div className="home-demo-phone sr-interactive-wrap" aria-hidden="false">
        <div className="phone-island" aria-hidden="true" />
        <span className="phone-location">
          <MapPin size={13} />
          <Text bn="ঢাকা, বাংলাদেশ" en="Dhaka, Bangladesh" />
        </span>
        <Link href="/catalog" className="phone-search">
          <Search size={14} />
          <Text
            bn="আপনার প্রয়োজনীয় সেবা খুঁজুন"
            en="Find your everyday service"
          />
        </Link>
        <div className="phone-services">
          {services.map(({ slug, bn, en, icon: Icon, color }) => (
            <Link key={slug} href={route(slug)} style={{ color }}>
              <Icon size={29} strokeWidth={2.3} />
              <span>{lang === "bn" ? bn : en}</span>
            </Link>
          ))}
          <Link href="/catalog" className="phone-all">
            <span>
              <Text
                bn="আপনার প্রয়োজন আমাদের দায়িত্ব"
                en="Your needs. Our care."
              />
            </span>
            <LayoutGrid size={27} />
          </Link>
        </div>
        <div className="phone-bottom">
          {[
            { href: "/", icon: House, bn: "হোম", en: "Home" },
            {
              href: "/account",
              icon: ClipboardList,
              bn: "অর্ডার",
              en: "Orders",
            },
            { href: "/account", icon: Bell, bn: "নোটিফিকেশন", en: "Notifications" },
            { href: "/account", icon: User, bn: "প্রোফাইল", en: "Profile" },
          ].map(({ href, icon: Icon, bn, en }) => (
            <Link key={en} href={href}>
              <Icon size={17} />
              <span>{lang === "bn" ? bn : en}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
