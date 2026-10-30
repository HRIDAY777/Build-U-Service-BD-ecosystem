import { serverGet, Offering } from "@/lib/api";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/forms";
export default async function Book({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const item = await serverGet<Offering>(
    `offerings/${encodeURIComponent(id)}/`,
  );
  if (
    !item ||
    !["services", "electrician", "mechanic"].includes(item.division_slug)
  )
    notFound();
  const scheduledAt =
    typeof query.scheduled_at === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(query.scheduled_at)
      ? query.scheduled_at
      : "";
  const area = typeof query.area === "string" ? query.area.slice(0, 100) : "";
  return (
    <div className="page-wrap">
      <BookingForm
        item={item}
        defaultScheduledAt={scheduledAt}
        defaultArea={area}
      />
    </div>
  );
}
