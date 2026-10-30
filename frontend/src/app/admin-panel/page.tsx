import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Master Admin Dashboard · U Service BD",
  description: "Full website master administration and control panel for U Service BD.",
};

export default function AdminPanelRootPage() {
  return <AdminDashboard section="overview" />;
}
