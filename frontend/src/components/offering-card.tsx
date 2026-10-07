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
} from "lucide-react";
import { Offering } from "@/lib/api";
import { useApp, Text } from "./provider";
const icons = {
  food: UtensilsCrossed,
  pharmacy: Pill,
  shop: ShoppingBag,
  electrician: Zap,
  mechanic: Wrench,
  services: House,
};
export function OfferingCard({ offering: o }: { offering: Offering }) {
  const { lang, add } = useApp();
  const service = ["electrician", "mechanic", "services"].includes(
    o.division_slug,
  );
  const Icon = icons[o.division_slug as keyof typeof icons] || House;
  return (
    <article className="offering-card">
      <Link
        href={`/catalog/${o.id}`}
        className={`offering-image card-${o.division_slug}`}
      >
        <Icon size={76} strokeWidth={1.1} />
        <span>{o.division_slug.toUpperCase()}</span>
      </Link>
      <div className="offering-body">
        <small>{o.merchant}</small>
        <Link href={`/catalog/${o.id}`}>
          <h3>{lang === "bn" ? o.name_bn : o.name}</h3>
        </Link>
        <p>{lang === "bn" ? o.description_bn : o.description}</p>
        {o.prescription_required && (
          <span className="rx-label">
            <Text bn="প্রেসক্রিপশন প্রয়োজন" en="Prescription required" />
          </span>
        )}
        <div className="offering-bottom">
          <strong>
            ৳{Number(o.price).toLocaleString()}
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
