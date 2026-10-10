"use client";
import { Text } from "./provider";

export type Restaurant = {
  id: number;
  name: string;
  division_slug: string;
  weekly_hours: Record<string, { open: string; close: string }[]>;
  accepting_orders: boolean;
  minimum_order: string;
  preparation_minutes: number;
  ordering_status: {
    is_open: boolean | null;
    paused: boolean;
    can_order: boolean;
    hours_configured: boolean;
  };
};
export const weekdays = [
  ["সোমবার", "Monday"],
  ["মঙ্গলবার", "Tuesday"],
  ["বুধবার", "Wednesday"],
  ["বৃহস্পতিবার", "Thursday"],
  ["শুক্রবার", "Friday"],
  ["শনিবার", "Saturday"],
  ["রবিবার", "Sunday"],
];

export function RestaurantInfo({ restaurant }: { restaurant: Restaurant }) {
  if (restaurant.division_slug !== "food") return null;
  const status = restaurant.ordering_status;
  return (
    <section className="notice" aria-label="Restaurant ordering information">
      <strong>
        {status.paused ? (
          <Text bn="অর্ডার সাময়িক বন্ধ" en="Orders paused" />
        ) : status.is_open === false ? (
          <Text bn="রেস্টুরেন্ট এখন বন্ধ" en="Restaurant currently closed" />
        ) : status.is_open === true ? (
          <Text bn="রেস্টুরেন্ট এখন খোলা" en="Restaurant currently open" />
        ) : (
          <Text
            bn="সময় নির্ধারিত হয়নি—অর্ডার নেওয়া হচ্ছে"
            en="Hours not set — accepting orders"
          />
        )}
      </strong>
      <p>
        <Text bn="খাবারের ন্যূনতম মূল্য: " en="Minimum food subtotal: " />৳
        {restaurant.minimum_order}
      </p>
      <p>
        <Text bn="প্রস্তুতির আনুমানিক সময়: " en="Estimated preparation: " />
        {restaurant.preparation_minutes}{" "}
        <Text
          bn="মিনিট, ডেলিভারির সময় আলাদা"
          en="minutes; delivery time is additional"
        />
      </p>
      {status.hours_configured && (
        <details>
          <summary>
            <Text
              bn="সাপ্তাহিক সময়সূচি (বাংলাদেশ সময়)"
              en="Weekly hours (Bangladesh time)"
            />
          </summary>
          <ul>
            {weekdays.map(([bn, en], day) => (
              <li key={en}>
                <Text bn={bn} en={en} />:{" "}
                {restaurant.weekly_hours[String(day)]?.length ? (
                  restaurant.weekly_hours[String(day)]
                    .map(
                      (slot) =>
                        `${slot.open}–${slot.close}${slot.close < slot.open ? " (+1)" : ""}`,
                    )
                    .join(", ")
                ) : (
                  <Text bn="বন্ধ" en="Closed" />
                )}
              </li>
            ))}
          </ul>
          <p>
            <Text
              bn="(+1) মানে পরের দিন বন্ধ হবে।"
              en="(+1) means closing on the following day."
            />
          </p>
        </details>
      )}
    </section>
  );
}
