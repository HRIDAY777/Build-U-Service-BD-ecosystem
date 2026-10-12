"use client";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";
import { UiText } from "./ui-text";

export function MechanicPhoto({
  id,
  hasPhoto,
  editable = false,
  onSaved,
}: {
  id: string;
  hasPhoto?: boolean;
  editable?: boolean;
  onSaved?: () => Promise<void>;
}) {
  const { lang } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const url = `/api/v1/bookings/${id}/problem-photo/?v=${version}`;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await change("POST", new FormData(form));
  }
  async function change(method: string, data?: FormData) {
    setBusy(true);
    setError("");
    try {
      await api(`bookings/${id}/problem-photo/`, method, data);
      setVersion((value) => value + 1);
      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  if (!hasPhoto && !editable) return null;
  return (
    <section className="mechanic-photo">
      <h3>
        <Text bn="সমস্যার ছবি" en="Problem photo" />
      </h3>
      {hasPhoto && (
        <a href={url} target="_blank" rel="noreferrer">
          <Image
            src={url}
            unoptimized
            width={320}
            height={240}
            alt={
              lang === "bn"
                ? "গ্রাহকের দেওয়া সমস্যার ছবি"
                : "Problem photo supplied by the customer"
            }
          />
          <span>
            <Text bn="ছবি বড় করে দেখুন" en="View full photo" />
          </span>
        </a>
      )}
      {editable && (
        <form onSubmit={save}>
          <label>
            <Text
              bn={hasPhoto ? "নতুন ছবি দিয়ে বদলান" : "একটি ছবি যোগ করুন"}
              en={hasPhoto ? "Replace with a new photo" : "Add a photo"}
            />
            <input
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              disabled={busy}
            />
          </label>
          <p>
            <Text
              bn="JPG, PNG বা WebP • সর্বোচ্চ ৫ এমবি। বুকিং দেখার অনুমতি থাকা ব্যক্তিরাই ছবিটি দেখতে পারবেন।"
              en="JPG, PNG or WebP • up to 5 MB. Only people authorized to view this booking can view the photo."
            />
          </p>
          <div className="record-actions">
            <button className="button secondary" disabled={busy}>
              <Text
                bn={busy ? "সংরক্ষণ হচ্ছে…" : "ছবি সংরক্ষণ"}
                en={busy ? "Saving…" : "Save photo"}
              />
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => change("DELETE")}
              >
                <Text bn="ছবি সরান" en="Remove photo" />
              </button>
            )}
          </div>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}
    </section>
  );
}
