"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useApp } from "./provider";

export type ImageReplacement = {
  id?: number;
  source_alt: string;
  source_url: string;
  image: string;
};

export type TextReplacement = {
  id?: number;
  source_text: string;
  replacement_text: string;
};

export type VideoBlock = {
  id: number;
  mode: "banner" | "replace";
  position: "top" | "bottom";
  title: string;
  title_bn: string;
  subtitle: string;
  subtitle_bn: string;
  source_video_url: string;
  video_url: string;
  poster_url: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
};

export type PageAppearanceData = {
  background_image: string | null;
  background_color?: string | null;
  background_overlay_opacity?: number;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  logo_url?: string | null;
  announcement_text_bn?: string | null;
  announcement_text_en?: string | null;
  image_replacements: ImageReplacement[];
  text_replacements?: TextReplacement[];
  videos?: VideoBlock[];
};

const PageVideosContext = createContext<VideoBlock[]>([]);

function normalizePathOrUrl(source: string): string {
  if (!source) return "";
  try {
    const url = new URL(source, window.location.origin);
    if (url.pathname === "/_next/image") {
      const inner = url.searchParams.get("url") || source;
      return normalizePathOrUrl(inner);
    }
    if (url.origin === window.location.origin) {
      return url.pathname;
    }
    return url.href;
  } catch {
    return source.trim();
  }
}

function matchesSource(image: HTMLImageElement, replacement: ImageReplacement) {
  const altMatches = replacement.source_alt
    ? replacement.source_alt
        .split("|")
        .map((alt) => alt.trim().toLocaleLowerCase())
        .filter(Boolean)
        .includes((image.alt || "").trim().toLocaleLowerCase())
    : false;

  if (!replacement.source_url) return altMatches;

  const currentRaw =
    image.dataset.appearanceOriginalSrc || image.getAttribute("src") || "";
  const sourceNorm = normalizePathOrUrl(currentRaw);
  const expectedNorm = normalizePathOrUrl(replacement.source_url);
  const urlMatches =
    Boolean(sourceNorm && expectedNorm) &&
    (sourceNorm === expectedNorm || currentRaw === replacement.source_url);

  return urlMatches && (!replacement.source_alt || altMatches);
}

function restoreImages(images: Iterable<HTMLImageElement>) {
  for (const image of images) {
    if (!image.dataset.appearanceReplacement) continue;
    image.setAttribute(
      "src",
      image.dataset.appearanceOriginalSrc || image.getAttribute("src") || "",
    );
    const originalSrcSet = image.dataset.appearanceOriginalSrcset;
    if (originalSrcSet) image.setAttribute("srcset", originalSrcSet);
    else image.removeAttribute("srcset");
    delete image.dataset.appearanceOriginalSrc;
    delete image.dataset.appearanceOriginalSrcset;
    delete image.dataset.appearanceReplacement;
  }
}

function toYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return url;
      const v = parsed.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

const SKIP_TEXT_PARENTS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
]);

