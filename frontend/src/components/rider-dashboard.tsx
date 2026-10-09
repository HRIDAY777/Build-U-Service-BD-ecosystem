"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "./provider";
import { DeliveryList } from "./delivery-tracking";
type Profile = {
  name: string;
  available: boolean;
  vehicle: string;
  completed_jobs: number;
  active_jobs: number;
  pending_cod: string;
  recorded_earnings: string;
  average_rating: number | null;
  rating_count: number;
  failed_jobs: number;
  returned_jobs: number;
};
export function RiderDashboard() {
  const { user } = useApp();
  const [storedProfile, setProfile] = useState<Profile | null>(null);
  const [profileOwner, setProfileOwner] = useState<number | null>(null);
  const profile = profileOwner === user?.id ? storedProfile : null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!user?.roles.includes("Rider")) return;
    try {
      setProfile(await api("deliveries/rider_profile/"));
      setProfileOwner(user.id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      setProfile(
        await api("deliveries/rider_profile/", "PATCH", {
          available: data.get("available") === "on",
          vehicle: data.get("vehicle"),
        }),
      );
      setProfileOwner(user.id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page-wrap">
        <h1>রাইডার / Rider</h1>
        <Link className="button" href="/login">
          লগইন / Sign in
        </Link>
      </div>
    );
  if (!user.roles.includes("Rider"))
    return (
      <div className="page-wrap">
        <h1>রাইডার হিসেবে যুক্ত হোন</h1>
        <p>অ্যাডমিনের অনুমোদিত Rider অ্যাকাউন্ট দিয়ে এই অংশ ব্যবহার করা যায়।</p>
        <Link className="button" href="/contact?interest=rider">
          আবেদন / Apply
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>রাইডার ড্যাশবোর্ড / Rider dashboard</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {profile ? (
        <>
          <h2>{profile.name}</h2>
          <div className="stat-grid">
            <article className="record">
              চলমান কাজ / Active<strong>{profile.active_jobs}</strong>
            </article>
            <article className="record">
              সম্পন্ন / Completed<strong>{profile.completed_jobs}</strong>
            </article>
            <article className="record">
              জমা যাচাই বাকি COD<strong>৳{profile.pending_cod}</strong>
            </article>
            <article className="record">
              নথিভুক্ত আয় / Recorded earnings
              <strong>৳{profile.recorded_earnings}</strong>
            </article>
          </div>
          <p>
            আয়: অ্যাডমিনের নির্ধারিত প্রতি-ডেলিভারি হার কাজ বরাদ্দের সময় সংরক্ষণ
            করা হয়; শুধু সম্পন্ন কাজ গণনা করা হয়। এটি টাকা পরিশোধের রেকর্ড নয়।
            হার নির্ধারিত না থাকলে ৳০ দেখাবে।
          </p>
          <form className="form-panel" onSubmit={update}>
            <article className="record">
              <h2>কাজের সারাংশ / Performance</h2>
              <p>
                গ্রাহক রেটিং:{" "}
                {profile.average_rating === null
                  ? "এখনও নেই / No ratings yet"
                  : `${profile.average_rating.toFixed(2)}/5`}{" "}
                · {profile.rating_count}টি মূল্যায়ন
              </p>
              <p>
                ব্যর্থ: {profile.failed_jobs} · ফেরত: {profile.returned_jobs}
              </p>
              <Link className="text-link" href="/support">
                সাপোর্ট / Rider support
              </Link>
            </article>
            <h2>কাজের প্রাপ্যতা / Availability</h2>
            <label>
              <input
                name="available"
                type="checkbox"
                defaultChecked={profile.available}
              />{" "}
              নতুন কাজ নিতে প্রস্তুত / Available for new assignments
            </label>
            <label className="field">
              যানবাহন / Vehicle
              <input
                name="vehicle"
                maxLength={80}
                defaultValue={profile.vehicle}
              />
            </label>
            <button className="button" disabled={busy}>
              সংরক্ষণ / Save availability
            </button>
          </form>
          <button className="button secondary" onClick={() => void load()}>
            হিসাব রিফ্রেশ / Refresh summary
          </button>
        </>
      ) : (
        <button className="button secondary" onClick={() => void load()}>
          লোড / Retry
        </button>
      )}
      <DeliveryList />
    </div>
  );
}
