"use client";

import { useState } from "react";
import type { Offering } from "@/lib/api";
import { offeringPhoto } from "@/lib/photos";
import { Photo } from "./photo";
import { Text, useApp } from "./provider";

type Media = Offering["media"][number];

export function ShopMediaGallery({ item }: { item: Offering }) {
  const { lang } = useApp();
  const primary = offeringPhoto(item);
  const media: Media[] = [
    ...(primary
      ? [
          {
            id: -1,
            kind: "image" as const,
            url: primary,
            alt: item.name,
            alt_bn: item.name_bn,
          },
        ]
      : []),
    ...(item.media || []).filter((entry) => entry.url !== primary),
  ];
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? 0);
  const selected = media.find((entry) => entry.id === selectedId) ?? media[0];

  if (!selected)
    return (
      <div className="shop-gallery-empty">
        <Text bn="পণ্যের ছবি পাওয়া যায়নি" en="Product image unavailable" />
      </div>
    );

  const alt =
    lang === "bn" ? selected.alt_bn || item.name_bn : selected.alt || item.name;
  return (
    <section
      className="shop-gallery"
      aria-label={
        lang === "bn" ? "পণ্যের ছবি ও ভিডিও" : "Product images and video"
      }
    >
      <div className="shop-gallery-stage">
        {selected.kind === "video" ? (
          <video key={selected.url} controls preload="metadata" playsInline aria-label={alt}>
            <source src={selected.url} />
            <Text
              bn="আপনার ব্রাউজারে ভিডিওটি চালানো যাচ্ছে না।"
              en="Your browser cannot play this video."
            />
          </video>
        ) : (
          <Photo src={selected.url} alt={alt} eager />
        )}
      </div>
      {media.length > 1 && (
        <div
          className="shop-gallery-thumbs"
          aria-label={lang === "bn" ? "মিডিয়া বাছুন" : "Choose media"}
        >
          {media.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === selected.id ? "active" : ""}
              aria-pressed={entry.id === selected.id}
              aria-label={
                entry.kind === "video"
                  ? lang === "bn"
                    ? `ভিডিও ${index + 1}`
                    : `Video ${index + 1}`
                  : lang === "bn"
                    ? `ছবি ${index + 1}`
                    : `Image ${index + 1}`
              }
              onClick={() => setSelectedId(entry.id)}
            >
              {entry.kind === "video" ? (
                <span>▶</span>
              ) : (
                <Photo src={entry.url} alt="" />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
