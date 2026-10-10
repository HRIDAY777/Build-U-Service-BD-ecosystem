"use client";
import Link from "next/link";
import {
  Plus,
  ArrowUpRight,
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  Zap,
  Wrench,
  House,
  Heart,
  Shirt,
  Umbrella,
  Cable,
  LampDesk,
  Bath,
  BedDouble,
  Smartphone,
  Package,
  LockKeyhole,
  Droplets,
  Bike,
} from "lucide-react";
import { api, Offering } from "@/lib/api";
import { useApp, Text } from "./provider";
import { offeringPhoto } from "@/lib/photos";
import { Photo } from "./photo";
const icons = {
  food: UtensilsCrossed,
  pharmacy: Pill,
  shop: ShoppingBag,
  electrician: Zap,
  mechanic: Wrench,
  services: House,
};
export function OfferingCard({ offering: o }: { offering: Offering }) {
  const { lang, add, user, toast } = useApp();
  const service = ["electrician", "mechanic", "services"].includes(
    o.division_slug,
  );
  const itemIcons = {
    "Polo shirt": Shirt,
    "Cotton panjabi": Shirt,
    "Cotton kurti": Shirt,
    Umbrella: Umbrella,
    "USB cable": Cable,
    "LED desk lamp": LampDesk,
    "Bath towel": Bath,
    "Bedsheet set": BedDouble,
    "Phone stand": Smartphone,
    "Lunch box": Package,
    "Storage basket": Package,
    "Kitchen apron": Shirt,
    "Door lock fitting": LockKeyhole,
    "Plumbing inspection": Droplets,
    "Tap replacement visit": Droplets,
    "Motorbike inspection": Bike,
    "Scooter inspection": Bike,
  };
  const Icon =
    itemIcons[o.name as keyof typeof itemIcons] ||
    icons[o.division_slug as keyof typeof icons] ||
    House;
  return (
    <article
      className={`offering-card offering-kind-${service ? "service" : o.division_slug}`}
    >
      <Link
        href={`/catalog/${o.id}`}
        className={`offering-image card-${o.division_slug}`}
      >
        {offeringPhoto(o) ? (
          <Photo
            src={offeringPhoto(o)}
            alt={lang === "bn" ? o.name_bn : o.name}
          />
        ) : (
          <Icon size={76} strokeWidth={1.1} />
        )}
        <span>
          {lang === "bn"
            ? {
                food: "খাবার",
                shop: "পণ্য",
                pharmacy: "যত্ন",
                services: "বাসার সেবা",
                electrician: "ইলেকট্রিক",
                mechanic: "মেকানিক",
              }[o.division_slug] || "সেবা"
            : o.division_slug}
        </span>
        {o.sku?.startsWith("DEMO-") && offeringPhoto(o) && (
          <small className="photo-demo-label">
            {lang === "bn" ? "দৃষ্টান্তমূলক ছবি" : "Illustrative photo"}
          </small>
        )}
      </Link>
      <div className="offering-body">
        <div className="offering-meta">
          <small>{o.merchant}</small>
          {user && (
            <button
              className="wishlist-button"
              type="button"
              aria-label={`Save ${o.name} to wishlist`}
              onClick={async () => {
                try {
                  await api("wishlist/", "POST", { offering: o.id });
                  toast("Saved to wishlist / পছন্দের তালিকায় যোগ হয়েছে");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Already saved");
                }
              }}
            >
              <Heart size={17} />
            </button>
          )}
        </div>
        <Link href={`/catalog/${o.id}`}>
          <h3>{lang === "bn" ? o.name_bn : o.name}</h3>
        </Link>
        <p>{lang === "bn" ? o.description_bn : o.description}</p>
        {o.prescription_required && (
          <span className="rx-label">
            <Text bn="প্রেসক্রিপশন প্রয়োজন" en="Prescription required" />
          </span>
        )}
        <div className="offering-details">
          {service ? (
            <span>
              {o.duration_minutes}{" "}
              {lang === "bn" ? "মিনিটের ভিজিট" : "minute visit"}
            </span>
          ) : (
            <span>
              {o.stock
                ? lang === "bn"
                  ? "মজুত আছে"
                  : "In stock"
                : lang === "bn"
                  ? "এখন মজুত নেই"
                  : "Out of stock"}
            </span>
          )}
          {!!(o.variants?.length || o.food_option_groups?.length) && (
            <span>{lang === "bn" ? "অপশন বেছে নিন" : "Options available"}</span>
          )}
        </div>
        <div className="offering-bottom">
          <strong>
            ৳
            {Number(o.current_price ?? o.price).toLocaleString(
              lang === "bn" ? "bn-BD" : "en-BD",
            )}
            {Number(o.current_price) < Number(o.price) && (
              <del className="offering-old-price">
                ৳
                {Number(o.price).toLocaleString(
                  lang === "bn" ? "bn-BD" : "en-BD",
                )}
              </del>
            )}
            <small>
              {service ? (lang === "bn" ? " / সেবা" : " / service") : ""}
            </small>
          </strong>
          {service ? (
            <Link
              className="round-button"
              href={`/book/${o.id}`}
              aria-label={`Book ${o.name}`}
            >
              <ArrowUpRight size={20} />
            </Link>
          ) : o.variants?.length || o.food_option_groups?.length ? (
            <Link
              className="round-button"
              href={`/catalog/${o.id}`}
              aria-label={`Choose options for ${o.name}`}
            >
              <ArrowUpRight size={20} />
            </Link>
          ) : (
            <button
              className="round-button"
              onClick={() => add(o)}
              disabled={!o.stock}
              aria-label={`Add ${o.name} to bag`}
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
