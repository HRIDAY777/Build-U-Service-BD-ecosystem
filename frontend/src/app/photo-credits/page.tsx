"use client";
import { UiText } from "@/components/ui-text";

import { useEffect, useState } from "react";
import { districtImages, DistrictImages } from "@/components/district-photo";
import { stockPhotos } from "@/lib/photo-credits";
import { Text } from "@/components/provider";

export default function PhotoCredits() {
  const [districts, setDistricts] = useState<DistrictImages>({});
  useEffect(() => {
    districtImages()
      .then(setDistricts)
      .catch(() => {});
  }, []);
  return (
    <div className="page-wrap">
      <h1>
        <UiText text={"ছবির উৎস / Photo credits"} />
      </h1>
      <p>
        <UiText
          text={
            "পণ্য, সেবা ও অনুষ্ঠানের ছবিগুলো দৃষ্টান্তমূলক stock photography। ছবির মানুষ বা প্রতিষ্ঠানকে U Service BD-এর কর্মী, অংশীদার বা গ্রাহক হিসেবে দাবি করা হচ্ছে না। ডেমো প্রতিষ্ঠানের নাম ও ঠিকানা উদাহরণমাত্র।"
          }
        />
      </p>
      <h2>
        <UiText text={"Stock photography"} />
      </h2>
      <p>
        <UiText
          text={
            "ডেলিভারি জার্সির ব্র্যান্ডেড ছবিটি সরবরাহ করা ছবি ও U Service লোগো ব্যবহার করে AI দিয়ে সম্পাদিত ডিজাইন নমুনা। এটি প্রকৃত কর্মীর ইউনিফর্মের প্রমাণ নয়। মূল ডেলিভারি ছবির উৎস নিচে দেওয়া আছে।"
          }
        />
      </p>
      <p>
        <UiText text={"Used under the"} />{" "}
        <a className="text-link" href="https://www.pexels.com/license/">
          <UiText text={"Pexels licence"} />
        </a>
        <UiText
          text={". Display cropping may differ from the original photograph."}
        />
      </p>
      <ul>
        {stockPhotos.map(([id, title, source]) => (
          <li key={id}>
            <a
              className="text-link"
              href={source}
              target="_blank"
              rel="noreferrer"
            >
              {title}
              <UiText text={"— photographer and original source"} />
            </a>
          </li>
        ))}
      </ul>
      <h2>
        <UiText text={"জেলার ছবি / District photographs"} />
      </h2>
      <p>
        <UiText
          text={
            "জেলার Wikipedia নিবন্ধে ব্যবহৃত ছবি Wikimedia Commons থেকে নেওয়া হয়েছে। প্রতিটি ছবির নিজস্ব লাইসেন্স প্রযোজ্য। ছবিগুলো সেবার আওতার প্রমাণ নয়।"
          }
        />
      </p>
      {Object.values(districts).map((photo) => (
        <article className="record" key={photo.src}>
          <h3>
            <Text bn={photo.name_bn} en={photo.name} />
          </h3>
          <p>{photo.artist}</p>
          <a
            className="text-link"
            href={photo.source}
            target="_blank"
            rel="noreferrer"
          >
            <UiText text={"Original photograph"} />
          </a>
          {" · "}
          <a
            className="text-link"
            href={photo.license_url || photo.source}
            target="_blank"
            rel="noreferrer"
          >
            {photo.license}
          </a>
          <p>
            <UiText
              text={"Displayed as a cropped preview; source file retained."}
            />
          </p>
        </article>
      ))}
    </div>
  );
}
