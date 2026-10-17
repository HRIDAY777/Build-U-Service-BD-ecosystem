import { AnimatedBrand } from "@/components/animated-brand";
import { Text } from "@/components/provider";
export default function BrandAnimationPage() {
  return (
    <main
      id="main"
      className="container"
      style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 64px" }}
    >
      <h1
        style={{
          fontSize: "clamp(26px, 4vw, 42px)",
          fontWeight: 750,
          marginBottom: 12,
        }}
      >
        <Text
          bn="আপনার পরিচয়, নতুন মাত্রায়"
          en="Your identity, in a new dimension"
        />
      </h1>
      <p style={{ marginBottom: 24 }}>
        <Text
          bn="আপনার মূল লোগোর অংশগুলো জোড়া লেগে থ্রিডি রূপে সামনে আসে।"
          en="Your original logo assembles and comes forward in three dimensions."
        />
      </p>
      <AnimatedBrand exportable />
    </main>
  );
}
