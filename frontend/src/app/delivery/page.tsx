import { UiText } from "@/components/ui-text";
import { Text } from "@/components/provider";
import { DeliveryForm } from "@/components/forms";
import { DeliveryList } from "@/components/delivery-tracking";
import Link from "next/link";
import { DeliveryStorefront } from "@/components/delivery-storefront";
import "./delivery-reference.css";
import { ArrowRight } from "lucide-react";

export default function Delivery() {
  return (
    <div className="delivery-reference-page">
      <DeliveryStorefront />
      <main className="delivery-lower-content">
        <section
          id="delivery-request"
          className="delivery-request-section"
          aria-labelledby="delivery-request-title"
        >
          <div className="delivery-form-heading">
            <span className="delivery-form-kicker">
              <UiText text={"DELIVERY REQUEST"} />
            </span>
            <h2 id="delivery-request-title">
              <Text bn="ডেলিভারির অনুরোধ করুন" en="Request a delivery" />
            </h2>
            <p>
              <Text
                bn="পিকআপ ও গন্তব্যের ঠিকানা, পার্সেলের তথ্য এবং যোগাযোগের বিবরণ দিন। অনুরোধ জমা দেওয়ার আগে প্রযোজ্য চার্জ দেখুন।"
                en="Add pickup and destination addresses, parcel details and contact information. Review the applicable fee before submitting."
              />
            </p>
          </div>
          <div className="delivery-request-panel">
            {["general", "documents", "clothing", "electronics", "other"].map(
              (type) => (
                <span
                  id={`delivery-request-${type}`}
                  className="delivery-form-anchor"
                  key={type}
                />
              ),
            )}
            <DeliveryForm />
          </div>
        </section>
        <div className="delivery-rider-link">
          <div>
            <h2>
              <Text bn="ডেলিভারি রাইডার?" en="Delivery rider?" />
            </h2>
            <p>
              <Text
                bn="আপনার রাইডার ড্যাশবোর্ড থেকে ডেলিভারির কাজ পরিচালনা করুন।"
                en="Manage delivery jobs from your rider dashboard."
              />
            </p>
          </div>
          <Link className="delivery-rider-button" href="/rider">
            <UiText text={"রাইডার ড্যাশবোর্ড / Rider dashboard"} />
            <ArrowRight size={17} />
          </Link>
        </div>
        <section className="delivery-tracking-section">
          <DeliveryList />
        </section>
      </main>
    </div>
  );
}