export function PageAppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { lang } = useApp();
  const [bannerVideos, setBannerVideos] = useState<VideoBlock[]>([]);

  useEffect(() => {
    if (pathname?.startsWith("/admin-panel")) {
      setBannerVideos([]);
      return;
    }

    let active = true;
    const rootStyle = document.documentElement.style;
    const prevVars = {
      purple: rootStyle.getPropertyValue("--purple"),
      pink: rootStyle.getPropertyValue("--pink"),
      green: rootStyle.getPropertyValue("--green"),
      ink: rootStyle.getPropertyValue("--ink"),
      bg: rootStyle.getPropertyValue("--bg"),
    };
    const previousBackground = document.body.style.backgroundImage;
    const previousBgColor = document.body.style.backgroundColor;
    const previousSize = document.body.style.backgroundSize;
    const previousPosition = document.body.style.backgroundPosition;
    const previousAttachment = document.body.style.backgroundAttachment;

    const originalTextMap = new WeakMap<Text, string>();
    const touchedTextNodes = new Set<Text>();
    let observer: MutationObserver | undefined;

    async function loadAppearance() {
      try {
        const response = await fetch(
          `/api/v1/page-appearance/?path=${encodeURIComponent(pathname || "/")}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const appearance = (await response.json()) as PageAppearanceData;
        if (!active) return;

        // 1. Theme Colors
        if (appearance.primary_color) {
          rootStyle.setProperty("--purple", appearance.primary_color);
        }
        if (appearance.secondary_color) {
          rootStyle.setProperty("--pink", appearance.secondary_color);
        }
        if (appearance.accent_color) {
          rootStyle.setProperty("--green", appearance.accent_color);
        }
        if (appearance.text_color) {
          rootStyle.setProperty("--ink", appearance.text_color);
        }

        // 2. Background Color & Background Image
        if (appearance.background_color) {
          document.body.style.backgroundColor = appearance.background_color;
          rootStyle.setProperty("--bg", appearance.background_color);
        }
        if (appearance.background_image) {
          const safeUrl = appearance.background_image.replaceAll('"', "%22");
          const opacity = Math.min(
            95,
            Math.max(0, Number(appearance.background_overlay_opacity || 0)),
          );
          if (opacity > 0) {
            const alpha = (opacity / 100).toFixed(2);
            document.body.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, ${alpha}), rgba(255, 255, 255, ${alpha})), url("${safeUrl}")`;
          } else {
            document.body.style.backgroundImage = `url("${safeUrl}")`;
          }
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          document.body.style.backgroundAttachment = "fixed";
        }

        // 3. Video Banners & Video Replacements
        const allVideos = appearance.videos || [];
        setBannerVideos(allVideos.filter((v) => v.mode === "banner"));
        const replaceVideos = allVideos.filter((v) => v.mode === "replace");

        const textRules = (appearance.text_replacements || []).filter(
          (r) => r.source_text && r.source_text !== r.replacement_text,
        );

        const applyDomOverrides = () => {
          // Brand Logo Override
          if (appearance.logo_url) {
            const logoImgs =
              document.querySelectorAll<HTMLImageElement>(".brand img");
            for (const img of logoImgs) {
              if (!img.dataset.appearanceOriginalSrc) {
                img.dataset.appearanceOriginalSrc =
                  img.getAttribute("src") || "";
                img.dataset.appearanceOriginalSrcset =
                  img.getAttribute("srcset") || "";
              }
              img.dataset.appearanceReplacement = appearance.logo_url;
              if (img.getAttribute("src") !== appearance.logo_url) {
                img.setAttribute("src", appearance.logo_url);
                img.removeAttribute("srcset");
              }
            }
          }

          // Top Announcement Override
          const customAnnouncement =
            lang === "bn"
              ? appearance.announcement_text_bn || appearance.announcement_text_en
              : appearance.announcement_text_en || appearance.announcement_text_bn;
          if (customAnnouncement) {
            const annSpan = document.querySelector(".announcement > span");
            if (annSpan) {
              for (const child of Array.from(annSpan.childNodes)) {
                if (
                  child.nodeType === Node.ELEMENT_NODE &&
                  !(child as HTMLElement).classList.contains("status-dot")
                ) {
                  if (child.textContent !== customAnnouncement) {
                    child.textContent = customAnnouncement;
                  }
                }
              }
            }
          }

          // Image Replacements
          for (const image of document.images) {
            if (appearance.logo_url && image.closest(".brand")) continue;
            const applied = image.dataset.appearanceReplacement;
            const currentSource = image.getAttribute("src") || "";
            if (applied && currentSource !== applied) {
              image.dataset.appearanceOriginalSrc = currentSource;
              image.dataset.appearanceOriginalSrcset =
                image.getAttribute("srcset") || "";
              delete image.dataset.appearanceReplacement;
            }

            const replacement = (appearance.image_replacements || []).find(
              (item) => matchesSource(image, item),
            );
            if (replacement) {
              if (!image.dataset.appearanceOriginalSrc) {
                image.dataset.appearanceOriginalSrc = currentSource;
                image.dataset.appearanceOriginalSrcset =
                  image.getAttribute("srcset") || "";
              }
              image.dataset.appearanceReplacement = replacement.image;
              if (currentSource !== replacement.image) {
                image.setAttribute("src", replacement.image);
                image.removeAttribute("srcset");
              }
            } else if (image.dataset.appearanceReplacement) {
              restoreImages([image]);
            }
          }

          // Video Element Replacements
          if (replaceVideos.length > 0) {
            const videoEls = document.querySelectorAll("video");
            for (const vid of videoEls) {
              if (vid.dataset.adminBannerVideo === "true") continue;
              const currentSrc =
                vid.currentSrc ||
                vid.getAttribute("src") ||
                vid.querySelector("source")?.getAttribute("src") ||
                "";
              const match = replaceVideos.find(
                (rv) =>
                  !rv.source_video_url ||
                  rv.source_video_url === "*" ||
                  normalizePathOrUrl(currentSrc) ===
                    normalizePathOrUrl(rv.source_video_url),
              );
              if (match && vid.getAttribute("src") !== match.video_url) {
                vid.setAttribute("src", match.video_url);
                if (match.poster_url) vid.setAttribute("poster", match.poster_url);
                vid.querySelectorAll("source").forEach((s) => s.remove());
                vid.load();
              }
            }
          }

          // Text Replacements
          if (textRules.length > 0) {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
            );
            let node = walker.nextNode() as Text | null;
            while (node) {
              const parentTag = node.parentElement?.tagName || "";
              if (!SKIP_TEXT_PARENTS.has(parentTag)) {
                const baseVal = originalTextMap.has(node)
                  ? (originalTextMap.get(node) as string)
                  : node.nodeValue || "";
                if (!originalTextMap.has(node)) {
                  originalTextMap.set(node, baseVal);
                }
                let nextVal = baseVal;
                for (const rule of textRules) {
                  if (nextVal.includes(rule.source_text)) {
                    nextVal = nextVal
                      .split(rule.source_text)
                      .join(rule.replacement_text);
                  }
                }
                if (node.nodeValue !== nextVal) {
                  node.nodeValue = nextVal;
                  touchedTextNodes.add(node);
                }
              }
              node = walker.nextNode() as Text | null;
            }
          }
        };

        applyDomOverrides();
        observer = new MutationObserver(applyDomOverrides);
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["alt", "src", "srcset"],
          childList: true,
          subtree: true,
        });
      } catch (error) {
        console.error("Unable to load page appearance.", error);
      }
    }

    void loadAppearance();
    const onRefresh = () => void loadAppearance();
    window.addEventListener("uservice:appearance-updated", onRefresh);

    return () => {
      active = false;
      window.removeEventListener("uservice:appearance-updated", onRefresh);
      observer?.disconnect();
      restoreImages(document.images);
      for (const node of touchedTextNodes) {
        const orig = originalTextMap.get(node);
        if (orig !== undefined && node.isConnected) {
          node.nodeValue = orig;
        }
      }
      document.body.style.backgroundImage = previousBackground;
      document.body.style.backgroundColor = previousBgColor;
      document.body.style.backgroundSize = previousSize;
      document.body.style.backgroundPosition = previousPosition;
      document.body.style.backgroundAttachment = previousAttachment;
      rootStyle.setProperty("--purple", prevVars.purple);
      rootStyle.setProperty("--pink", prevVars.pink);
      rootStyle.setProperty("--green", prevVars.green);
      rootStyle.setProperty("--ink", prevVars.ink);
      rootStyle.setProperty("--bg", prevVars.bg);
    };
  }, [pathname, lang]);

  return (
    <PageVideosContext.Provider value={bannerVideos}>
      {children}
    </PageVideosContext.Provider>
  );
}

