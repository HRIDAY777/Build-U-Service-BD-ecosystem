"use client";
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
  HeartHandshake,
  Plus,
  PackageCheck,
  MessageCircle,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Division } from "@/lib/api";
import { useApp, Text } from "./provider";
import { TranslatedInput, TranslatedButton } from "./translated-elements";
import { Photo } from "./photo";
import { ServiceShowcase } from "./service-showcase";

const divisionIcons: Record<string, typeof Truck> = {
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
  faqs,
  online,
}: {
  divisions: Division[];
  faqs: {
    id: number;
    question: string;
    question_bn: string;
    answer: string;
    answer_bn: string;
  }[];
  online: boolean;
}) {
  const { lang } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  function search(event: FormEvent) {
    event.preventDefault();
    router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
  }
  return (
    <div className="landing-page">
      <section className="hero hero-next landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" />
            <Text
              bn="ইউ সার্ভিস • আপনার প্রতিদিনের সঙ্গী"
              en="U SERVICE • YOUR EVERYDAY, CONNECTED"
            />
          </div>
          <h1>
            <Text bn="একটু সহজ হোক" en="Everyday life." />
            <br />
            <span>
              <Text bn="প্রতিদিন।" en="Made simpler." />
            </span>
          </h1>
          <p>
            <Text
              bn="ঘরের কাজ, কেনাকাটা কিংবা প্রিয়জনের জন্য কিছু পাঠানো—আপনার ব্যস্ত দিনের প্রয়োজন মেটাতে, আমরা আছি এক জায়গায়।"
              en="A helping hand at home. Something you need. A parcel for someone you love. Make room for your day, with U Service."
            />
          </p>
          <form className="hero-search" onSubmit={search}>
            <Search size={21} />
            <TranslatedInput
              aria-label="Search services"
              placeholder={
                lang === "bn" ? "আজ কী খুঁজছেন?" : "What do you need today?"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <TranslatedButton type="submit" aria-label="Search">
              <ArrowRight size={21} />
            </TranslatedButton>
          </form>
          <div className="landing-hero-links">
            <a href="#all-services">
              <Text bn="সেবাগুলো দেখুন" en="Browse our services" />
              <ArrowUpRight size={17} />
            </a>
            <a href="#how-it-works">
              <Text bn="যেভাবে কাজ করে" en="How it works" />
            </a>
          </div>
          <div className="landing-footnote">
            <span />
            <Text
              bn="এক অ্যাকাউন্টে অর্ডার, বুকিং ও আপডেট"
              en="Orders, bookings and updates. One account."
            />
          </div>
        </div>
        <div className="hero-art hero-brand-art">
          <ServiceShowcase />
        </div>
      </section>

      <div className="landing-utility">
        <span>
          <Text bn="আগেই শুরু করেছেন?" en="Already have something underway?" />
        </span>
        <div>
          <Link href="/account">
            <PackageCheck size={17} />
            <Text bn="অর্ডার ও বুকিং দেখুন" en="Your orders & bookings" />
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/support">
            <MessageCircle size={17} />
            <Text bn="সাহায্য নিন" en="Get support" />
          </Link>
        </div>
      </div>

      <section
        className="landing-directory landing-section"
        id="all-services"
        aria-labelledby="services-title"
      >
        <div>
          <span className="eyebrow">
            <Text bn="আপনার প্রয়োজন থেকে শুরু" en="START WITH WHAT YOU NEED" />
          </span>
          <h2 id="services-title">
            <Text
              bn="কোন কাজটা সহজ করব?"
              en="What can we take off your list?"
            />
          </h2>
          <p className="landing-intro">
            <Text
              bn="সঠিক বিভাগ বেছে নিন। বিস্তারিত, মূল্য ও পরের ধাপ সেখানেই পাবেন।"
              en="Choose a category. Find the details, prices and next steps there."
            />
          </p>
          {!online && (
            <p className="notice" role="status">
              <Text
                bn="সেবার তালিকা এখন লোড করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।"
                en="The service list is unavailable right now. Please try again shortly."
              />
            </p>
          )}
          <div className="landing-service-list">
            {divisions.map((d) => {
              const Icon = divisionIcons[d.slug] || House;
              return (
                <Link
                  className="landing-service-link"
                  key={d.id}
                  href={
                    d.kind === "delivery"
                      ? "/delivery"
                      : d.slug === "mechanic"
                        ? "/mechanic"
                        : `/catalog?division=${d.slug}`
                  }
                >
                  <Icon size={22} strokeWidth={1.5} />
                  <span>
                    <strong>
                      {lang === "bn" ? d.name_bn || d.name : d.name}
                    </strong>
                    <small>
                      {lang === "bn" ? d.description_bn : d.description}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </Link>
              );
            })}
            <Link className="landing-service-link" href="/events">
              <HeartHandshake size={22} strokeWidth={1.5} />
              <span>
                <strong>
                  <Text bn="বিয়ে ও ইভেন্ট" en="Weddings & events" />
                </strong>
                <small>
                  <Text
                    bn="আপনার বিশেষ দিনের আয়োজন"
                    en="Thoughtfully planned celebrations"
                  />
                </small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <Link className="landing-catalog-link" href="/catalog">
            <Text bn="সম্পূর্ণ ক্যাটালগ খুলুন" en="Open the full catalog" />
            <ArrowRight size={16} />
          </Link>
        </div>
        <aside
          className="landing-process"
          id="how-it-works"
          aria-labelledby="process-title"
        >
          <span className="landing-kicker">
            <Text bn="সহজ পথ, শুরু থেকে শেষ" en="A CLEAR WAY FORWARD" />
          </span>
          <h2 id="process-title">
            <Text
              bn="আপনি বলুন।\nআমরা পাশে আছি।"
              en="You choose.\nWe’re here to help."
            />
          </h2>
          <ol>
            {[
              {
                bn: "প্রয়োজন বেছে নিন",
                en: "Find what you need",
                detailBn: "বিস্তারিত ও মূল্য দেখে সিদ্ধান্ত নিন।",
                detailEn: "Review the details and price before choosing.",
              },
              {
                bn: "সময় ও ঠিকানা দিন",
                en: "Make it fit your day",
                detailBn: "প্রয়োজনীয় তথ্য দিয়ে অর্ডার বা বুকিং পাঠান।",
                detailEn: "Add your details and send your order or booking.",
              },
              {
                bn: "অগ্রগতি দেখুন",
                en: "Stay in the loop",
                detailBn: "আপনার অ্যাকাউন্টে আপডেট ও সহায়তা পাবেন।",
                detailEn: "Find updates and support in your account.",
              },
            ].map((step, i) => (
              <li key={step.en}>
                <span className="process-number">0{i + 1}</span>
                <div>
                  <h3>
                    <Text bn={step.bn} en={step.en} />
                  </h3>
                  <p>
                    <Text bn={step.detailBn} en={step.detailEn} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="landing-availability">
            <MapPin size={16} />
            <Text
              bn="সেবার প্রাপ্যতা এলাকা অনুযায়ী ভিন্ন হতে পারে।"
              en="Availability can vary by location."
            />
          </p>
        </aside>
      </section>

      <section
        className="landing-story landing-section"
        aria-labelledby="story-title"
      >
        <div className="landing-story-photo">
          <Photo
            src="/images/photos/delivery-branded.png"
            alt={
              lang === "bn"
                ? "ইউ সার্ভিসের লোগোযুক্ত পোশাকে ডেলিভারির দৃষ্টান্তমূলক ছবি"
                : "Illustrative delivery portrait with U Service branded clothing"
            }
          />
          <div className="landing-photo-caption">
            <span>
              <Text
                bn="আপনার প্রতিদিনের সঙ্গী"
                en="A little help. A better everyday."
              />
            </span>
            <Link href="/photo-credits">
              <Text bn="দৃষ্টান্তমূলক ছবি" en="Illustrative image" />
            </Link>
          </div>
        </div>
        <div className="landing-story-copy">
          <span className="eyebrow">
            <Text
              bn="মানুষের কাছে, মানুষের পাশে"
              en="ROOTED IN EVERYDAY LIFE"
            />
          </span>
          <h2 id="story-title">
            <Text
              bn="প্রযুক্তির সাথে\nমানুষের যত্ন।"
              en="A human touch.\nA simpler everyday."
            />
          </h2>
          <p>
            <Text
              bn="প্রতিটি প্রয়োজনের পেছনে আছে একজন মানুষ, একটি পরিবার, একটি ব্যস্ত দিন। সেই দিনটাকে একটু সহজ করতেই ইউ সার্ভিস—স্থানীয় ব্যবসা ও সেবাদাতাদের সাথে আপনাকে যুক্ত করার উদ্যোগ।"
              en="Behind every request is a person, a family, a busy day. U Service brings you together with local businesses and service providers to make that day a little easier."
            />
          </p>
          <Link href="/pages/about" className="text-link">
            <Text bn="আমাদের গল্প" en="Our story" />
            <ArrowUpRight size={18} />
          </Link>
          <div className="landing-partner">
            <HeartHandshake size={24} />
            <div>
              <strong>
                <Text
                  bn="আপনার কাজও পৌঁছে যাক আরও মানুষের কাছে।"
                  en="Bring your work to more people."
                />
              </strong>
              <Link href="/partner-application">
                <Text bn="পার্টনার হিসেবে যুক্ত হোন" en="Join as a partner" />
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-help landing-section"
        aria-labelledby="help-title"
      >
        <div>
          <span className="eyebrow">
            <Text bn="আর কিছু জানতে চান?" en="BEFORE YOU GET STARTED" />
          </span>
          <h2 id="help-title">
            <Text
              bn="প্রশ্ন থাকুক।\nউত্তরও আছে।"
              en="A little clarity\ngoes a long way."
            />
          </h2>
          <Link href="/contact" className="text-link">
            <Text bn="আমাদের সাথে কথা বলুন" en="Talk to us" />
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="faqs">
          {faqs.length ? (
            faqs.slice(0, 4).map((f) => (
              <details key={f.id}>
                <summary>
                  {lang === "bn" ? f.question_bn || f.question : f.question}
                  <Plus size={18} />
                </summary>
                <p>{lang === "bn" ? f.answer_bn || f.answer : f.answer}</p>
              </details>
            ))
          ) : (
            <p>
              <Text
                bn="অর্ডার, বুকিং কিংবা আপনার এলাকার সেবা নিয়ে জানতে যোগাযোগ করুন।"
                en="Contact us for help with orders, bookings or services in your area."
              />
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
