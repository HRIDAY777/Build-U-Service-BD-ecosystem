import { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/portal", "/admin", "/api", "/checkout"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.uservicebd.com"}/sitemap.xml`,
  };
}
