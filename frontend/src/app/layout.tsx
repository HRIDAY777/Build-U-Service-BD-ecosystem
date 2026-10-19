import { UiText } from "@/components/ui-text";
import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { Header, Footer } from "@/components/shell";
import "./globals.css";
import "./photos.css";
import "./depth.css";
import "./landing.css";
import "./catalog.css";
import { SpatialExperience } from "@/components/spatial-experience";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.uservicebd.com",
  ),
  title: {
    default: "U Service BD — আপনার প্রতিদিনের সঙ্গী",
    template: "%s | U Service BD",
  },
  description:
    "খাবার, কেনাকাটা, ঘরের সেবা ও ডেলিভারি — একসাথে U Service BD-তে।",
  icons: {
    icon: "/images/brand/u-service-logo.png",
    apple: "/images/brand/u-service-logo.png",
  },
  openGraph: { type: "website", locale: "bn_BD", siteName: "U Service BD" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" data-scroll-behavior="smooth">
      <body className="depth-ui">
        <Provider>
          <SpatialExperience />
          <a href="#main" className="skip-link">
            <UiText text={"Skip to content"} />
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Provider>
      </body>
    </html>
  );
}
