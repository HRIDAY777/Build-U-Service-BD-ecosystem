"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Film,
  FolderUp,
  Image as ImageIcon,
  Palette,
  Plus,
  RotateCcw,
  ScanSearch,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";

type AppearanceConfig = {
  id?: number;
  page_path: string;
  background_image_url: string;
  background_url: string;
  background_color: string;
  background_overlay_opacity: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  logo_url: string;
  announcement_text_bn: string;
  announcement_text_en: string;
  configured_paths: string[];
};

type ImageRuleRow = {
  id: number;
  page_path_display: string;
  source_alt: string;
  source_url: string;
  effective_image: string;
  active: boolean;
};

type TextRuleRow = {
  id: number;
  page_path_display: string;
  source_text: string;
  replacement_text: string;
  note: string;
  active: boolean;
};

type VideoBlockRow = {
  id: number;
  page_path_display: string;
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
  active: boolean;
};

type MediaAssetRow = {
  id: number;
  title: string;
  kind: "image" | "video";
  url: string;
  created_at: string;
};

type ScannedImage = { src: string; alt: string };

const PRESET_PAGES: { path: string; bn: string; en: string }[] = [
  { path: "/*", bn: "🌐 পুরো ওয়েবসাইট (Global — সব পেজ)", en: "🌐 Global (All Website Pages)" },
  { path: "/", bn: "🏠 হোমপেজ (/)", en: "🏠 Homepage (/)" },
  { path: "/catalog", bn: "🛍️ প্রোডাক্ট শপ ও সব সেবা (/catalog)", en: "🛍️ Shop & Catalog (/catalog)" },
  { path: "/delivery", bn: "📦 পার্সেল ডেলিভারি (/delivery)", en: "📦 Parcel Delivery (/delivery)" },
  { path: "/events", bn: "🎉 বিয়ে ও ইভেন্ট (/events)", en: "🎉 Weddings & Events (/events)" },
  { path: "/projects", bn: "🏗️ প্রজেক্ট ও বিনিয়োগ (/projects)", en: "🏗️ Projects & Investment (/projects)" },
  { path: "/pages/about", bn: "ℹ️ আমাদের সম্পর্কে (/pages/about)", en: "ℹ️ About Us (/pages/about)" },
  { path: "/contact", bn: "📞 যোগাযোগ (/contact)", en: "📞 Contact (/contact)" },
  { path: "/blog", bn: "📰 নিউজ ও ব্লগ (/blog)", en: "📰 News & Blog (/blog)" },
  { path: "/stores", bn: "🏪 স্টোর ও রেস্টুরেন্ট (/stores)", en: "🏪 Stores & Restaurants (/stores)" },
  { path: "/mechanic", bn: "🔧 গাড়ি ও বাইক মেকানিক (/mechanic)", en: "🔧 Vehicle Mechanic (/mechanic)" },
  { path: "/checkout", bn: "💳 চেকআউট পেজ (/checkout)", en: "💳 Checkout (/checkout)" },
  { path: "/login", bn: "🔐 লগইন ও রেজিস্ট্রেশন (/login)", en: "🔐 Sign In & Register (/login)" },
];

function decodeNextImageSrc(rawSrc: string): string {
  if (!rawSrc) return "";
  try {
    const parsed = new URL(rawSrc, window.location.origin);
    if (parsed.pathname === "/_next/image") {
      return parsed.searchParams.get("url") || rawSrc;
    }
    if (parsed.origin === window.location.origin) {
      return parsed.pathname;
    }
    return parsed.href;
  } catch {
    return rawSrc;
  }
}

