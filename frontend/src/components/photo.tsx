"use client";
import { useState } from "react";
import Image from "next/image";

export function Photo({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState("");
  if (!src || failed === src)
    return <span className={`photo-unavailable ${className}`}>{alt}</span>;
  if (src.startsWith("/images/"))
    return (
      <Image
        className={`subject-photo ${className}`}
        src={src}
        overrideSrc={src}
        alt={alt}
        width={1400}
        height={900}
        sizes={
          eager
            ? "(max-width: 700px) 100vw, 50vw"
            : "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
        }
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(src)}
      />
    );
  return (
    <img
      className={`subject-photo ${className}`}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}
