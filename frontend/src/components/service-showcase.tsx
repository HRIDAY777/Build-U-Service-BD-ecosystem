"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bike,
  Gift,
  Heart,
  House,
  MapPin,
  Package,
  Pause,
  Play,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { Text, useApp } from "./provider";

const services = [
  {
    bn: "আপনার পার্সেল, পৌঁছে যাবে",
    en: "Your parcel, on its way",
    subBn: "পিকআপ থেকে গন্তব্য—এক জায়গায় বুকিং",
    subEn: "From pickup to destination, book in one place",
    labelBn: "ডেলিভারি",
    labelEn: "Delivery",
    href: "/delivery",
    icon: Bike,
    companion: Package,
    color: "#9250ab",
    scene: "delivery",
  },
  {
    bn: "পছন্দের জিনিস, আপনার ঘরে",
    en: "Find your everyday favourites",
    subBn: "দেখুন, পছন্দ করুন, অর্ডার দিন",
    subEn: "Explore, choose and place your order",
    labelBn: "ইউ শপ",
    labelEn: "U Shop",
    href: "/catalog?division=shop",
    icon: ShoppingBag,
    companion: Gift,
    color: "#237e83",
    scene: "shop",
  },
  {
    bn: "যত্নে থাকুক আপনার বাহন",
    en: "Keep your vehicle cared for",
    subBn: "সমস্যা জানান, সেবার সময় বেছে নিন",
    subEn: "Describe the issue and choose a service time",
    labelBn: "মেকানিক",
    labelEn: "Mechanic",
    href: "/mechanic",
    icon: Wrench,
    companion: Sparkles,
    color: "#aa672c",
    scene: "mechanic",
  },
  {
    bn: "বিশেষ দিন, সুন্দর আয়োজন",
    en: "Make room for memorable moments",
    subBn: "বিয়ে ও ইভেন্টের প্যাকেজ দেখুন",
    subEn: "Explore wedding and event packages",
    labelBn: "ইভেন্ট",
    labelEn: "Events",
    href: "/events",
    icon: Heart,
    companion: Gift,
    color: "#b64b7c",
    scene: "events",
  },
  {
    bn: "ভালো খাবার, ভালো সময়",
    en: "Good food, good moments",
    subBn: "আপনার পছন্দের খাবার খুঁজুন",
    subEn: "Discover something delicious",
    labelBn: "খাবার",
    labelEn: "Food",
    href: "/catalog?division=food",
    icon: UtensilsCrossed,
    companion: House,
    color: "#658744",
    scene: "food",
  },
] as const;

export function ServiceShowcase() {
  const { lang } = useApp();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      setReduced(media.matches || document.body.dataset.motion === "paused");
    sync();
    media.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    return () => {
      media.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (paused || reduced || hovered) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % services.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [paused, reduced, hovered]);
  const service = services[index],
    Icon = service.icon,
    Companion = service.companion;
  return (
    <section
      className={`service-showcase${paused || reduced || hovered ? " is-paused" : ""}`}
      aria-label={lang === "bn" ? "আমাদের সেবার পরিচয়" : "Explore our services"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false);
      }}
      style={{ "--service-color": service.color } as React.CSSProperties}
    >
      <div className="service-showcase-top">
        <span>
          <Sparkles size={14} />
          <Text bn="প্রতিদিন, আপনার পাশে" en="HERE FOR YOUR EVERYDAY" />
        </span>
        <button
          type="button"
          className="brand-motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          disabled={reduced}
        >
          {paused || reduced ? <Play size={14} /> : <Pause size={14} />}
          <Text
            bn={paused ? "চালু করুন" : "থামান"}
            en={paused ? "Play" : "Pause"}
          />
        </button>
      </div>
      <div
        key={service.scene}
        className={`service-stage service-stage-${service.scene}`}
        aria-hidden="true"
      >
        <div className="service-halo" />
        <div className="service-orbit" />
        <div className="service-city">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="service-platform" />
        <div className="service-main-object">
          <Icon strokeWidth={1.4} />
        </div>
        <div className="service-mini-object">
          <Companion strokeWidth={1.6} />
        </div>
        <span className="service-location">
          <MapPin size={23} />
        </span>
        <span className="service-spark spark-a">✦</span>
        <span className="service-spark spark-b">✧</span>
      </div>
      <div className="service-showcase-copy">
        <span className="service-eyebrow">
          {lang === "bn" ? service.labelBn : service.labelEn}
        </span>
        <h2>{lang === "bn" ? service.bn : service.en}</h2>
        <p>{lang === "bn" ? service.subBn : service.subEn}</p>
        <Link href={service.href}>
          <Text bn="বিস্তারিত দেখুন" en="Explore this service" />
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <div
        className="service-selectors"
        aria-label={lang === "bn" ? "সেবা নির্বাচন" : "Choose a service"}
      >
        {services.map((item, i) => (
          <button
            type="button"
            key={item.scene}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            <item.icon size={16} />
            <span>{lang === "bn" ? item.labelBn : item.labelEn}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
