import { serverGet, Offering } from "@/lib/api";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/forms";
export default async function Book({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await serverGet<Offering>(
    `offerings/${encodeURIComponent(id)}/`,
  );
  if (
    !item ||
    !["services", "electrician", "mechanic"].includes(item.division_slug)
  )
    notFound();
  return (
    <div className="page-wrap">
      <BookingForm item={item} />
    </div>
  );
}
