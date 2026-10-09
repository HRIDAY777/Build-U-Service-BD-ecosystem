import { SharedWishlist } from "@/components/shared-wishlist";
export const metadata = {
  title: "Shared Wishlist | U Service BD",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedWishlist token={token} />;
}
