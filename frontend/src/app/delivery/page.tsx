import { UiText } from "@/components/ui-text";
import { DeliveryForm } from "@/components/forms";
import { Photo } from "@/components/photo";
import { Text } from "@/components/provider";
import { divisionPhotos } from "@/lib/photos";
import { DeliveryList } from "@/components/delivery-tracking";
import Link from "next/link";
export default function Delivery() {
  return (
    <div className="page-wrap">
      <section className="delivery-brand-cover">
        <div className="delivery-brand-photo">
          <Photo
            src={divisionPhotos.delivery}
            alt="U Service লোগোসহ ডেলিভারি জার্সির নমুনা"
            eager
          />
        </div>
        <div className="delivery-brand-copy">
          <span className="eyebrow">
            <UiText text={"U SERVICE · DELIVERY"} />
          </span>
          <h1>
            <Text
              bn="আপনার পার্সেল, আমাদের যত্নে।"
              en="Your parcel, in our care."
            />
          </h1>
          <p>
            <Text
              bn="পিকআপ ও গন্তব্যের ঠিকানা বেছে ডেলিভারির অনুরোধ করুন। উপলব্ধ এলাকা ও চার্জ ফর্মে দেখুন।"
              en="Choose pickup and destination addresses to request delivery. Check available areas and fees in the form."
            />
          </p>
          <small>
            <Text
              bn="ব্র্যান্ডেড জার্সির ডিজাইন নমুনা · AI দিয়ে সম্পাদিত ছবি"
              en="Branded uniform concept · AI-edited photograph"
            />
          </small>
        </div>
      </section>
      <DeliveryForm />
      <Link className="button secondary" href="/rider">
        <UiText text={"রাইডার ড্যাশবোর্ড / Rider dashboard"} />
      </Link>
      <DeliveryList />
    </div>
  );
}
