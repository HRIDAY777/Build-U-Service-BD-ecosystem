import { notFound } from "next/navigation";
import { serverGet, Offering } from "@/lib/api";
import { OfferingDetail } from "@/components/forms";
import { ShopDiscovery } from "@/components/shop-discovery";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const item = await serverGet<Offering>(`offerings/${id}/`);
  if (!item) notFound();
  return (
    <>
      <OfferingDetail item={item} />
      {item.division_slug === "shop" && <ShopDiscovery id={item.id} />}
    </>
  );
}
