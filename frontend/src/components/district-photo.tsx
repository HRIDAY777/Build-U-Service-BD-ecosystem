"use client";
import { useEffect, useState } from "react";
import { Photo } from "./photo";

export type DistrictImage = {
  src: string;
  name: string;
  name_bn: string;
  alt: string;
  artist: string;
  license: string;
  license_url: string;
  source: string;
  article: string;
};
export type DistrictImages = Record<string, DistrictImage>;
let cached: Promise<DistrictImages> | undefined;
export function districtImages() {
  if (!cached)
    cached = fetch("/images/districts/manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error("District photos unavailable");
        return response.json() as Promise<DistrictImages>;
      })
      .catch((error) => {
        cached = undefined;
        throw error;
      });
  return cached;
}

export function DistrictPhoto({ districtId }: { districtId?: number }) {
  const [images, setImages] = useState<DistrictImages>({});
  useEffect(() => {
    let current = true;
    districtImages()
      .then((value) => {
        if (current) setImages(value);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);
  const image = districtId ? images[String(districtId)] : null;
  if (!image) return null;
  return (
    <figure className="district-photo">
      <Photo
        src={image.src}
        alt={`${image.name_bn} জেলার দৃশ্য / ${image.name} district: ${image.alt}`}
      />
      <figcaption>
        <strong>
          {image.name_bn} / {image.name}
        </strong>
        <br />
        <a href={image.source} target="_blank" rel="noreferrer">
          {image.artist} · {image.license}
        </a>
      </figcaption>
    </figure>
  );
}

export function DistrictGallery() {
  const [images, setImages] = useState<DistrictImages>({});
  useEffect(() => {
    districtImages()
      .then(setImages)
      .catch(() => {});
  }, []);
  const all = Object.entries(images);
  const selected = [
    "Dhaka",
    "Coxsbazar",
    "Sylhet",
    "Rajshahi",
    "Rangamati",
    "Khulna",
  ].flatMap((name) => all.filter(([, image]) => image.name === name));
  if (!selected.length) return null;
  return (
    <section className="section">
      <span className="eyebrow">PLACES, PEOPLE & EVERYDAY STORIES</span>
      <h2>বাংলাদেশের রঙে, আপনার প্রতিদিন।</h2>
      <p>
        নিজের জেলা বেছে নিলে ঠিকানার ফর্মেও দেখবেন সেই জেলার ছবি। সেবার
        প্রাপ্যতা checkout-এ যাচাই হবে।
      </p>
      <div className="district-gallery">
        {selected.map(([id, image]) => (
          <figure className="district-photo" key={id}>
            <Photo src={image.src} alt={image.alt} />
            <figcaption>
              <strong>{image.name_bn}</strong>
              <br />
              <a href={image.source} target="_blank" rel="noreferrer">
                ছবির উৎস · {image.license}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
