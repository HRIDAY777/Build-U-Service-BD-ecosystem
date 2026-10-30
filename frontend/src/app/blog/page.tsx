import type { Metadata } from "next";
import { BlogStorefront } from "@/components/blog-storefront";
import "../blog-reference.css";

export const metadata: Metadata = {
  title: "নিউজ ও ব্লগ",
  description:
    "U Service BD-এর দৈনন্দিন জীবন, সেবা ও স্মার্ট সমাধান নিয়ে প্রয়োজনীয় তথ্য ও পরামর্শ।",
};

export default function BlogPage() {
  return <BlogStorefront />;
}
