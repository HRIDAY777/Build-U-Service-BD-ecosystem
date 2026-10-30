import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";

const VALID_SECTIONS = new Set([
  "overview",
  "appearance",
  "products",
  "catalog-setup",
  "orders",
  "payments",
  "users",
  "partners",
  "projects",
  "cms",
  "support",
  "audit",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const label = section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${label} · Admin Control · U Service BD`,
    description: "Master admin control page for U Service BD.",
  };
}

export default async function AdminPanelSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!VALID_SECTIONS.has(section)) {
    notFound();
  }
  return <AdminDashboard section={section} />;
}
