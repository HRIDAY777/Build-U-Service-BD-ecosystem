import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  redirect(
    reference && /^[0-9a-f-]{36}$/i.test(reference)
      ? `/delivery/${reference}`
      : "/delivery",
  );
}
