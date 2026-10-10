import { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.uservicebd.com";
  return [
    "",
    "/catalog",
    "/delivery",
    "/contact",
    "/projects",
    "/pages/about",
  ].map((p) => ({
    url: base + p,
    changeFrequency: "weekly",
    priority: p ? 0.7 : 1,
  }));
}
