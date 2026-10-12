"use client";

import { Text, useApp } from "./provider";
import { UiText } from "./ui-text";

const states: Record<string, [number, string, string]> = {
  pending: [0, "অনুরোধ জমা হয়েছে", "Request received"],
  confirmed: [1, "বুকিং নিশ্চিত হয়েছে", "Booking confirmed"],
  assigned: [1, "মেকানিক দায়িত্ব পেয়েছেন", "Mechanic assigned"],
  on_the_way: [1, "মেকানিক পথে আছেন", "Mechanic is on the way"],
  arrived: [1, "মেকানিক পৌঁছেছেন", "Mechanic has arrived"],
  in_progress: [2, "কাজ চলছে", "Work in progress"],
  waiting_for_parts: [2, "যন্ত্রাংশের অপেক্ষায়", "Waiting for parts"],
  completed: [3, "কাজ সম্পন্ন হয়েছে", "Work completed"],
};
const steps = [
  ["অনুরোধ", "Request"],
  ["প্রস্তুতি", "Preparation"],
  ["কাজ", "Work"],
  ["সম্পন্ন", "Completed"],
];

export function MechanicBookingProgress({ status }: { status: string }) {
  const { lang } = useApp();
  const state = states[status];
  return (
    <section
      className={`mechanic-progress ${status === "waiting_for_parts" ? "is-waiting" : ""}`}
      aria-label={lang === "bn" ? "বুকিংয়ের অগ্রগতি" : "Booking progress"}
    >
      <div className="mechanic-progress-heading">
        <span>
          <Text bn="বুকিংয়ের অগ্রগতি" en="Booking progress" />
        </span>
        <strong>
          {state ? (
            <Text bn={state[1]} en={state[2]} />
          ) : status === "cancelled" ? (
            <Text bn="বুকিং বাতিল হয়েছে" en="Booking cancelled" />
          ) : status === "failed" ? (
            <Text bn="কাজ সম্পন্ন করা যায়নি" en="Work could not be completed" />
          ) : (
            <UiText text={status} />
          )}
        </strong>
      </div>
      {state && (
        <ol>
          {steps.map(([bn, en], index) => (
            <li
              key={en}
              className={
                index < state[0]
                  ? "is-past"
                  : index === state[0]
                    ? "is-current"
                    : ""
              }
              aria-current={index === state[0] ? "step" : undefined}
            >
              <span className="mechanic-progress-dot" aria-hidden="true">
                {index + 1}
              </span>
              <Text bn={bn} en={en} />
            </li>
          ))}
        </ol>
      )}
      {status === "waiting_for_parts" && (
        <p>
          <Text
            bn="যন্ত্রাংশের ব্যবস্থা হলে কাজের অবস্থা আপডেট হবে।"
            en="The work status will be updated when parts are available."
          />
        </p>
      )}
      {status === "cancelled" && (
        <p>
          <Text
            bn="এই বুকিংয়ে আর কাজ এগোবে না। প্রয়োজন হলে নতুন বুকিং করুন।"
            en="This booking will not proceed. You can make a new booking if needed."
          />
        </p>
      )}
      {status === "failed" && (
        <p>
          <Text
            bn="বিস্তারিত জানতে সাপোর্টের সঙ্গে যোগাযোগ করুন।"
            en="Contact support for more details."
          />
        </p>
      )}
    </section>
  );
}
