import Link from "next/link";
import {
  ArrowUpRight,
  Bike,
  Car,
  ClipboardCheck,
  CalendarClock,
  Wrench,
  FileCheck2,
} from "lucide-react";
import { Text } from "@/components/provider";
import { Photo } from "@/components/photo";
import { OfferingCard } from "@/components/offering-card";
import { serverGet, PageResult, Offering } from "@/lib/api";
export const metadata = {
  title: "Mechanic services | U Service BD",
  description:
    "Book bicycle, motorbike and vehicle inspection and maintenance.",
};
export default async function MechanicPage() {
  const offerings = await serverGet<PageResult<Offering>>(
    "offerings/?division=mechanic",
  );
  const featured = [...new Map((offerings?.results || []).map(item => [item.name, item])).values()].slice(0, 8);
  return (
    <div className="page-wrap mechanic-page">
      <section className="mechanic-hero">
        <div className="mechanic-hero-copy">
          <span className="eyebrow">
            <Wrench size={15} />
            <Text
              bn="ইউ মেকানিক · যানবাহনের যত্ন"
              en="U MECHANIC · VEHICLE CARE"
            />
          </span>
          <h1>
            <Text
              bn="যানবাহনের যত্ন, সহজ বুকিংয়ে"
              en="Vehicle care, with a clear next step"
            />
          </h1>
          <p>
            <Text
              bn="সাইকেল থেকে গাড়ি—সঠিক সেবা বাছুন, সমস্যার কথা জানান। আপনার পথচলা সহজ করতে আমরা পাশে আছি।"
              en="From your bicycle to your car. Choose the care you need, tell us what’s wrong, and take the next step with confidence."
            />
          </p>
          <div className="mechanic-hero-actions">
            <a className="button" href="#mechanic-services">
              <Text bn="সেবা বাছুন" en="Explore services" />
              <ArrowUpRight size={18} />
            </a>
            <a className="mechanic-subtle-link" href="#mechanic-process">
              <Text bn="যেভাবে কাজ করে" en="How it works" />
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="mechanic-vehicle-tags">
            <span>
              <Bike size={18} />
              <Text bn="সাইকেল ও মোটরবাইক" en="Bicycles & motorbikes" />
            </span>
            <span>
              <Car size={18} />
              <Text bn="স্কুটার ও গাড়ি" en="Scooters & cars" />
            </span>
          </div>
        </div>
        <div className="mechanic-hero-visual">
          <Photo
            eager
            className="mechanic-hero-photo"
            src="/images/photos/mechanic.jpg"
            alt="মেকানিক সেবার দৃষ্টান্তমূলক ছবি / Illustrative mechanic service photo"
          />
          <span className="mechanic-photo-label">
            <Text bn="যত্নের প্রতিটি ধাপে" en="CARE, AT EVERY STEP" />
          </span>
          <div className="mechanic-visual-note">
            <span className="mechanic-note-icon">
              <ClipboardCheck size={25} />
            </span>
            <div>
              <strong>
                <Text bn="কাজ শেষে পরিষ্কার রিপোর্ট" en="A clear work report" />
              </strong>
              <small>
                <Text
                  bn="সমস্যা, কাজ ও যন্ত্রাংশের বিবরণ"
                  en="Diagnosis, work & parts recorded"
                />
              </small>
            </div>
          </div>
        </div>
      </section>
      <div className="mechanic-benefits">
        <div>
          <CalendarClock size={22} />
          <span>
            <strong>
              <Text bn="আপনার পছন্দের সময়" en="Your preferred time" />
            </strong>
            <small>
              <Text bn="সময় টিম নিশ্চিত করবে" en="Confirmed by our team" />
            </small>
          </span>
        </div>
        <div>
          <Wrench size={22} />
          <span>
            <strong>
              <Text bn="প্রয়োজন অনুযায়ী সেবা" en="Care for your needs" />
            </strong>
            <small>
              <Text
                bn="পরীক্ষা থেকে নিয়মিত যত্ন"
                en="Inspection to routine upkeep"
              />
            </small>
          </span>
        </div>
        <div>
          <FileCheck2 size={22} />
          <span>
            <strong>
              <Text bn="কাজের তথ্য এক জায়গায়" en="Everything in one place" />
            </strong>
            <small>
              <Text
                bn="অ্যাকাউন্টে অগ্রগতি ও রিপোর্ট"
                en="Progress & reports in your account"
              />
            </small>
          </span>
        </div>
      </div>
      <section id="mechanic-services" className="mechanic-services">
        <div className="mechanic-section-heading">
          <div>
            <span className="eyebrow">
              <Text bn="আপনার যানবাহনের জন্য" en="FOR YOUR EVERYDAY RIDE" />
            </span>
            <h2>
              <Text bn="মেকানিক সেবা বাছুন" en="Choose mechanic care" />
            </h2>
          </div>
          <p>
            <Text
              bn="সেবার দাম ও বিবরণ দেখে আপনার প্রয়োজনের সেবাটি বুক করুন।"
              en="Compare services and prices. Book the care that fits your ride."
            />
          </p>
        </div>
        {offerings ? (
          <div className="offering-grid">
            {featured.map((o) => (
              <OfferingCard key={o.id} offering={o} />
            ))}
          </div>
        ) : (
          <p role="alert">
            <Text
              bn="সেবাগুলো এখন লোড করা যায়নি। আবার চেষ্টা করুন।"
              en="We could not load services. Please try again."
            />
          </p>
        )}
        {offerings && !offerings.count && (
          <p>
            <Text
              bn="এখন কোনো সক্রিয় মেকানিক সেবা নেই।"
              en="No mechanic services are currently active."
            />
          </p>
        )}
        <div className="mechanic-browse">
          <Link className="button secondary" href="/catalog?division=mechanic">
            <Text
              bn="সব সেবা ও দাম দেখুন"
              en="Browse all services and prices"
            />
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section id="mechanic-process" className="mechanic-process">
        <div className="mechanic-section-heading">
          <div>
            <span className="eyebrow">
              <Text bn="সহজ চারটি ধাপ" en="FOUR SIMPLE STEPS" />
            </span>
            <h2>
              <Text
                bn="বুকিং থেকে কাজের রিপোর্ট"
                en="From booking to work report"
              />
            </h2>
          </div>
          <Link href="/account" className="mechanic-subtle-link">
            <Text bn="আপনার বুকিং দেখুন" en="View your bookings" />
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <ol>
          {[
            [
              "01",
              "সেবা বাছুন",
              "Choose your care",
              "যানবাহন ও সমস্যার তথ্য দিন।",
              "Tell us about your vehicle and the problem.",
            ],
            [
              "02",
              "সময় নিশ্চিত করুন",
              "Confirm the visit",
              "এলাকা ও সময় দেখে টিম বুকিং নিশ্চিত করবে।",
              "Our team checks coverage and confirms your appointment.",
            ],
            [
              "03",
              "কাজের অগ্রগতি দেখুন",
              "Follow the progress",
              "অ্যাকাউন্টে মেকানিকের কাজের অবস্থা দেখুন।",
              "Track the mechanic’s work in your account.",
            ],
            [
              "04",
              "রিপোর্ট বুঝে নিন",
              "Review your report",
              "সমস্যা, সম্পন্ন কাজ ও যন্ত্রাংশের বিবরণ দেখুন।",
              "Review the diagnosis, completed work and parts used.",
            ],
          ].map(([n, bn, en, bodyBn, bodyEn]) => (
            <li key={n}>
              <span className="mechanic-step-number" aria-hidden="true">
                {n}
              </span>
              <h3>
                <Text bn={bn} en={en} />
              </h3>
              <p>
                <Text bn={bodyBn} en={bodyEn} />
              </p>
            </li>
          ))}
        </ol>
      </section>
      <aside className="mechanic-pricing-note">
        <Wrench size={20} />
        <p>
          <strong>
            <Text
              bn="কাজের আগে খরচ নিশ্চিত করুন।"
              en="Confirm costs before work."
            />
          </strong>{" "}
          <Text
            bn="বাড়তি মেরামত ও যন্ত্রাংশের দাম আলাদা। এই বুকিং জরুরি উদ্ধার বা টোয়িং নিশ্চিত করে না।"
            en="Additional repairs and parts are priced separately. This booking does not confirm emergency recovery or towing."
          />
        </p>
      </aside>
    </div>
  );
}
