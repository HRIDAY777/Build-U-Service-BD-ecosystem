import type { Metadata } from "next";
import { OffersStorefront } from "@/components/offers-storefront";
import "../offers-reference.css";

export const metadata: Metadata = {
  title: "অফার ও বিশেষ প্রোমোশন",
  description:
    "U Service BD-এর খাবার, কেনাকাটা, হোম সার্ভিস ও ডেলিভারি বিভাগ দেখুন।",
};

export default function OffersPage() {
  return (
    <div className="offers-reference-page">
      <OffersStorefront />
    </div>
  );
}