export function AdminAppearanceStudio() {
  const { lang, toast } = useApp();
  const [targetPath, setTargetPath] = useState<string>("/*");
  const [customPath, setCustomPath] = useState<string>("");
  const [subTab, setSubTab] = useState<"bg" | "images" | "text" | "video" | "library">("bg");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [config, setConfig] = useState<AppearanceConfig>({
    page_path: "/*",
    background_image_url: "",
    background_url: "",
    background_color: "",
    background_overlay_opacity: 0,
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    text_color: "",
    logo_url: "",
    announcement_text_bn: "",
    announcement_text_en: "",
    configured_paths: [],
  });

  const [imageRules, setImageRules] = useState<ImageRuleRow[]>([]);
  const [textRules, setTextRules] = useState<TextRuleRow[]>([]);
  const [videoBlocks, setVideoBlocks] = useState<VideoBlockRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);

  // Prefill helpers when clicking from the Live Page Scanner
  const [prefillImgSourceUrl, setPrefillImgSourceUrl] = useState("");
  const [prefillImgSourceAlt, setPrefillImgSourceAlt] = useState("");
  const [prefillTextSource, setPrefillTextSource] = useState("");
  const [prefillVideoUrl, setPrefillVideoUrl] = useState("");

  // Live Page Scanner state
  const [scanning, setScanning] = useState(false);
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  const [scannedTexts, setScannedTexts] = useState<string[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const encoded = encodeURIComponent(targetPath);
      const [cfg, imgs, txts, vids, lib] = await Promise.all([
        api<AppearanceConfig>(`admin-control/appearance/?path=${encoded}`),
        api<ImageRuleRow[]>(`admin-control/image-replacements/?path=${encoded}`),
        api<TextRuleRow[]>(`admin-control/text-replacements/?path=${encoded}`),
        api<VideoBlockRow[]>(`admin-control/video-blocks/?path=${encoded}`),
        api<MediaAssetRow[]>("admin-control/media-assets/"),
      ]);
      setConfig(cfg);
      setImageRules(imgs);
      setTextRules(txts);
      setVideoBlocks(vids);
      setMediaAssets(lib);
    } catch (e) {
      setError(String(e));
    }
  }, [targetPath]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function runTask(fn: () => Promise<void>, bnMsg: string, enMsg: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      toast(lang === "bn" ? bnMsg : enMsg);
      window.dispatchEvent(new Event("uservice:appearance-updated"));
      await loadAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAssetQuick(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name);
    const created = await api<MediaAssetRow>("admin-control/media-assets/", "POST", fd);
    return created.url;
  }

  async function scanSelectedPage() {
    const scanUrl = targetPath === "/*" ? "/" : targetPath;
    setScanning(true);
    setError("");
    try {
      const res = await fetch(scanUrl, { cache: "no-store" });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const foundImgs: ScannedImage[] = [];
      const seenImg = new Set<string>();
      doc.querySelectorAll("img").forEach((img) => {
        const raw = img.getAttribute("src") || "";
        const src = decodeNextImageSrc(raw);
        const alt = (img.getAttribute("alt") || "").trim();
        if (src && !seenImg.has(src)) {
          seenImg.add(src);
          foundImgs.push({ src, alt });
        }
      });

      const foundTxts: string[] = [];
      const seenTxt = new Set<string>();
      doc.querySelectorAll("h1, h2, h3, p, button, a, span").forEach((el) => {
        if (el.children.length > 2) return;
        const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (txt.length >= 3 && txt.length <= 180 && !seenTxt.has(txt)) {
          seenTxt.add(txt);
          foundTxts.push(txt);
        }
      });

      setScannedImages(foundImgs.slice(0, 40));
      setScannedTexts(foundTxts.slice(0, 60));
      setScannerOpen(true);
      toast(
        lang === "bn"
          ? `${foundImgs.length}টি ছবি ও ${foundTxts.length}টি টেক্সট পাওয়া গেছে!`
          : `Found ${foundImgs.length} images and ${foundTxts.length} text items!`,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  }

  const livePreviewHref = targetPath === "/*" ? "/" : targetPath;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Page Selector & Live Scanner Header */}
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>
              <Text
                bn="কোন পেজের ব্যাকগ্রাউন্ড, ছবি, লেখা বা ভিডিও নিয়ন্ত্রণ করবেন?"
                en="Select Target Page (or Global Website)"
              />
            </h2>
            <p className="subtle" style={{ margin: "4px 0 0", fontSize: 13 }}>
              <Text
                bn="পুরো ওয়েবসাইটের সব পেজে একসাথে পরিবর্তনের জন্য '🌐 পুরো ওয়েবসাইট (Global)' বেছে নিন, অথবা নির্দিষ্ট পেজ সিলেক্ট করুন।"
                en="Choose 'Global (/*)' to apply across every page on the website, or pick a specific page."
              />
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="button secondary"
              disabled={scanning}
              onClick={() => void scanSelectedPage()}
            >
              <ScanSearch size={15} />
              <Text
                bn={scanning ? "স্ক্যান হচ্ছে..." : "এই পেজের ছবি ও লেখা স্ক্যান করুন"}
                en={scanning ? "Scanning..." : "Scan Page Images & Text"}
              />
            </button>
            <a
              href={livePreviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="button"
            >
              <ExternalLink size={15} />
              <Text bn="লাইভ পেজ দেখুন" en="Open Live Page" />
            </a>
          </div>
        </div>

        <div className="admin-toolbar" style={{ alignItems: "center" }}>
          <select
            value={PRESET_PAGES.some((p) => p.path === targetPath) ? targetPath : "__custom__"}
            onChange={(e) => {
              if (e.target.value !== "__custom__") {
                setTargetPath(e.target.value);
                setScannerOpen(false);
              }
            }}
            style={{ fontWeight: 700, minWidth: 280 }}
          >
            {PRESET_PAGES.map((p) => (
              <option key={p.path} value={p.path}>
                {lang === "bn" ? p.bn : p.en}
              </option>
            ))}
            {!PRESET_PAGES.some((p) => p.path === targetPath) && (
              <option value="__custom__">Custom: {targetPath}</option>
            )}
          </select>

          <form
            style={{ display: "flex", gap: 8, flex: 1, minWidth: 220 }}
            onSubmit={(e) => {
              e.preventDefault();
              const clean = customPath.trim();
              if (clean.startsWith("/")) {
                setTargetPath(clean);
                setCustomPath("");
              }
            }}
          >
            <input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder={
                lang === "bn"
                  ? "কাস্টম পেজ পাথ (যেমন: /pages/privacy বা /loyalty)"
                  : "Custom path (e.g. /pages/privacy)"
              }
            />
            <button type="submit" className="button secondary">
              <Text bn="লোড" en="Load" />
            </button>
          </form>
        </div>

        {/* Sub-navigation Tabs for Visual Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {[
            {
              id: "bg" as const,
              bn: "🎨 ব্যাকগ্রাউন্ড, কালার ও লোগো",
              en: "🎨 Background, Colors & Logo",
              Icon: Palette,
            },
            {
              id: "images" as const,
              bn: `🖼️ ছবি পরিবর্তন (${imageRules.length})`,
              en: `🖼️ Images Control (${imageRules.length})`,
              Icon: ImageIcon,
            },
            {
              id: "text" as const,
              bn: `✍️ লেখা / টেক্সট পরিবর্তন (${textRules.length})`,
              en: `✍️ Text Control (${textRules.length})`,
              Icon: Type,
            },
            {
              id: "video" as const,
              bn: `🎬 ভিডিও কন্ট্রোল (${videoBlocks.length})`,
              en: `🎬 Video Control (${videoBlocks.length})`,
              Icon: Film,
            },
            {
              id: "library" as const,
              bn: `📁 মিডিয়া আপলোড লাইব্রেরি (${mediaAssets.length})`,
              en: `📁 Media Upload Library (${mediaAssets.length})`,
              Icon: FolderUp,
            },
          ].map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setSubTab(tabItem.id)}
              className={subTab === tabItem.id ? "button" : "button secondary"}
              style={{ minHeight: 38, padding: "8px 14px", fontSize: 13 }}
            >
              <tabItem.Icon size={15} />
              {lang === "bn" ? tabItem.bn : tabItem.en}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      {/* Scanned Live Page Elements Drawer */}
      {scannerOpen && (
        <section className="admin-card" style={{ borderColor: "#6b1199" }}>
          <div className="admin-card-head">
            <h2>
              <Text
                bn={`স্ক্যানকৃত এলিমেন্ট (${targetPath === "/*" ? "/" : targetPath}) — ক্লিক করে সরাসরি পরিবর্তন করুন`}
                en={`Scanned Page Elements (${targetPath === "/*" ? "/" : targetPath})`}
              />
            </h2>
            <button
              type="button"
              className="admin-mini-btn"
              onClick={() => setScannerOpen(false)}
            >
              <Text bn="বন্ধ করুন ✕" en="Close ✕" />
            </button>
          </div>

          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>
            <Text bn="পেজের ছবিসমূহ (Images):" en="Images on Page:" />
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {scannedImages.map((img, idx) => (
              <div
                key={`${img.src}-${idx}`}
                style={{
                  border: "1px solid #e6dff0",
                  borderRadius: 10,
                  padding: 8,
                  background: "#faf8fc",
                  display: "grid",
                  gap: 6,
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{
                    width: "100%",
                    height: 90,
                    objectFit: "cover",
                    borderRadius: 6,
                    background: "#eee",
                  }}
                />
                <small
                  style={{
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={img.src}
                >
                  {img.alt || img.src}
                </small>
                <button
                  type="button"
                  className="admin-mini-btn"
                  onClick={() => {
                    setPrefillImgSourceUrl(img.src);
                    setPrefillImgSourceAlt(img.alt);
                    setSubTab("images");
                    setScannerOpen(false);
                  }}
                >
                  <Text bn="🖼️ এই ছবি বদলান" en="🖼️ Replace Image" />
                </button>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>
            <Text bn="পেজের লেখাসমূহ (Texts & Headings):" en="Texts & Headings on Page:" />
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {scannedTexts.map((txt, idx) => (
              <button
                key={idx}
                type="button"
                className="admin-mini-btn"
                style={{ textAlign: "left", maxWidth: 340 }}
                onClick={() => {
                  setPrefillTextSource(txt);
                  setSubTab("text");
                  setScannerOpen(false);
                }}
              >
                ✍️ {txt.length > 55 ? `${txt.slice(0, 55)}...` : txt}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* TAB 1: BACKGROUND, THEME COLORS, LOGO & TOPBAR */}
      {subTab === "bg" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Text
                bn={`ব্যাকগ্রাউন্ড ইমেজ, ব্যাকগ্রাউন্ড কালার, থিম কালার ও লোগো (${targetPath})`}
                en={`Background Image, Colors, Brand Logo & Topbar (${targetPath})`}
              />
            </h2>
            <button
              type="button"
              className="admin-mini-btn danger"
              disabled={busy}
              onClick={() =>
                void runTask(
                  async () => {
                    await api("admin-control/appearance/", "PATCH", {
                      page_path: targetPath,
                      clear_background: true,
                      primary_color: "",
                      secondary_color: "",
                      accent_color: "",
                      text_color: "",
                    });
                  },
                  "ব্যাকগ্রাউন্ড ও কালার ডিফল্টে রিসেট হয়েছে।",
                  "Background & colors reset to default.",
                )
              }
            >
              <RotateCcw size={13} />{" "}
              <Text bn="ডিফল্ট ব্যাকগ্রাউন্ড ও কালারে ফিরুন" en="Reset to Default" />
            </button>
          </div>

          {config.background_image_url && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d9d0ea",
                background: "#faf8fc",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <img
                src={config.background_image_url}
                alt="Current background"
                style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8 }}
              />
              <div>
                <strong>
                  <Text bn="বর্তমান সক্রিয় ব্যাকগ্রাউন্ড ইমেজ:" en="Active Background Image:" />
                </strong>
                <div style={{ fontSize: 12, color: "#584f68" }}>{config.background_image_url}</div>
              </div>
            </div>
          )}

          <form
            key={`${config.page_path}-${config.background_image_url}-${config.background_color}`}
            className="admin-form-grid"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("page_path", targetPath);
              const fileInput = e.currentTarget.elements.namedItem(
                "background_image_file",
              ) as HTMLInputElement | null;
              const chosenFile = fileInput?.files?.[0];
              if (chosenFile) {
                fd.set("background_image", chosenFile);
              }
              fd.delete("background_image_file");
              void runTask(
                async () => {
                  await api("admin-control/appearance/", "PATCH", fd);
                },
                "ওয়েবসাইটের ব্যাকগ্রাউন্ড, কালার ও ব্র্যান্ড সেটিংস সংরক্ষিত হয়েছে!",
                "Background, colors & brand settings saved!",
              );
            }}
          >
            <label className="field">
              <Text
                bn="পিসি থেকে ব্যাকগ্রাউন্ড ছবি আপলোড করুন (JPG/PNG/WEBP)"
                en="Upload Background Image from PC"
              />
              <input type="file" name="background_image_file" accept="image/*" />
            </label>

            <label className="field">
              <Text
                bn="অথবা ব্যাকগ্রাউন্ড ইমেজ URL দিন"
                en="Or Background Image URL"
              />
              <input
                name="background_url"
                defaultValue={config.background_url}
                placeholder="/images/... বা https://..."
              />
            </label>

            <label className="field">
              <Text
                bn="ব্যাকগ্রাউন্ড সলিড কালার (যেমন: #ffffff বা #faf7ff)"
                en="Solid Background Color"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  defaultValue={
                    config.background_color?.startsWith("#")
                      ? config.background_color
                      : "#ffffff"
                  }
                  onChange={(e) => {
                    const txt = e.currentTarget.nextElementSibling as HTMLInputElement | null;
                    if (txt) txt.value = e.target.value;
                  }}
                  style={{ width: 48, padding: 2, height: 40 }}
                />
                <input
                  name="background_color"
                  defaultValue={config.background_color}
                  placeholder="#ffffff"
                />
              </div>
            </label>

            <label className="field">
              <Text
                bn="ব্যাকগ্রাউন্ড ছবির ওপর সাদা আবরণ (লেখা স্পষ্ট রাখার জন্য ০-৯৫%)"
                en="Background Readability Tint (0-95%)"
              />
              <input
                type="number"
                min="0"
                max="95"
                name="background_overlay_opacity"
                defaultValue={config.background_overlay_opacity ?? 75}
              />
            </label>

            <label className="field">
              <Text bn="প্রাইমারি থিম কালার (বেগুনি #6b1199)" en="Primary Color (--purple)" />
              <input
                name="primary_color"
                defaultValue={config.primary_color}
                placeholder="#6b1199"
              />
            </label>

            <label className="field">
              <Text bn="সেকেন্ডারি কালার (গোলাপি #d81b60)" en="Secondary Color (--pink)" />
              <input
                name="secondary_color"
                defaultValue={config.secondary_color}
                placeholder="#d81b60"
              />
            </label>

            <label className="field">
              <Text bn="অ্যাকশন কালার (সবুজ #0a7a3b)" en="Accent Color (--green)" />
              <input
                name="accent_color"
                defaultValue={config.accent_color}
                placeholder="#0a7a3b"
              />
            </label>

            <label className="field">
              <Text bn="মূল টেক্সট কালার (কালো #121018)" en="Text Color (--ink)" />
              <input
                name="text_color"
                defaultValue={config.text_color}
                placeholder="#121018"
              />
            </label>

            <label className="field">
              <Text bn="ওয়েবসাইট লোগো URL (পরিবর্তন করতে চাইলে)" en="Brand Logo Image URL" />
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  id="admin-logo-url-input"
                  name="logo_url"
                  defaultValue={config.logo_url}
                  placeholder="/images/brand/u-service-logo-transparent.png"
                />
                <label
                  className="admin-mini-btn"
                  style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                  title="Upload Logo"
                >
                  <Upload size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      void runTask(
                        async () => {
                          const url = await uploadAssetQuick(f);
                          const el = document.getElementById(
                            "admin-logo-url-input",
                          ) as HTMLInputElement | null;
                          if (el) el.value = url;
                          await api("admin-control/appearance/", "PATCH", {
                            page_path: targetPath,
                            logo_url: url,
                          });
                        },
                        "নতুন লোগো আপলোড ও সেট হয়েছে!",
                        "Logo uploaded and applied!",
                      );
                    }}
                  />
                </label>
              </div>
            </label>

            <label className="field">
              <Text bn="টপবার ঘোষণা টেক্সট (বাংলা)" en="Topbar Announcement (Bangla)" />
              <input
                name="announcement_text_bn"
                defaultValue={config.announcement_text_bn}
                placeholder="একটি অ্যাকাউন্ট। প্রতিদিনের সব সেবা।"
              />
            </label>

            <label className="field">
              <Text bn="টপবার ঘোষণা টেক্সট (ইংরেজি)" en="Topbar Announcement (English)" />
              <input
                name="announcement_text_en"
                defaultValue={config.announcement_text_en}
                placeholder="One account. Your everyday, connected."
              />
            </label>

            <div className="full-span">
              <button className="button" disabled={busy}>
                <Palette size={16} />{" "}
                <Text
                  bn="ব্যাকগ্রাউন্ড, কালার ও লোগো সংরক্ষণ করুন"
                  en="Save Background, Colors & Logo"
                />
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 2: ALL IMAGES CONTROL */}
      {subTab === "images" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Text
                bn={`ওয়েবসাইটের যেকোনো ছবি পরিবর্তন (${targetPath})`}
                en={`Replace Any Image on ${targetPath}`}
              />
            </h2>
          </div>

          <form
            key={`${prefillImgSourceUrl}-${prefillImgSourceAlt}`}
            className="admin-form-grid"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const fd = new FormData(formEl);
              fd.set("page_path", targetPath);
              fd.set("active", "true");
              const fileInput = formEl.elements.namedItem(
                "image_file",
              ) as HTMLInputElement | null;
              if (fileInput?.files?.[0]) {
                fd.set("image", fileInput.files[0]);
              }
              fd.delete("image_file");

              void runTask(
                async () => {
                  await api("admin-control/image-replacements/", "POST", fd);
                  setPrefillImgSourceUrl("");
                  setPrefillImgSourceAlt("");
                  formEl.reset();
                },
                "ছবি সফলভাবে পরিবর্তন করা হয়েছে!",
                "Image replacement saved!",
              );
            }}
          >
            <label className="field">
              <Text
                bn="বর্তমান ছবির পাথ/URL (স্ক্যানার থেকে ক্লিক করলে অটো বসবে)"
                en="Current Image URL / Path"
              />
              <input
                name="source_url"
                defaultValue={prefillImgSourceUrl}
                placeholder="/images/photos/..."
              />
            </label>

            <label className="field">
              <Text bn="অথবা বর্তমান ছবির Alt টেক্সট" en="Or Current Image Alt Text" />
              <input
                name="source_alt"
                defaultValue={prefillImgSourceAlt}
                placeholder="e.g. Fresh Groceries"
              />
            </label>

            <label className="field">
              <Text bn="পিসি থেকে নতুন ছবি আপলোড করুন" en="Upload New Image from PC" />
              <input type="file" name="image_file" accept="image/*" />
            </label>

            <label className="field">
              <Text bn="অথবা নতুন ছবির URL দিন" en="Or New Image URL" />
              <input
                name="replacement_url"
                placeholder="/media/... বা https://..."
              />
            </label>

            <div style={{ display: "flex", alignItems: "flex-end", gridColumn: "span 2" }}>
              <button className="button" disabled={busy}>
                <Plus size={15} />{" "}
                <Text bn="ছবি পরিবর্তন যুক্ত করুন" en="Apply Image Replacement" />
              </button>
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><Text bn="নতুন ছবি" en="New Image" /></th>
                  <th><Text bn="কোন ছবিটি বদলানো হয়েছে" en="Target Image" /></th>
                  <th><Text bn="স্ট্যাটাস (✅)" en="Status" /></th>
                  <th><Text bn="মুছুন" en="Delete" /></th>
                </tr>
              </thead>
              <tbody>
                {imageRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <img
                        src={rule.effective_image}
                        alt=""
                        style={{
                          width: 76,
                          height: 48,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                    </td>
                    <td>
                      {rule.source_url && <div><code>{rule.source_url}</code></div>}
                      {rule.source_alt && <small>Alt: {rule.source_alt}</small>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-check-pill${rule.active ? " on" : ""}`}
                        onClick={() =>
                          void runTask(
                            () =>
                              api(
                                `admin-control/image-replacements/${rule.id}/`,
                                "PATCH",
                                { active: !rule.active },
                              ),
                            "ছবির রুল আপডেট হয়েছে।",
                            "Image rule updated.",
                          )
                        }
                      >
                        {rule.active ? "✅ Active" : "Paused"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={() =>
                          void runTask(
                            () =>
                              api(
                                `admin-control/image-replacements/${rule.id}/`,
                                "DELETE",
                              ),
                            "পূর্বের ছবিতে ফিরিয়ে নেওয়া হয়েছে।",
                            "Restored original image.",
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!imageRules.length && (
                  <tr>
                    <td colSpan={4}>
                      <Text
                        bn="এই পেজে এখনও কোনো ছবি পরিবর্তন করা হয়নি। উপরের 'এই পেজের ছবি ও লেখা স্ক্যান করুন' বাটনে ক্লিক করে যেকোনো ছবি বেছে নিন।"
                        en="No image replacements on this page yet. Click 'Scan Page Images & Text' above to pick any image."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: ALL TEXT CONTROL */}
      {subTab === "text" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Text
                bn={`ওয়েবসাইটের যেকোনো লেখা পরিবর্তন (${targetPath})`}
                en={`Edit Any Website Text (${targetPath})`}
              />
            </h2>
          </div>

          <form
            key={prefillTextSource}
            className="admin-form-grid"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const fd = new FormData(formEl);
              void runTask(
                async () => {
                  await api("admin-control/text-replacements/", "POST", {
                    page_path: targetPath,
                    source_text: String(fd.get("source_text") || "").trim(),
                    replacement_text: String(fd.get("replacement_text") || "").trim(),
                    note: String(fd.get("note") || "").trim(),
                    active: true,
                  });
                  setPrefillTextSource("");
                  formEl.reset();
                },
                "ওয়েবসাইটের লেখা সফলভাবে আপডেট হয়েছে!",
                "Website text updated!",
              );
            }}
          >
            <label className="field full-span">
              <Text
                bn="ওয়েবসাইটে বর্তমানে যে লেখাটি আছে (স্ক্যানার থেকে ক্লিক করলে অটো বসবে)"
                en="Current Text on Website"
              />
              <textarea
                name="source_text"
                rows={2}
                required
                defaultValue={prefillTextSource}
                placeholder="যেমন: প্রতিদিনের সব জরুরি সেবা এখন এক প্ল্যাটফর্মে"
              />
            </label>

            <label className="field full-span">
              <Text bn="নতুন যে লেখাটি দেখাতে চান" en="New Replacement Text" />
              <textarea
                name="replacement_text"
                rows={2}
                required
                placeholder="আপনার নতুন শিরোনাম, স্লোগান, ফোন নম্বর বা বিবরণ লিখুন..."
              />
            </label>

            <label className="field">
              <Text bn="নোট / সেকশনের নাম (ঐচ্ছিক)" en="Note / Section Label (Optional)" />
              <input name="note" placeholder="যেমন: হোমপেজ হিরো টাইটেল" />
            </label>

            <div style={{ display: "flex", alignItems: "flex-end", gridColumn: "span 2" }}>
              <button className="button" disabled={busy}>
                <Plus size={15} />{" "}
                <Text bn="লেখা পরিবর্তন সংরক্ষণ করুন" en="Save Text Change" />
              </button>
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><Text bn="আগের লেখা" en="Original Text" /></th>
                  <th><Text bn="নতুন লেখা" en="New Text" /></th>
                  <th><Text bn="স্ট্যাটাস (✅)" en="Status" /></th>
                  <th><Text bn="মুছুন" en="Delete" /></th>
                </tr>
              </thead>
              <tbody>
                {textRules.map((tr) => (
                  <tr key={tr.id}>
                    <td>
                      <small style={{ color: "#685f79" }}>{tr.source_text}</small>
                      {tr.note && (
                        <div>
                          <span className="status">{tr.note}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{tr.replacement_text}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-check-pill${tr.active ? " on" : ""}`}
                        onClick={() =>
                          void runTask(
                            () =>
                              api(
                                `admin-control/text-replacements/${tr.id}/`,
                                "PATCH",
                                { active: !tr.active },
                              ),
                            "লেখার রুল আপডেট হয়েছে।",
                            "Text rule updated.",
                          )
                        }
                      >
                        {tr.active ? "✅ Active" : "Paused"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={() =>
                          void runTask(
                            () =>
                              api(
                                `admin-control/text-replacements/${tr.id}/`,
                                "DELETE",
                              ),
                            "আগের লেখায় ফিরিয়ে নেওয়া হয়েছে।",
                            "Original text restored.",
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!textRules.length && (
                  <tr>
                    <td colSpan={4}>
                      <Text
                        bn="এই পেজে এখনও কোনো লেখা পরিবর্তন করা হয়নি।"
                        en="No text replacements configured for this page yet."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: ALL VIDEOS CONTROL */}
      {subTab === "video" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Text
                bn={`ভিডিও ব্যানার যুক্ত করুন অথবা ভিডিও পরিবর্তন করুন (${targetPath})`}
                en={`Add Video Showcase or Replace Video (${targetPath})`}
              />
            </h2>
          </div>

          <form
            key={prefillVideoUrl}
            className="admin-form-grid"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const fd = new FormData(formEl);
              void runTask(
                async () => {
                  let finalVideoUrl = String(fd.get("video_url") || "").trim();
                  const fileInput = formEl.elements.namedItem(
                    "video_file_upload",
                  ) as HTMLInputElement | null;
                  if (fileInput?.files?.[0]) {
                    finalVideoUrl = await uploadAssetQuick(fileInput.files[0]);
                  }
                  if (!finalVideoUrl) {
                    throw new Error(
                      lang === "bn"
                        ? "পিসি থেকে ভিডিও ফাইল সিলেক্ট করুন অথবা ভিডিও URL দিন।"
                        : "Upload a video file or provide a video URL.",
                    );
                  }
                  await api("admin-control/video-blocks/", "POST", {
                    page_path: targetPath,
                    mode: String(fd.get("mode") || "banner"),
                    position: String(fd.get("position") || "top"),
                    title_bn: String(fd.get("title_bn") || "").trim(),
                    title: String(fd.get("title") || "").trim(),
                    subtitle_bn: String(fd.get("subtitle_bn") || "").trim(),
                    subtitle: String(fd.get("subtitle") || "").trim(),
                    video_url: finalVideoUrl,
                    poster_url: String(fd.get("poster_url") || "").trim(),
                    source_video_url: String(fd.get("source_video_url") || "").trim(),
                    autoplay: fd.get("autoplay") === "on",
                    muted: fd.get("muted") === "on",
                    loop: fd.get("loop") === "on",
                    controls: fd.get("controls") === "on",
                    active: true,
                  });
                  setPrefillVideoUrl("");
                  formEl.reset();
                },
                "ভিডিও সফলভাবে যুক্ত ও লাইভ করা হয়েছে!",
                "Video saved and published!",
              );
            }}
          >
            <label className="field">
              <Text bn="ভিডিও মোড" en="Video Mode" />
              <select name="mode" defaultValue="banner">
                <option value="banner">
                  পেজে ভিডিও সেকশন দেখান (Show Video Showcase Banner)
                </option>
                <option value="replace">
                  পেজের বর্তমান ভিডিও বদলান (Replace Existing Video)
                </option>
              </select>
            </label>

            <label className="field">
              <Text bn="পেজের কোথায় দেখাবে?" en="Position on Page" />
              <select name="position" defaultValue="top">
                <option value="top">পেজের শুরুতে (Top / Hero Section)</option>
                <option value="bottom">পেজের নিচে (Bottom Section)</option>
              </select>
            </label>

            <label className="field">
              <Text
                bn="পিসি থেকে ভিডিও আপলোড করুন (MP4/WEBM — সর্বোচ্চ ৬০MB)"
                en="Upload Video File from PC (MP4/WEBM)"
              />
              <input type="file" name="video_file_upload" accept="video/mp4,video/webm,video/quicktime" />
            </label>

            <label className="field">
              <Text
                bn="অথবা YouTube / MP4 ভিডিও লিংক দিন"
                en="Or YouTube / MP4 Video URL"
              />
              <input
                name="video_url"
                defaultValue={prefillVideoUrl}
                placeholder="https://www.youtube.com/watch?v=... বা /videos/..."
              />
            </label>

            <label className="field">
              <Text bn="ভিডিওর শিরোনাম (বাংলা — ঐচ্ছিক)" en="Video Title (Bangla)" />
              <input name="title_bn" placeholder="যেমন: আমাদের সেবা কীভাবে কাজ করে দেখুন" />
            </label>

            <label className="field">
              <Text bn="ভিডিওর শিরোনাম (ইংরেজি — ঐচ্ছিক)" en="Video Title (English)" />
              <input name="title" placeholder="See how U Service BD works" />
            </label>

            <label className="field">
              <Text bn="সংক্ষিপ্ত সাবটাইটেল (বাংলা)" en="Subtitle (Bangla)" />
              <input name="subtitle_bn" placeholder="এক নজরে আমাদের প্রোডাক্ট, হোম সার্ভিস ও ডেলিভারি" />
            </label>

            <label className="field">
              <Text bn="ভিডিও পোস্টার/থাম্বনেইল ছবি URL (ঐচ্ছিক)" en="Poster Thumbnail URL (Optional)" />
              <input name="poster_url" placeholder="/images/... বা https://..." />
            </label>

            <label className="field">
              <Text
                bn="টার্গেট ভিডিও URL (শুধু Replace মোডের জন্য, * মানে সব ভিডিও)"
                en="Target Video URL (Only for Replace mode)"
              />
              <input name="source_video_url" defaultValue="*" />
            </label>

            <div
              className="full-span"
              style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}
            >
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
                <input type="checkbox" name="controls" defaultChecked />
                <Text bn="প্লে/পজ কন্ট্রোল দেখান" en="Show Controls" />
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
                <input type="checkbox" name="autoplay" />
                <Text bn="অটোপ্লে (Autoplay)" en="Autoplay" />
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
                <input type="checkbox" name="muted" defaultChecked />
                <Text bn="মিউট অবস্থায় শুরু" en="Start Muted" />
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 700 }}>
                <input type="checkbox" name="loop" />
                <Text bn="বারবার চলবে (Loop)" en="Loop Video" />
              </label>
            </div>

            <div className="full-span">
              <button className="button" disabled={busy}>
                <Film size={16} />{" "}
                <Text bn="ভিডিও যুক্ত ও পাবলিশ করুন" en="Save & Publish Video" />
              </button>
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><Text bn="শিরোনাম ও লিংক" en="Title & Video URL" /></th>
                  <th><Text bn="মোড ও অবস্থান" en="Mode & Position" /></th>
                  <th><Text bn="স্ট্যাটাস (✅)" en="Status" /></th>
                  <th><Text bn="মুছুন" en="Delete" /></th>
                </tr>
              </thead>
              <tbody>
                {videoBlocks.map((vb) => (
                  <tr key={vb.id}>
                    <td>
                      <strong>{vb.title_bn || vb.title || "Video"}</strong>
                      <br />
                      <small>{vb.video_url}</small>
                    </td>
                    <td>
                      {vb.mode} · {vb.position}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-check-pill${vb.active ? " on" : ""}`}
                        onClick={() =>
                          void runTask(
                            () =>
                              api(`admin-control/video-blocks/${vb.id}/`, "PATCH", {
                                active: !vb.active,
                              }),
                            "ভিডিও স্ট্যাটাস আপডেট হয়েছে।",
                            "Video status updated.",
                          )
                        }
                      >
                        {vb.active ? "✅ Live" : "Hidden"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-mini-btn danger"
                        onClick={() =>
                          void runTask(
                            () =>
                              api(`admin-control/video-blocks/${vb.id}/`, "DELETE"),
                            "ভিডিও মুছে ফেলা হয়েছে।",
                            "Video removed.",
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!videoBlocks.length && (
                  <tr>
                    <td colSpan={4}>
                      <Text
                        bn="এই পেজে এখনও কোনো ভিডিও ব্যানার যুক্ত করা হয়নি।"
                        en="No videos added to this page yet."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: CENTRAL MEDIA UPLOAD LIBRARY */}
      {subTab === "library" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <Text
                bn="সেন্ট্রাল মিডিয়া লাইব্রেরি — ছবি ও ভিডিও আপলোড করুন"
                en="Central Media Library — Upload Images & Videos"
              />
            </h2>
          </div>

          <form
            className="admin-form-grid"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const fileInput = formEl.elements.namedItem(
                "file",
              ) as HTMLInputElement | null;
              const file = fileInput?.files?.[0];
              if (!file) return;
              const fd = new FormData(formEl);
              void runTask(
                async () => {
                  await api("admin-control/media-assets/", "POST", fd);
                  formEl.reset();
                },
                "ফাইল সফলভাবে আপলোড হয়েছে!",
                "Media file uploaded!",
              );
            }}
          >
            <label className="field">
              <Text bn="ফাইলের নাম (ঐচ্ছিক)" en="Title (Optional)" />
              <input name="title" placeholder="যেমন: ঈদ ব্যানার / প্রোমো ভিডিও" />
            </label>
            <label className="field">
              <Text
                bn="ছবি বা ভিডিও ফাইল সিলেক্ট করুন (JPG, PNG, WEBP, MP4, WEBM)"
                en="Choose Image or Video File"
              />
              <input
                type="file"
                name="file"
                required
                accept="image/*,video/mp4,video/webm,video/quicktime"
              />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="button" disabled={busy}>
                <Upload size={15} />{" "}
                <Text bn="আপলোড করুন" en="Upload to Library" />
              </button>
            </div>
          </form>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {mediaAssets.map((asset) => (
              <div
                key={asset.id}
                style={{
                  border: "1px solid #e6dff0",
                  borderRadius: 12,
                  padding: 10,
                  background: "#faf8fc",
                  display: "grid",
                  gap: 8,
                }}
              >
                {asset.kind === "video" ? (
                  <video
                    src={asset.url}
                    controls
                    muted
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                      background: "#121018",
                    }}
                  />
                ) : (
                  <img
                    src={asset.url}
                    alt={asset.title}
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                )}
                <strong style={{ fontSize: 12 }}>{asset.title}</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.url);
                      toast(
                        lang === "bn"
                          ? `কপি হয়েছে: ${asset.url}`
                          : `Copied: ${asset.url}`,
                      );
                    }}
                  >
                    <Copy size={12} /> <Text bn="URL কপি" en="Copy URL" />
                  </button>
                  {asset.kind === "video" && (
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() => {
                        setPrefillVideoUrl(asset.url);
                        setSubTab("video");
                      }}
                    >
                      <Text bn="ভিডিওতে বসান" en="Use in Video" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-mini-btn danger"
                    onClick={() =>
                      void runTask(
                        () =>
                          api(`admin-control/media-assets/${asset.id}/`, "DELETE"),
                        "ফাইল মুছে ফেলা হয়েছে।",
                        "Asset deleted.",
                      )
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