export function PageAppearance() {
  return null;
}

export function PageVideoSlot({ position }: { position: "top" | "bottom" }) {
  const videos = useContext(PageVideosContext);
  const { lang } = useApp();
  const matching = videos.filter((v) => v.position === position);
  if (!matching.length) return null;

  return (
    <section
      aria-label={lang === "bn" ? "ফিচারড ভিডিও" : "Featured Video"}
      style={{
        maxWidth: 1280,
        margin: "20px auto",
        padding: "0 clamp(16px, 3vw, 28px)",
        display: "grid",
        gap: 18,
      }}
    >
      {matching.map((vid) => {
        const heading =
          lang === "bn" ? vid.title_bn || vid.title : vid.title || vid.title_bn;
        const sub =
          lang === "bn"
            ? vid.subtitle_bn || vid.subtitle
            : vid.subtitle || vid.subtitle_bn;
        const ytEmbed = toYouTubeEmbedUrl(vid.video_url);

        return (
          <div
            key={vid.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e6dff0",
              borderRadius: 16,
              padding: "18px 20px",
              boxShadow: "0 6px 20px rgba(18, 16, 24, 0.05)",
            }}
          >
            {(heading || sub) && (
              <div style={{ marginBottom: 12 }}>
                {heading && (
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(1.2rem, 2.2vw, 1.65rem)",
                      color: "#121018",
                      fontWeight: 800,
                    }}
                  >
                    {heading}
                  </h2>
                )}
                {sub && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#4a4358",
                      fontSize: 14,
                    }}
                  >
                    {sub}
                  </p>
                )}
              </div>
            )}
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "#121018",
                aspectRatio: "16 / 9",
                maxHeight: 540,
                width: "100%",
              }}
            >
              {ytEmbed ? (
                <iframe
                  src={ytEmbed}
                  title={heading || "U Service BD Video"}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  data-admin-banner-video="true"
                  src={vid.video_url}
                  poster={vid.poster_url || undefined}
                  controls={vid.controls}
                  autoPlay={vid.autoplay}
                  muted={vid.muted || vid.autoplay}
                  loop={vid.loop}
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
