import Link from "next/link";
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
  return (
    <div className="page-wrap">
      <span className="eyebrow">
        <Text bn="ইউ মেকানিক" en="U MECHANIC" />
      </span>
      <h1>
        <Text
          bn="যানবাহনের যত্ন, সহজ বুকিংয়ে"
          en="Vehicle care, with a clear next step"
        />
      </h1>
      <p className="page-intro">
        <Text
          bn="সাইকেল, মোটরবাইক, স্কুটার ও গাড়ির সেবা বাছুন। সমস্যার তথ্য ও পছন্দের সময় দিন; টিম মেকানিক ও সময় নিশ্চিত করবে।"
          en="Choose care for a bicycle, motorbike, scooter or car. Tell us the problem and your preferred time; our team confirms the mechanic and appointment."
        />
      </p>
      <Photo
        className="mechanic-hero-photo"
        src="/images/photos/mechanic.jpg"
        alt="মেকানিক সেবার দৃষ্টান্তমূলক ছবি / Illustrative mechanic service photo"
      />
      <section className="notice">
        <h2>
          <Text
            bn="বুকিং থেকে কাজের রিপোর্ট"
            en="From booking to work report"
          />
        </h2>
        <ol>
          <li>
            <Text
              bn="সেবা, যানবাহন ও সমস্যার তথ্য দিন।"
              en="Choose a service and enter vehicle and problem details."
            />
          </li>
          <li>
            <Text
              bn="সেবার এলাকা ও সময় অনুযায়ী টিম বুকিং নিশ্চিত করবে।"
              en="The team confirms your request against service coverage and schedules."
            />
          </li>
          <li>
            <Text
              bn="অ্যাকাউন্ট থেকে মেকানিকের কাজের অগ্রগতি দেখুন।"
              en="Follow the mechanic's progress in your account."
            />
          </li>
          <li>
            <Text
              bn="কাজ শেষে সমস্যার কারণ, সম্পন্ন কাজ ও যন্ত্রাংশের রিপোর্ট দেখুন।"
              en="Review the diagnosis, completed work and parts report."
            />
          </li>
        </ol>
        <p>
          <Text
            bn="অতিরিক্ত মেরামত ও যন্ত্রাংশের মূল্য কাজের আগে নিশ্চিত করুন। এই বুকিং জরুরি উদ্ধার বা টোয়িং নিশ্চিত করে না।"
            en="Confirm additional repairs and parts prices before work. This booking does not confirm emergency recovery or towing."
          />
        </p>
      </section>
      <h2>
        <Text bn="মেকানিক সেবা বাছুন" en="Choose mechanic care" />
      </h2>
      {offerings ? (
        <div className="offering-grid">
          {offerings.results.map((o) => (
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
      <Link className="button secondary" href="/catalog?division=mechanic">
        <Text bn="সব সেবা ও দাম দেখুন" en="Browse all services and prices" />
      </Link>
    </div>
  );
}
