"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  ClipboardCheck,
  Wrench,
  CalendarDays,
} from "lucide-react";
import { Offering } from "@/lib/api";
import { Text, useApp } from "./provider";
import { Photo } from "./photo";
import { offeringPhoto } from "@/lib/photos";
export function MechanicServiceDetail({ item }: { item: Offering }) {
  const { lang } = useApp();
  return (
    <div className="page-wrap mechanic-detail">
      <Link className="mechanic-back-link" href="/mechanic">
        <span aria-hidden="true">←</span>
        <Text bn="মেকানিক সেবায় ফিরে যান" en="Back to mechanic services" />
      </Link>
      <div className="mechanic-detail-grid">
        <div className="mechanic-detail-image">
          <Photo
            eager
            src={offeringPhoto(item) || "/images/photos/mechanic.jpg"}
            alt={lang === "bn" ? item.name_bn || item.name : item.name}
          />
          <span className="mechanic-detail-photo-note">
            <Text bn="দৃষ্টান্তমূলক ছবি" en="Illustrative photo" />
          </span>
        </div>
        <section className="mechanic-detail-copy">
          <span className="eyebrow">
            <Wrench size={14} />
            <Text bn="ইউ মেকানিক" en="U MECHANIC" />
          </span>
          <h1>
            <Text bn={item.name_bn || item.name} en={item.name} />
          </h1>
          <span className="mechanic-detail-merchant">{item.merchant}</span>
          <p className="mechanic-detail-description">
            <Text
              bn={item.description_bn || item.description}
              en={item.description}
            />
          </p>
          <div className="mechanic-detail-price">
            <div>
              <small>
                <Text bn="নির্বাচিত সেবার মূল্য" en="Selected service fee" />
              </small>
              <strong>
                ৳
                {Number(item.price).toLocaleString(
                  lang === "bn" ? "bn-BD" : "en-BD",
                )}
              </strong>
            </div>
            <span>
              <Clock3 size={17} />
              {item.duration_minutes} <Text bn="মিনিট" en="minutes" />
            </span>
          </div>
          <Link className="button" href={"/book/" + item.id}>
            <Text bn="সময় বেছে বুকিং করুন" en="Choose a time & book" />
            <ArrowUpRight size={18} />
          </Link>
          <p className="mechanic-detail-confirmation">
            <CalendarDays size={15} />
            <Text
              bn="আপনার অনুরোধ দেখে টিম সময় নিশ্চিত করবে।"
              en="Our team reviews your request and confirms the appointment."
            />
          </p>
        </section>
      </div>
      <section className="mechanic-detail-expect">
        <div>
          <span className="mechanic-note-icon">
            <CalendarDays size={22} />
          </span>
          <h2>
            <Text bn="আপনার সময় ও এলাকা" en="Your time and area" />
          </h2>
          <p>
            <Text
              bn="বুকিং ফর্মে সেবার এলাকা ও পছন্দের সময় দিন। উপলব্ধ সময়গুলো সেবার সময়সূচি অনুযায়ী দেখানো হবে।"
              en="Enter your service area and preferred time. Time suggestions follow the service schedule."
            />
          </p>
        </div>
        <div>
          <span className="mechanic-note-icon">
            <Wrench size={22} />
          </span>
          <h2>
            <Text bn="আপনার সমস্যার বিবরণ" en="Your vehicle’s needs" />
          </h2>
          <p>
            <Text
              bn="মডেল, সমস্যার ধরন এবং যানবাহন চলে কিনা জানান। এতে মেকানিক প্রস্তুতি নিতে পারবেন।"
              en="Share the model, issue and whether the vehicle runs so the mechanic can prepare."
            />
          </p>
        </div>
        <div>
          <span className="mechanic-note-icon">
            <ClipboardCheck size={22} />
          </span>
          <h2>
            <Text bn="কাজ শেষে পরিষ্কার রিপোর্ট" en="A clear work report" />
          </h2>
          <p>
            <Text
              bn="আপনার অ্যাকাউন্টে সমস্যার কারণ, কাজ ও ব্যবহৃত যন্ত্রাংশের বিবরণ দেখুন।"
              en="Review the diagnosis, completed work and parts used in your account."
            />
          </p>
        </div>
      </section>
      <section className="mechanic-detail-faq">
        <div>
          <span className="eyebrow">
            <Text bn="বুকিংয়ের আগে জানুন" en="BEFORE YOU BOOK" />
          </span>
          <h2>
            <Text bn="কয়েকটি প্রয়োজনীয় উত্তর" en="A few helpful answers" />
          </h2>
        </div>
        <div>
          {[
            [
              "এই মূল্যে কী অন্তর্ভুক্ত?",
              "What does this price cover?",
              "এটি নির্বাচিত সেবার মূল্য। অতিরিক্ত মেরামত, যন্ত্রাংশ ও পরিবহনের খরচ কাজ শুরুর আগে আলাদা করে নিশ্চিত করুন।",
              "This is the selected service fee. Confirm additional repairs, parts and transport costs separately before work.",
            ],
            [
              "গাড়ি বা বাইক না চললে কী করব?",
              "What if my vehicle does not run?",
              "বুকিংয়ের সময় চলাচলের সঠিক অবস্থা জানান। এই অনুরোধ টোয়িং বা জরুরি উদ্ধার নিশ্চিত করে না; পরিবহনের ব্যবস্থা টিমের সঙ্গে আলোচনা করুন।",
              "Choose the correct mobility status when booking. This request does not confirm towing or emergency recovery; discuss transport arrangements with the team.",
            ],
            [
              "আমার বুকিংয়ের খবর কোথায় পাব?",
              "Where can I follow my booking?",
              "অ্যাকাউন্টের বুকিং অংশে কাজের অগ্রগতি ও মেকানিকের রিপোর্ট দেখতে পাবেন।",
              "Open Bookings in your account to follow work progress and review the mechanic’s report.",
            ],
          ].map(([bn, en, bodyBn, bodyEn]) => (
            <details key={en}>
              <summary>
                <Text bn={bn} en={en} />
              </summary>
              <p>
                <Text bn={bodyBn} en={bodyEn} />
              </p>
            </details>
          ))}
        </div>
      </section>
      <div className="mechanic-detail-bottom">
        <span>
          <Text
            bn="আপনার যানবাহনের যত্নের পরবর্তী ধাপ"
            en="Take the next step in caring for your ride"
          />
        </span>
        <Link className="button" href={"/book/" + item.id}>
          <Text bn="বুকিংয়ের অনুরোধ করুন" en="Request an appointment" />
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </div>
  );
}
