"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./provider";

export function BrandLogo({
  className = "",
  eager = false,
  animated = false,
}: {
  className?: string;
  eager?: boolean;
  animated?: boolean;
}) {
  const { lang } = useApp();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!animated || !video.current) return;
    const element = video.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let active = true;
    const sync = () => {
      if (
        media.matches ||
        document.body.dataset.motion === "paused" ||
        document.hidden
      ) {
        element.pause();
        setPlaying(false);
      } else {
        element.play().catch(() => {
          if (active) setPlaying(false);
        });
      }
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      active = false;
      observer.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      element.pause();
    };
  }, [animated]);
  const label =
    lang === "bn"
      ? "ইউ সার্ভিস — কোম্পানির মূল লোগো"
      : "U Service — company logo";
  if (animated)
    return (
      <span
        className={`company-logo company-logo-video ${className}`}
        role="img"
        aria-label={label}
      >
        <Image
          src="/images/brand/u-service-logo.png"
          alt=""
          width={678}
          height={311}
          unoptimized
          loading={eager ? "eager" : "lazy"}
          style={{ visibility: playing ? "hidden" : "visible" }}
        />
        <video
          ref={video}
          src="/videos/u-service-logo-intro.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload={eager ? "auto" : "metadata"}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={() => setPlaying(false)}
          style={{ opacity: playing ? 1 : 0 }}
        />
      </span>
    );
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
