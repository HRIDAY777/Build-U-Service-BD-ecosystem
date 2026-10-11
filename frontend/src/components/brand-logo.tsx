"use client";
import Image from "next/image";
import { useApp } from "./provider";

export function BrandLogo({
  className = "",
  eager = false,
}: {
  className?: string;
  eager?: boolean;
}) {
  const { lang } = useApp();
  return (
    <Image
      className={`company-logo ${className}`}
      src="/images/brand/u-service-logo.png"
      alt={
        lang === "bn"
          ? "ইউ সার্ভিস — কোম্পানির মূল লোগো"
          : "U Service — company logo"
      }
      width={678}
      height={311}
      unoptimized
      loading={eager ? "eager" : "lazy"}
    />
  );
}
