"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { UiText } from "./ui-text";
import { Text } from "./provider";
export type MechanicDetails = {
  vehicle_type: string;
  vehicle_model: string;
  registration?: string;
  problem_type: string;
  mobility: string;
  odometer_km?: number | null;
};
const vehicles: Record<string, [string, string]> = {
  bicycle: ["সাইকেল", "Bicycle"],
  motorbike: ["মোটরবাইক", "Motorbike"],
  scooter: ["স্কুটার", "Scooter"],
  car: ["গাড়ি", "Car"],
  other: ["অন্যান্য", "Other"],
};
const problems: Record<string, [string, string]> = {
  inspection: ["সাধারণ পরীক্ষা", "General inspection"],
  engine: ["ইঞ্জিন", "Engine"],
  brakes: ["ব্রেক", "Brakes"],
  tyres: ["টায়ার", "Tyres"],
  battery: ["ব্যাটারি", "Battery"],
  chain: ["চেইন", "Chain"],
  electrical: ["ইলেকট্রিক সমস্যা", "Electrical"],
  other: ["অন্যান্য", "Other"],
};
const mobility: Record<string, [string, string]> = {
  running: ["চলছে", "Running"],
  not_running: ["চলছে না", "Not running"],
  unsafe: ["চালানো নিরাপদ নয়", "Unsafe to drive"],
};
function Options({ values }: { values: Record<string, [string, string]> }) {
  return (
    <>
      {Object.entries(values).map(([value, [bn, en]]) => (
        <option key={value} value={value}>
          <Text bn={bn} en={en} />
        </option>
      ))}
    </>
  );
}
function Value({
  value,
  values,
}: {
  value: string;
  values: Record<string, [string, string]>;
}) {
  const pair = values[value];
  return pair ? <Text bn={pair[0]} en={pair[1]} /> : <>{value}</>;
}
export function MechanicFields() {
  return (
    <fieldset className="mechanic-fields">
      <legend>
        <Text bn="যানবাহন ও সমস্যার তথ্য" en="Vehicle and problem details" />
      </legend>
      <label className="field">
        <Text bn="যানবাহনের ধরন" en="Vehicle type" />
        <select name="vehicle_type" required>
          <option value="">
            <Text bn="বেছে নিন" en="Choose a vehicle" />
          </option>
          <Options values={vehicles} />
        </select>
      </label>
      <label className="field">
        <Text bn="ব্র্যান্ড ও মডেল" en="Brand and model" />
        <input name="vehicle_model" maxLength={120} required />
      </label>
      <label className="field">
        <Text
          bn="রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)"
          en="Registration number (optional)"
        />
        <input name="registration" maxLength={40} />
      </label>
      <label className="field">
        <Text bn="সমস্যার ধরন" en="Problem type" />
        <select name="problem_type" required>
          <Options values={problems} />
        </select>
      </label>
      <label className="field">
        <Text bn="যানবাহনের চলাচলের অবস্থা" en="Vehicle mobility" />
        <select name="mobility" required>
          <Options values={mobility} />
        </select>
      </label>
      <label className="field">
        <Text bn="চালানো হয়েছে (কিমি, ঐচ্ছিক)" en="Odometer (km, optional)" />
        <input
          type="number"
          name="odometer_km"
          min={0}
          max={2000000}
          step={1}
        />
      </label>
      <p className="subtle">
        <Text
          bn="দেখানো মূল্য নির্বাচিত সেবার মূল্য। বাড়তি মেরামত, যন্ত্রাংশ ও পরিবহনের খরচ কাজের আগে আলাদা করে নিশ্চিত করতে হবে। বুকিং পাঠালে টোয়িং বা জরুরি উদ্ধার নিশ্চিত হয় না।"
          en="The displayed price covers the selected service. Confirm additional repairs, parts and transport costs before work. A booking does not confirm towing or emergency recovery."
        />
      </p>
    </fieldset>
  );
}
export function MechanicSummary({ details }: { details?: MechanicDetails }) {
  if (!details?.vehicle_type) return null;
  return (
    <section className="mechanic-summary">
      <h3>
        <Text bn="যানবাহন ও সমস্যার তথ্য" en="Vehicle and problem details" />
      </h3>
      <p>
        <Value value={details.vehicle_type} values={vehicles} /> ·{" "}
        {details.vehicle_model}
      </p>
      {details.registration && (
        <p>
          <Text bn="রেজিস্ট্রেশন:" en="Registration:" /> {details.registration}
        </p>
      )}
      <p>
        <Text bn="সমস্যা:" en="Problem:" />{" "}
        <Value value={details.problem_type} values={problems} />
      </p>
      <p>
        <Text bn="অবস্থা:" en="Mobility:" />{" "}
        <Value value={details.mobility} values={mobility} />
      </p>
      {details.odometer_km != null && (
        <p>
          {details.odometer_km} <Text bn="কিমি" en="km" />
        </p>
      )}
    </section>
  );
}

export type MechanicReport = {
  diagnosis: string;
  work_performed: string;
  parts_used: string;
  follow_up: string;
};
export function MechanicReportView({ report }: { report?: MechanicReport }) {
  if (!report?.diagnosis) return null;
  return (
    <section className="mechanic-summary">
      <h3>
        <Text bn="মেকানিকের কাজের রিপোর্ট" en="Mechanic work report" />
      </h3>
      {[
        ["diagnosis", "সমস্যা নির্ণয়", "Diagnosis"],
        ["work_performed", "সম্পন্ন কাজ", "Work performed"],
        ["parts_used", "ব্যবহৃত যন্ত্রাংশ", "Parts used"],
        ["follow_up", "পরবর্তী করণীয়", "Follow-up"],
      ].map(
        ([key, bn, en]) =>
          report[key as keyof MechanicReport] && (
            <p key={key}>
              <strong>
                <Text bn={bn} en={en} />:
              </strong>{" "}
              {report[key as keyof MechanicReport]}
            </p>
          ),
      )}
    </section>
  );
}
export function MechanicReportEditor({
  id,
  report,
  onSaved,
}: {
  id: string;
  report?: MechanicReport;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        setError("");
        try {
          await api("bookings/" + id + "/mechanic_report/", "PUT", data);
          onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>
        <Text bn="কাজের রিপোর্ট লিখুন" en="Record work report" />
      </h3>
      {[
        ["diagnosis", "সমস্যা নির্ণয়", "Diagnosis"],
        ["work_performed", "সম্পন্ন কাজ", "Work performed"],
        ["parts_used", "ব্যবহৃত যন্ত্রাংশ", "Parts used"],
        ["follow_up", "পরবর্তী করণীয়", "Follow-up"],
      ].map(([key, bn, en]) => (
        <label className="field" key={key}>
          <Text bn={bn} en={en} />
          <textarea
            name={key}
            required={["diagnosis", "work_performed"].includes(key)}
            maxLength={
              ["diagnosis", "work_performed"].includes(key) ? 2000 : 1000
            }
            defaultValue={report?.[key as keyof MechanicReport] || ""}
          />
        </label>
      ))}
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
      <button className="button" disabled={busy}>
        <Text
          bn={busy ? "সংরক্ষণ হচ্ছে…" : "রিপোর্ট সংরক্ষণ করুন"}
          en={busy ? "Saving…" : "Save work report"}
        />
      </button>
    </form>
  );
}
