import type { NextConfig } from "next";
const backend = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";
const config: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return ["/api/:path*", "/admin/:path*", "/static/:path*", "/media/:path*"].map(
      (source) => ({
        source,
        destination: `${backend}${source}${source.startsWith("/static") || source.startsWith("/media") ? "" : "/"}`,
      }),
    );
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
