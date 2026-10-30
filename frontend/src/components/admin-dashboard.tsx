"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CreditCard,
  ExternalLink,
  FileText,
  FolderKanban,
  Headphones,
  Layers,
  LayoutDashboard,
  Package,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";
import { PaymentGatewayManager } from "./payment-gateways";
import { PartnerApplications } from "./partner-applications";
import { Account } from "./account";
import { AdminAppearanceStudio } from "./admin-appearance-studio";
import "@/app/admin-panel/admin-panel.css";

export const ADMIN_SECTIONS = [
  {
    key: "overview",
    href: "/admin-panel",
    bn: "ওভারভিউ ড্যাশবোর্ড",
    en: "Overview Dashboard",
    descBn: "পুরো ওয়েবসাইটের লাইভ হিসাব, রেভিনিউ ও সব কন্ট্রোল মডিউল।",
    descEn: "Live website metrics, revenue and all control modules.",
    Icon: LayoutDashboard,
  },
  {
    key: "appearance",
    href: "/admin-panel/appearance",
    bn: "ব্যাকগ্রাউন্ড, ছবি, লেখা ও ভিডিও",
    en: "Background, Images, Text & Video",
    descBn: "পুরো ওয়েবসাইটের ব্যাকগ্রাউন্ড, থিম কালার, সব ছবি, যেকোনো লেখা ও ভিডিও নিয়ন্ত্রণ।",
    descEn: "Control all website backgrounds, colors, images, text and videos.",
    Icon: Palette,
  },
  {
    key: "products",
    href: "/admin-panel/products",
    bn: "প্রোডাক্ট ও সার্ভিস",
    en: "Products & Services",
    descBn: "নতুন প্রোডাক্ট/সার্ভিস যোগ, দাম, স্টক ও Active ✅ কন্ট্রোল।",
    descEn: "Add/edit products & services, prices, stock and Active ✅ status.",
    Icon: ShoppingBag,
  },
  {
    key: "catalog-setup",
    href: "/admin-panel/catalog-setup",
    bn: "বিভাগ, ক্যাটাগরি ও ব্র্যান্ড",
    en: "Divisions, Categories & Brands",
    descBn: "সব ব্যবসা বিভাগ ✅, ক্যাটাগরি, শপ ব্র্যান্ড ও কালেকশন নিয়ন্ত্রণ।",
    descEn: "Control business divisions ✅, categories, brands and collections.",
    Icon: Layers,
  },
  {
    key: "orders",
    href: "/admin-panel/orders",
    bn: "অর্ডার, বুকিং ও ডেলিভারি",
    en: "Orders, Bookings & Delivery",
    descBn: "সকল অর্ডার, হোম সার্ভিস বুকিং, পার্সেল ডেলিভারি ও ইভেন্ট প্রসেসিং।",
    descEn: "Manage all orders, service bookings, deliveries, events & returns.",
    Icon: Package,
  },
  {
    key: "payments",
    href: "/admin-panel/payments",
    bn: "পেমেন্ট গেটওয়ে ও কুপন",
    en: "Payment Gateways & Coupons",
    descBn: "১১টি বাংলাদেশি পেমেন্ট গেটওয়ে ✅ অন/অফ এবং ডিসকাউন্ট কুপন তৈরি।",
    descEn: "Toggle 11 BD payment gateways ✅ and manage promo coupons.",
    Icon: CreditCard,
  },
  {
    key: "users",
    href: "/admin-panel/users",
    bn: "ইউজার ও রোল কন্ট্রোল",
    en: "Users & Roles Control",
    descBn: "সব অ্যাকাউন্ট, স্টাফ পারমিশন এবং প্রোভাইডার/রাইডার রোল অ্যাসাইন।",
    descEn: "Manage users, staff access and Provider/Rider/Staff roles.",
    Icon: Users,
  },
  {
    key: "partners",
    href: "/admin-panel/partners",
    bn: "স্টোর ও পার্টনার অনুমোদন",
    en: "Stores & Partner Approval",
    descBn: "শপ, রেস্টুরেন্ট, ফার্মেসি অনুমোদন ✅ এবং পার্টনার আবেদন যাচাই।",
    descEn: "Approve stores/restaurants ✅ and review partner applications.",
    Icon: Building2,
  },
  {
    key: "projects",
    href: "/admin-panel/projects",
    bn: "প্রজেক্ট ও ইনভেস্টর কন্ট্রোল",
    en: "Projects & Investors",
    descBn: "ইনভেস্টমেন্ট প্রজেক্ট তৈরি, অগ্রগতি (%) আপডেট ও পাবলিশ ✅ কন্ট্রোল।",
    descEn: "Create investment projects, update progress % and publish ✅.",
    Icon: FolderKanban,
  },
  {
    key: "cms",
    href: "/admin-panel/cms",
    bn: "পেজ (CMS), FAQ ও এরিয়া",
    en: "Pages (CMS), FAQs & Areas",
    descBn: "About/Privacy/Terms পেজ এডিট, হোমপেজ FAQ এবং ডেলিভারি চার্জ ও এরিয়া।",
    descEn: "Edit About/Privacy/Terms pages, FAQs and delivery areas/fees.",
    Icon: FileText,
  },
  {
    key: "support",
    href: "/admin-panel/support",
    bn: "সাপোর্ট, রিভিউ ও নোটিফিকেশন",
    en: "Support, Reviews & Broadcast",
    descBn: "সকল ইউজারকে নোটিফিকেশন পাঠানো, কাস্টমার রিভিউ মডারেশন ও সাপোর্ট ডেস্ক।",
    descEn: "Broadcast notifications, moderate reviews and open support desk.",
    Icon: Headphones,
  },
  {
    key: "audit",
    href: "/admin-panel/audit",
    bn: "অডিট লগ ও সিস্টেম",
    en: "Audit Logs & System",
    descBn: "কে কখন কী পরিবর্তন করেছে তার লাইভ সিকিউরিটি লগ ও সুপার অ্যাডমিন।",
    descEn: "Live security audit trail and Django Super-Admin access.",
    Icon: ShieldCheck,
  },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

type OverviewData = Record<string, number | string>;
type DivisionRow = {
  id: number;
  slug: string;
  name: string;
  name_bn: string;
  kind: string;
  active: boolean;
  offerings_count: number;
};
type CategoryRow = {
  id: number;
  division: number;
  division_name: string;
  name: string;
  name_bn: string;
  parent: number | null;
};
type BrandRow = { id: number; name: string; name_bn: string; active: boolean };
type CollectionRow = { id: number; name: string; name_bn: string; slug: string; active: boolean };
type OfferingRow = {
  id: number;
  division: number;
  division_slug: string;
  division_name: string;
  category: number | null;
  category_name: string;
  name: string;
  name_bn: string;
  sku: string;
  price: string;
  sale_price: string | null;
  stock: number;
  active: boolean;
  image: string;
  description: string;
  description_bn: string;
};
type CouponRow = {
  id: number;
  code: string;
  amount: string;
  minimum: string;
  limit: number;
  used: number;
  expires_at: string;
  active: boolean;
};
type UserRow = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  groups_display: string[];
};
type OrgRow = {
  id: number;
  name: string;
  division: number;
  division_name: string;
  owner: number;
  owner_username: string;
  approved: boolean;
  accepting_orders: boolean;
  area: string;
  address: string;
  minimum_order: string;
};
type ProjectRow = {
  id: number;
  title: string;
  title_bn: string;
  category: string;
  area: string;
  description: string;
  description_bn: string;
  image: string;
  published: boolean;
  progress: number;
};
type PageRow = {
  id: number;
  slug: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  description: string;
  published: boolean;
};
type FAQRow = {
  id: number;
  question: string;
  question_bn: string;
  answer: string;
  answer_bn: string;
  published: boolean;
  position: number;
};
type AreaRow = {
  id: number;
  name: string;
  name_bn: string;
  district: string;
  delivery_fee: string;
  active: boolean;
  divisions: number[];
};
type ReviewRow = {
  id: number;
  customer_username: string;
  rating: number;
  comment: string;
  created_at: string;
};
type LeadRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  status: string;
  created_at: string;
};
type LoyaltyRewardRow = {
  id: number;
  name: string;
  description: string;
  points_cost: number;
  active: boolean;
};
type ReturnRow = {
  id: number;
  order: string;
  customer_username: string;
  order_total: string;
  reason: string;
  status: string;
  review_note: string;
  created_at: string;
};
type AuditRow = {
  id: number;
  actor: string;
  action: string;
  entity: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ALL_ROLES = [
  "Provider",
  "Rider",
  "Support Agent",
  "Operations Manager",
  "Finance",
  "Content Manager",
];

export function AdminDashboard({ section = "overview" }: { section?: string }) {
  const { user, toast, lang } = useApp();
  const activeKey: AdminSectionKey = ADMIN_SECTIONS.some((s) => s.key === section)
    ? (section as AdminSectionKey)
    : "overview";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<OverviewData>({});

  // Module states
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [offeringFilterDiv, setOfferingFilterDiv] = useState("");
  const [offeringQuery, setOfferingQuery] = useState("");
  const [editingOffering, setEditingOffering] = useState<OfferingRow | null>(null);

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyRewardRow[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [editingPage, setEditingPage] = useState<PageRow | null>(null);
  const [faqs, setFaqs] = useState<FAQRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);

  const isAdmin = Boolean(user && (user.is_staff || user.is_superuser));

  const loadSectionData = useCallback(async () => {
    if (!isAdmin) return;
    setError("");
    try {
      const ov = await api<OverviewData>("admin-control/overview/");
      setOverview(ov);

      if (activeKey === "products") {
        const params = new URLSearchParams();
        if (offeringFilterDiv) params.set("division", offeringFilterDiv);
        if (offeringQuery) params.set("q", offeringQuery);
        const [divs, cats, offs] = await Promise.all([
          api<DivisionRow[]>("admin-control/divisions/"),
          api<CategoryRow[]>("admin-control/categories/"),
          api<OfferingRow[]>(`admin-control/offerings/?${params}`),
        ]);
        setDivisions(divs);
        setCategories(cats);
        setOfferings(offs);
      } else if (activeKey === "catalog-setup") {
        const [divs, cats, brs, cols] = await Promise.all([
          api<DivisionRow[]>("admin-control/divisions/"),
          api<CategoryRow[]>("admin-control/categories/"),
          api<BrandRow[]>("admin-control/brands/"),
          api<CollectionRow[]>("admin-control/collections/"),
        ]);
        setDivisions(divs);
        setCategories(cats);
        setBrands(brs);
        setCollections(cols);
      } else if (activeKey === "orders") {
        setReturns(await api<ReturnRow[]>("admin-control/returns/"));
      } else if (activeKey === "payments") {
        const [cpRows, lrRows] = await Promise.all([
          api<CouponRow[]>("admin-control/coupons/"),
          api<LoyaltyRewardRow[]>("admin-control/loyalty-rewards/"),
        ]);
        setCoupons(cpRows);
        setLoyaltyRewards(lrRows);
      } else if (activeKey === "users") {
        const q = userQuery ? `?q=${encodeURIComponent(userQuery)}` : "";
        setUsers(await api<UserRow[]>(`admin-control/users/${q}`));
      } else if (activeKey === "partners") {
        const [divs, orgRows] = await Promise.all([
          api<DivisionRow[]>("admin-control/divisions/"),
          api<OrgRow[]>("admin-control/organizations/"),
        ]);
        setDivisions(divs);
        setOrgs(orgRows);
      } else if (activeKey === "projects") {
        setProjects(await api<ProjectRow[]>("admin-control/projects/"));
      } else if (activeKey === "cms") {
        const [divs, pgRows, fqRows, arRows] = await Promise.all([
          api<DivisionRow[]>("admin-control/divisions/"),
          api<PageRow[]>("admin-control/pages/"),
          api<FAQRow[]>("admin-control/faqs/"),
          api<AreaRow[]>("admin-control/areas/"),
        ]);
        setDivisions(divs);
        setPages(pgRows);
        setFaqs(fqRows);
        setAreas(arRows);
      } else if (activeKey === "support") {
        const [rvRows, ldRows] = await Promise.all([
          api<ReviewRow[]>("admin-control/reviews/"),
          api<LeadRow[]>("admin-control/leads/"),
        ]);
        setReviews(rvRows);
        setLeads(ldRows);
      } else if (activeKey === "audit") {
        setAudits(await api<AuditRow[]>("admin-control/audit-logs/"));
      }
    } catch (e) {
      setError(String(e));
    }
  }, [isAdmin, activeKey, offeringFilterDiv, offeringQuery, userQuery]);

  useEffect(() => {
    void loadSectionData();
  }, [loadSectionData]);

  async function runAction(task: () => Promise<void>, successBn: string, successEn: string) {
    setBusy(true);
    setError("");
    try {
      await task();
      toast(lang === "bn" ? successBn : successEn);
      await loadSectionData();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="page-wrap narrow">
        <div className="admin-card">
          <h1>
            <Text bn="অ্যাডমিন কন্ট্রোল সেন্টারে লগইন করুন" en="Sign in to Admin Control Center" />
          </h1>
          <p>
            <Text
              bn="পুরো ওয়েবসাইট নিয়ন্ত্রণ করতে অ্যাডমিন বা স্টাফ অ্যাকাউন্ট দিয়ে লগইন করুন।"
              en="Sign in with a staff or superuser account to control the entire website."
            />
          </p>
          <Link className="button" href="/login">
            <Text bn="লগইন পেজে যান" en="Go to Login" />
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-wrap narrow">
        <div className="admin-card">
          <h1>
            <Text bn="অ্যাডমিন অ্যাক্সেস প্রয়োজন" en="Administrator Access Required" />
          </h1>
          <p>
            <Text
              bn="এই মাস্টার কন্ট্রোল প্যানেলটি শুধুমাত্র অনুমোদিত অ্যাডমিন ও স্টাফ অ্যাকাউন্টের জন্য সংরক্ষিত।"
              en="This master control panel is restricted to authorized staff and administrator accounts."
            />
          </p>
          <Link className="button secondary" href="/account">
            <Text bn="আমার অ্যাকাউন্টে ফিরুন" en="Return to My Account" />
          </Link>
        </div>
      </div>
    );
  }

  const currentMeta = ADMIN_SECTIONS.find((s) => s.key === activeKey) || ADMIN_SECTIONS[0];

  return (
    <div className="admin-control-shell">
      <header className="admin-top-banner">
        <div>
          <span className="admin-banner-badge">
            <Activity size={13} /> U SERVICE BD · MASTER ADMIN CONTROL
          </span>
          <h1>
            <Text bn={currentMeta.bn} en={currentMeta.en} />
          </h1>
          <p>
            <Text bn={currentMeta.descBn} en={currentMeta.descEn} />
          </p>
        </div>
        <div className="admin-banner-actions">
          <button
            type="button"
            className="admin-banner-link"
            disabled={busy}
            onClick={() => void loadSectionData()}
          >
            <RefreshCw size={14} />
            <Text bn="রিফ্রেশ" en="Refresh" />
          </button>
          <Link href="/catalog?division=shop" className="admin-banner-link green">
            <ShoppingBag size={14} />
            <Text bn="লাইভ শপ দেখুন" en="View Live Shop" />
          </Link>
          <a
            href="/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-banner-link pink"
          >
            <ExternalLink size={14} />
            <Text bn="Django Super Admin" en="Django Super Admin" />
          </a>
        </div>
      </header>

      {error && (
        <p className="notice" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="admin-workspace-grid">
        {/* Persistent All-Page Sidebar */}
        <aside className="admin-sidebar" aria-label="Admin control navigation">
          <span className="admin-sidebar-label">
            <Text bn="ওয়েবসাইট কন্ট্রোল পেজসমূহ" en="Website Control Pages" />
          </span>
          {ADMIN_SECTIONS.map(({ key, href, bn, en, Icon }) => (
            <Link
              key={key}
              href={href}
              className={`admin-nav-link${activeKey === key ? " active" : ""}`}
              aria-current={activeKey === key ? "page" : undefined}
            >
              <Icon size={17} />
              <span>
                <Text bn={bn} en={en} />
              </span>
            </Link>
          ))}
        </aside>

        {/* Active Admin Page Content */}
        <div className="admin-main-panel">
          {/* 1. OVERVIEW DASHBOARD */}
          {activeKey === "overview" && (
            <>
              <section className="admin-kpi-grid" aria-label="Platform statistics">
                <div className="admin-kpi-card green">
                  <small><Text bn="মোট পরিশোধিত রেভিনিউ" en="Total Paid Revenue" /></small>
                  <strong>৳{Number(overview.paid_revenue || 0).toLocaleString()}</strong>
                  <span><Text bn={`মোট অর্ডার মূল্য: ৳${Number(overview.gross_order_value || 0).toLocaleString()}`} en={`Gross orders: ৳${Number(overview.gross_order_value || 0).toLocaleString()}`} /></span>
                </div>
                <div className="admin-kpi-card">
                  <small><Text bn="মোট প্রোডাক্ট ও সার্ভিস" en="Total Products & Services" /></small>
                  <strong>{overview.offerings_total ?? 0}</strong>
                  <span><Text bn={`সচল: ${overview.offerings_active ?? 0} · শপ পণ্য: ${overview.shop_products ?? 0}`} en={`Active: ${overview.offerings_active ?? 0} · Shop: ${overview.shop_products ?? 0}`} /></span>
                </div>
                <div className="admin-kpi-card pink">
                  <small><Text bn="অর্ডার ও বুকিং" en="Orders & Bookings" /></small>
                  <strong>{Number(overview.orders_total || 0) + Number(overview.bookings_total || 0)}</strong>
                  <span><Text bn={`পেন্ডিং অর্ডার: ${overview.orders_pending ?? 0} · সচল বুকিং: ${overview.bookings_active ?? 0}`} en={`Pending orders: ${overview.orders_pending ?? 0} · Active bookings: ${overview.bookings_active ?? 0}`} /></span>
                </div>
                <div className="admin-kpi-card black">
                  <small><Text bn="নিবন্ধিত ইউজার ও স্টাফ" en="Registered Users & Staff" /></small>
                  <strong>{overview.users_total ?? 0}</strong>
                  <span><Text bn={`স্টাফ/অ্যাডমিন: ${overview.users_staff ?? 0} জন`} en={`Staff/Admin: ${overview.users_staff ?? 0}`} /></span>
                </div>
                <div className="admin-kpi-card green">
                  <small><Text bn="পেমেন্ট গেটওয়ে ও কুপন" en="Payment Gateways & Coupons" /></small>
                  <strong>{overview.gateways_active ?? 0} / {overview.gateways_total ?? 11}</strong>
                  <span><Text bn={`সচল কুপন: ${overview.coupons_active ?? 0}টি`} en={`Active coupons: ${overview.coupons_active ?? 0}`} /></span>
                </div>
                <div className="admin-kpi-card">
                  <small><Text bn="স্টোর ও পার্টনার" en="Stores & Partners" /></small>
                  <strong>{overview.organizations_approved ?? 0} / {overview.organizations_total ?? 0}</strong>
                  <span><Text bn={`পেন্ডিং পার্টনার আবেদন: ${overview.partner_applications_pending ?? 0}`} en={`Pending partner apps: ${overview.partner_applications_pending ?? 0}`} /></span>
                </div>
                <div className="admin-kpi-card pink">
                  <small><Text bn="প্রজেক্ট ও ইনভেস্টর" en="Projects & Investors" /></small>
                  <strong>{overview.projects_published ?? 0} / {overview.projects_total ?? 0}</strong>
                  <span><Text bn={`বিনিয়োগ আবেদন: ${overview.project_applications ?? 0}টি`} en={`Investor applications: ${overview.project_applications ?? 0}`} /></span>
                </div>
                <div className="admin-kpi-card black">
                  <small><Text bn="সাপোর্ট টিকেট ও লিড" en="Support Tickets & Leads" /></small>
                  <strong>{overview.tickets_open ?? 0}</strong>
                  <span><Text bn={`নতুন লিড: ${overview.leads_new ?? 0} · রিভিউ: ${overview.reviews_total ?? 0}`} en={`New leads: ${overview.leads_new ?? 0} · Reviews: ${overview.reviews_total ?? 0}`} /></span>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text bn="ওয়েবসাইটের সকল কন্ট্রোল পেজ (All Control Modules)" en="All Website Control Pages" />
                  </h2>
                </div>
                <div className="admin-module-cards">
                  {ADMIN_SECTIONS.filter((s) => s.key !== "overview").map(({ key, href, bn, en, descBn, descEn, Icon }) => (
                    <Link key={key} href={href} className="admin-module-card">
                      <div className="admin-module-card-head">
                        <span className="admin-module-icon">
                          <Icon size={19} />
                        </span>
                        <h3>
                          <Text bn={bn} en={en} />
                        </h3>
                      </div>
                      <p>
                        <Text bn={descBn} en={descEn} />
                      </p>
                      <span className="text-link" style={{ color: "#6b1199", fontWeight: 700, fontSize: 12.5 }}>
                        <Text bn="কন্ট্রোল পেজে যান" en="Open Control Page" /> <ArrowUpRight size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* 1B. ALL-WEBSITE VISUAL, BACKGROUND, IMAGE, TEXT & VIDEO STUDIO */}
          {activeKey === "appearance" && <AdminAppearanceStudio />}

          {/* 2. PRODUCTS & SERVICES CONTROL */}
          {activeKey === "products" && (
            <>
              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text
                      bn={editingOffering ? `প্রোডাক্ট/সার্ভিস এডিট: ${editingOffering.name}` : "নতুন প্রোডাক্ট বা সার্ভিস যোগ করুন"}
                      en={editingOffering ? `Edit Item: ${editingOffering.name}` : "Add New Product or Service"}
                    />
                  </h2>
                  {editingOffering && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setEditingOffering(null)}
                    >
                      <Text bn="নতুন ফর্মে ফিরুন" en="Cancel Edit" />
                    </button>
                  )}
                </div>
                <form
                  key={editingOffering?.id || "new-offering"}
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const payload = {
                      division: Number(fd.get("division")),
                      category: fd.get("category") ? Number(fd.get("category")) : null,
                      name: String(fd.get("name") || "").trim(),
                      name_bn: String(fd.get("name_bn") || "").trim(),
                      sku: String(fd.get("sku") || "").trim(),
                      price: String(fd.get("price") || "0"),
                      sale_price: String(fd.get("sale_price") || "").trim() || null,
                      stock: Number(fd.get("stock") || 0),
                      image: String(fd.get("image") || "").trim(),
                      description: String(fd.get("description") || "").trim() || "Available on U Service BD.",
                      description_bn: String(fd.get("description_bn") || "").trim(),
                      active: fd.get("active") === "on",
                    };
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        if (editingOffering) {
                          await api(`admin-control/offerings/${editingOffering.id}/`, "PATCH", payload);
                          setEditingOffering(null);
                        } else {
                          await api("admin-control/offerings/", "POST", payload);
                          formEl.reset();
                        }
                      },
                      "প্রোডাক্ট/সার্ভিস সংরক্ষিত হয়েছে।",
                      "Product/service saved.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="বিভাগ (Division)" en="Division" />
                    <select name="division" required defaultValue={editingOffering?.division || divisions[0]?.id || ""}>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name_bn || d.name} ({d.slug})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <Text bn="ক্যাটাগরি" en="Category" />
                    <select name="category" defaultValue={editingOffering?.category || ""}>
                      <option value="">— Optional —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.division_name}] {c.name_bn || c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <Text bn="SKU কোড (ইউনিক)" en="SKU Code (Unique)" />
                    <input name="sku" required defaultValue={editingOffering?.sku || `US-${Date.now().toString().slice(-6)}`} />
                  </label>
                  <label className="field">
                    <Text bn="নাম (ইংরেজি)" en="Name (English)" />
                    <input name="name" required defaultValue={editingOffering?.name || ""} placeholder="e.g. Premium Basmati Rice 5kg" />
                  </label>
                  <label className="field">
                    <Text bn="নাম (বাংলা)" en="Name (Bangla)" />
                    <input name="name_bn" required defaultValue={editingOffering?.name_bn || ""} placeholder="যেমন: প্রিমিয়াম বাসমতি চাল ৫ কেজি" />
                  </label>
                  <label className="field">
                    <Text bn="ছবির পাথ (/images/... বা পিসি থেকে আপলোড)" en="Image URL or Upload from PC" />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        id="offering-image-input"
                        name="image"
                        defaultValue={editingOffering?.image || "/images/photos/shop.jpg"}
                      />
                      <label
                        className="admin-mini-btn"
                        style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                        title="Upload product image from PC"
                      >
                        <Upload size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const fd = new FormData();
                            fd.append("file", f);
                            fd.append("title", f.name);
                            void runAction(
                              async () => {
                                const res = await api<{ url: string }>(
                                  "admin-control/media-assets/",
                                  "POST",
                                  fd,
                                );
                                const inp = document.getElementById(
                                  "offering-image-input",
                                ) as HTMLInputElement | null;
                                if (inp) inp.value = res.url;
                              },
                              "প্রোডাক্টের ছবি আপলোড হয়েছে!",
                              "Product image uploaded!",
                            );
                          }}
                        />
                      </label>
                    </div>
                  </label>
                  <label className="field">
                    <Text bn="মূল্য ৳ (Regular Price)" en="Price ৳" />
                    <input type="number" step="0.01" min="0" name="price" required defaultValue={editingOffering?.price || "500.00"} />
                  </label>
                  <label className="field">
                    <Text bn="ছাড়ের মূল্য ৳ (Sale Price - ঐচ্ছিক)" en="Sale Price ৳ (Optional)" />
                    <input type="number" step="0.01" min="0" name="sale_price" defaultValue={editingOffering?.sale_price || ""} />
                  </label>
                  <label className="field">
                    <Text bn="স্টক সংখ্যা" en="Stock Quantity" />
                    <input type="number" min="0" name="stock" required defaultValue={editingOffering?.stock ?? 50} />
                  </label>
                  <label className="field full-span">
                    <Text bn="বিবরণ (বাংলা / ইংরেজি)" en="Description" />
                    <input name="description" defaultValue={editingOffering?.description || "Quality product/service verified by U Service BD."} />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                    <input type="checkbox" name="active" defaultChecked={editingOffering ? editingOffering.active : true} />
                    <Text bn="✅ ওয়েবসাইটে সচল (Active)" en="✅ Active on Website" />
                  </label>
                  <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                    <button className="button" disabled={busy}>
                      <Plus size={16} />
                      <Text bn={editingOffering ? "আপডেট সংরক্ষণ করুন" : "প্রোডাক্ট/সার্ভিস যুক্ত করুন"} en={editingOffering ? "Save Changes" : "Add Product / Service"} />
                    </button>
                  </div>
                </form>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text bn={`সকল প্রোডাক্ট ও সার্ভিস তালিকা (${offerings.length})`} en={`All Products & Services (${offerings.length})`} />
                  </h2>
                </div>
                <div className="admin-toolbar">
                  <select value={offeringFilterDiv} onChange={(e) => setOfferingFilterDiv(e.target.value)}>
                    <option value="">সব বিভাগ (All Divisions)</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.slug}>{d.name_bn || d.name}</option>
                    ))}
                  </select>
                  <input
                    type="search"
                    value={offeringQuery}
                    onChange={(e) => setOfferingQuery(e.target.value)}
                    placeholder={lang === "bn" ? "নাম বা SKU দিয়ে খুঁজুন..." : "Search by name or SKU..."}
                  />
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID / SKU</th>
                        <th><Text bn="নাম" en="Name" /></th>
                        <th><Text bn="বিভাগ" en="Division" /></th>
                        <th><Text bn="দাম (৳)" en="Price (৳)" /></th>
                        <th><Text bn="স্টক" en="Stock" /></th>
                        <th><Text bn="স্ট্যাটাস (✅)" en="Status (✅)" /></th>
                        <th><Text bn="অ্যাকশন" en="Actions" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {offerings.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>#{item.id}</strong>
                            <br />
                            <small>{item.sku}</small>
                          </td>
                          <td>
                            <strong>{item.name_bn || item.name}</strong>
                            <br />
                            <small>{item.name}</small>
                          </td>
                          <td>{item.division_name}</td>
                          <td>
                            <strong>৳{item.price}</strong>
                            {item.sale_price && (
                              <>
                                <br />
                                <small style={{ color: "#0a7a3b", fontWeight: 700 }}>Sale: ৳{item.sale_price}</small>
                              </>
                            )}
                          </td>
                          <td>{item.stock}</td>
                          <td>
                            <button
                              type="button"
                              disabled={busy}
                              className={`admin-check-pill${item.active ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/offerings/${item.id}/`, "PATCH", { active: !item.active }),
                                  "স্ট্যাটাস আপডেট হয়েছে।",
                                  "Status updated.",
                                )
                              }
                            >
                              {item.active ? "✅ Active" : "Inactive"}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="admin-mini-btn"
                                onClick={() => {
                                  setEditingOffering(item);
                                  window.scrollTo({ top: 0, behavior: "auto" });
                                }}
                              >
                                <Text bn="এডিট" en="Edit" />
                              </button>
                              <button
                                type="button"
                                className="admin-mini-btn danger"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    () => api(`admin-control/offerings/${item.id}/`, "DELETE"),
                                    "মুছে ফেলা হয়েছে।",
                                    "Deleted.",
                                  )
                                }
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* 3. DIVISIONS, CATEGORIES, BRANDS & COLLECTIONS */}
          {activeKey === "catalog-setup" && (
            <>
              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn="ব্যবসা বিভাগসমূহ (Divisions ✅ অন/অফ)" en="Business Divisions (✅ Active Toggle)" /></h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Slug</th>
                        <th><Text bn="বাংলা নাম" en="Bangla Name" /></th>
                        <th><Text bn="ইংরেজি নাম" en="English Name" /></th>
                        <th><Text bn="ধরন" en="Kind" /></th>
                        <th><Text bn="পণ্য/সেবা" en="Items" /></th>
                        <th><Text bn="সচল স্ট্যাটাস" en="Active Status" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {divisions.map((d) => (
                        <tr key={d.id}>
                          <td><strong>{d.slug}</strong></td>
                          <td>{d.name_bn}</td>
                          <td>{d.name}</td>
                          <td>{d.kind}</td>
                          <td>{d.offerings_count}</td>
                          <td>
                            <button
                              type="button"
                              disabled={busy}
                              className={`admin-check-pill${d.active ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/divisions/${d.id}/`, "PATCH", { active: !d.active }),
                                  "বিভাগ আপডেট হয়েছে।",
                                  "Division updated.",
                                )
                              }
                            >
                              {d.active ? "✅ Active" : "Inactive"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn="ক্যাটাগরি তৈরি ও নিয়ন্ত্রণ" en="Categories Management" /></h2>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/categories/", "POST", {
                          division: Number(fd.get("division")),
                          name: String(fd.get("name") || "").trim(),
                          name_bn: String(fd.get("name_bn") || "").trim(),
                        });
                        formEl.reset();
                      },
                      "নতুন ক্যাটাগরি যোগ হয়েছে।",
                      "Category added.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="বিভাগ" en="Division" />
                    <select name="division" required>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name_bn || d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <Text bn="ক্যাটাগরির নাম (ইংরেজি)" en="Category Name (EN)" />
                    <input name="name" required placeholder="e.g. Winter Wear" />
                  </label>
                  <label className="field">
                    <Text bn="ক্যাটাগরির নাম (বাংলা)" en="Category Name (BN)" />
                    <input name="name_bn" required placeholder="যেমন: শীতের পোশাক" />
                  </label>
                  <div className="full-span">
                    <button className="button" disabled={busy}>
                      <Plus size={15} /> <Text bn="ক্যাটাগরি যোগ করুন" en="Add Category" />
                    </button>
                  </div>
                </form>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th><Text bn="বিভাগ" en="Division" /></th>
                        <th><Text bn="বাংলা নাম" en="Bangla Name" /></th>
                        <th><Text bn="ইংরেজি নাম" en="English Name" /></th>
                        <th><Text bn="মুছুন" en="Delete" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id}>
                          <td>#{c.id}</td>
                          <td>{c.division_name}</td>
                          <td><strong>{c.name_bn}</strong></td>
                          <td>{c.name}</td>
                          <td>
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              disabled={busy}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/categories/${c.id}/`, "DELETE"),
                                  "ক্যাটাগরি মুছে ফেলা হয়েছে।",
                                  "Category deleted.",
                                )
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn="শপ ব্র্যান্ড ও কালেকশন (U Shop Brands & Collections)" en="U Shop Brands & Collections" /></h2>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/brands/", "POST", {
                          name: String(fd.get("name") || "").trim(),
                          name_bn: String(fd.get("name_bn") || "").trim(),
                          active: true,
                        });
                        formEl.reset();
                      },
                      "নতুন ব্র্যান্ড যোগ হয়েছে।",
                      "Brand created.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="ব্র্যান্ডের নাম (EN)" en="Brand Name (EN)" />
                    <input name="name" required placeholder="e.g. Aarong / Walton" />
                  </label>
                  <label className="field">
                    <Text bn="ব্র্যান্ডের নাম (BN)" en="Brand Name (BN)" />
                    <input name="name_bn" required placeholder="ব্র্যান্ডের বাংলা নাম" />
                  </label>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button className="button" disabled={busy}>
                      <Plus size={15} /> <Text bn="ব্র্যান্ড যোগ করুন" en="Add Brand" />
                    </button>
                  </div>
                </form>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`admin-check-pill${b.active ? " on" : ""}`}
                      onClick={() =>
                        void runAction(
                          () => api(`admin-control/brands/${b.id}/`, "PATCH", { active: !b.active }),
                          "ব্র্যান্ড আপডেট হয়েছে।",
                          "Brand updated.",
                        )
                      }
                    >
                      {b.active ? "✅" : "⬜"} {b.name_bn || b.name}
                    </button>
                  ))}
                  {collections.map((col) => (
                    <button
                      key={`col-${col.id}`}
                      type="button"
                      className={`admin-check-pill${col.active ? " on" : ""}`}
                      onClick={() =>
                        void runAction(
                          () => api(`admin-control/collections/${col.id}/`, "PATCH", { active: !col.active }),
                          "কালেকশন আপডেট হয়েছে।",
                          "Collection updated.",
                        )
                      }
                    >
                      {col.active ? "✅" : "⬜"} [{col.slug}] {col.name_bn || col.name}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* 4. ORDERS, BOOKINGS, DELIVERIES, EVENTS & RETURNS */}
          {activeKey === "orders" && (
            <>
              <div className="admin-card">
                <Account operations embeddedInAdmin />
              </div>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text
                      bn={`পণ্য রিটার্ন ও রিফান্ড অনুরোধ (${returns.length})`}
                      en={`Product Return Requests (${returns.length})`}
                    />
                  </h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th><Text bn="কাস্টমার ও অর্ডার" en="Customer & Order" /></th>
                        <th><Text bn="কারণ" en="Reason" /></th>
                        <th><Text bn="স্ট্যাটাস" en="Status" /></th>
                        <th><Text bn="সিদ্ধান্ত" en="Decision" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((ret) => (
                        <tr key={ret.id}>
                          <td>#{ret.id}</td>
                          <td>
                            <strong>{ret.customer_username}</strong>
                            <br />
                            <small>৳{ret.order_total}</small>
                          </td>
                          <td>{ret.reason}</td>
                          <td><strong>{ret.status}</strong></td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="admin-check-pill on"
                                disabled={busy || ret.status === "approved"}
                                onClick={() =>
                                  void runAction(
                                    () => api(`admin-control/returns/${ret.id}/`, "PATCH", { status: "approved" }),
                                    "রিটার্ন অনুমোদিত হয়েছে।",
                                    "Return approved.",
                                  )
                                }
                              >
                                ✅ Approve
                              </button>
                              <button
                                type="button"
                                className="admin-mini-btn danger"
                                disabled={busy || ret.status === "rejected"}
                                onClick={() =>
                                  void runAction(
                                    () => api(`admin-control/returns/${ret.id}/`, "PATCH", { status: "rejected" }),
                                    "রিটার্ন বাতিল করা হয়েছে।",
                                    "Return rejected.",
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!returns.length && (
                        <tr>
                          <td colSpan={5}>
                            <Text bn="কোনো পেন্ডিং রিটার্ন অনুরোধ নেই।" en="No return requests found." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* 5. PAYMENT GATEWAYS & COUPONS */}
          {activeKey === "payments" && (
            <>
              <div className="admin-card">
                <PaymentGatewayManager />
              </div>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn="ডিসকাউন্ট কুপন তৈরি ও নিয়ন্ত্রণ (Promo Coupons)" en="Discount Coupons Control" /></h2>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/coupons/", "POST", {
                          code: String(fd.get("code") || "").trim().toUpperCase(),
                          amount: String(fd.get("amount") || "50"),
                          minimum: String(fd.get("minimum") || "200"),
                          limit: Number(fd.get("limit") || 100),
                          per_user_limit: 1,
                          expires_at: new Date(String(fd.get("expires_at"))).toISOString(),
                          active: true,
                        });
                        formEl.reset();
                      },
                      "নতুন কুপন তৈরি হয়েছে।",
                      "Coupon created.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="কুপন কোড" en="Coupon Code" />
                    <input name="code" required placeholder="SAVE100" />
                  </label>
                  <label className="field">
                    <Text bn="ছাড়ের পরিমাণ (৳)" en="Discount Amount (৳)" />
                    <input type="number" min="1" step="0.01" name="amount" required defaultValue="100" />
                  </label>
                  <label className="field">
                    <Text bn="সর্বনিম্ন অর্ডার (৳)" en="Minimum Order (৳)" />
                    <input type="number" min="0" step="0.01" name="minimum" required defaultValue="500" />
                  </label>
                  <label className="field">
                    <Text bn="মোট ব্যবহারের সীমা" en="Total Usage Limit" />
                    <input type="number" min="1" name="limit" required defaultValue="200" />
                  </label>
                  <label className="field">
                    <Text bn="মেয়াদ শেষের তারিখ" en="Expiry Date" />
                    <input type="date" name="expires_at" required defaultValue="2027-12-31" />
                  </label>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button className="button" disabled={busy}>
                      <Plus size={15} /> <Text bn="কুপন যুক্ত করুন" en="Create Coupon" />
                    </button>
                  </div>
                </form>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th><Text bn="ছাড় (৳)" en="Discount" /></th>
                        <th><Text bn="ন্যূনতম অর্ডার" en="Min Order" /></th>
                        <th><Text bn="ব্যবহৃত" en="Used" /></th>
                        <th><Text bn="স্ট্যাটাস (✅)" en="Status" /></th>
                        <th><Text bn="মুছুন" en="Delete" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.code}</strong></td>
                          <td>৳{c.amount}</td>
                          <td>৳{c.minimum}</td>
                          <td>{c.used} / {c.limit}</td>
                          <td>
                            <button
                              type="button"
                              className={`admin-check-pill${c.active ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/coupons/${c.id}/`, "PATCH", { active: !c.active }),
                                  "কুপন আপডেট হয়েছে।",
                                  "Coupon updated.",
                                )
                              }
                            >
                              {c.active ? "✅ Active" : "Inactive"}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/coupons/${c.id}/`, "DELETE"),
                                  "কুপন মুছে ফেলা হয়েছে।",
                                  "Coupon deleted.",
                                )
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text
                      bn={`লয়্যালটি রিওয়ার্ডস কন্ট্রোল (${loyaltyRewards.length})`}
                      en={`Loyalty Rewards Control (${loyaltyRewards.length})`}
                    />
                  </h2>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/loyalty-rewards/", "POST", {
                          name: String(fd.get("name") || "").trim(),
                          description: String(fd.get("description") || "").trim(),
                          points_cost: Number(fd.get("points_cost") || 100),
                          active: true,
                        });
                        formEl.reset();
                      },
                      "নতুন লয়্যালটি রিওয়ার্ড যোগ হয়েছে।",
                      "Loyalty reward created.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="রিওয়ার্ডের নাম" en="Reward Name" />
                    <input name="name" required placeholder="৳100 Free Delivery Voucher" />
                  </label>
                  <label className="field">
                    <Text bn="প্রয়োজনীয় পয়েন্ট" en="Points Cost" />
                    <input type="number" min="10" name="points_cost" required defaultValue="250" />
                  </label>
                  <label className="field">
                    <Text bn="সংক্ষিপ্ত বিবরণ" en="Short Description" />
                    <input name="description" placeholder="Redeemable on next order" />
                  </label>
                  <div className="full-span">
                    <button className="button" disabled={busy}>
                      <Plus size={15} /> <Text bn="রিওয়ার্ড যুক্ত করুন" en="Add Loyalty Reward" />
                    </button>
                  </div>
                </form>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {loyaltyRewards.map((lr) => (
                    <button
                      key={lr.id}
                      type="button"
                      className={`admin-check-pill${lr.active ? " on" : ""}`}
                      onClick={() =>
                        void runAction(
                          () => api(`admin-control/loyalty-rewards/${lr.id}/`, "PATCH", { active: !lr.active }),
                          "রিওয়ার্ড আপডেট হয়েছে।",
                          "Reward updated.",
                        )
                      }
                    >
                      {lr.active ? "✅" : "⬜"} {lr.name} ({lr.points_cost} pts)
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* 6. USERS & ROLES MANAGEMENT */}
          {activeKey === "users" && (
            <section className="admin-card">
              <div className="admin-card-head">
                <h2><Text bn={`ইউজার, স্টাফ ও রোল কন্ট্রোল (${users.length})`} en={`Users, Staff & Roles (${users.length})`} /></h2>
              </div>
              <div className="admin-toolbar">
                <input
                  type="search"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={lang === "bn" ? "ইউজারনেম, ইমেইল বা ফোন দিয়ে খুঁজুন..." : "Search username, email or phone..."}
                />
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th><Text bn="ইউজার" en="User" /></th>
                      <th><Text bn="ইমেইল ও ফোন" en="Contact" /></th>
                      <th><Text bn="অ্যাকাউন্ট স্ট্যাটাস" en="Account Flags" /></th>
                      <th><Text bn="রোল অ্যাসাইন করুন (ক্লিক করে অন/অফ)" en="Assign Roles (Click to toggle)" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.username}</strong>
                          {u.is_superuser && <span className="status" style={{ marginLeft: 6 }}>SuperAdmin</span>}
                          <br />
                          <small>{u.first_name || "—"}</small>
                        </td>
                        <td>
                          {u.email || "—"}
                          <br />
                          <small>{u.phone || "—"}</small>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            <button
                              type="button"
                              className={`admin-check-pill${u.is_active ? " on" : ""}`}
                              disabled={busy || u.id === user.id}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/users/${u.id}/`, "PATCH", { is_active: !u.is_active }),
                                  "ইউজার স্ট্যাটাস আপডেট হয়েছে।",
                                  "User status updated.",
                                )
                              }
                            >
                              {u.is_active ? "✅ Active" : "Blocked"}
                            </button>
                            <button
                              type="button"
                              className={`admin-check-pill${u.is_staff ? " on" : ""}`}
                              disabled={busy || u.id === user.id}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/users/${u.id}/`, "PATCH", { is_staff: !u.is_staff }),
                                  "স্টাফ পারমিশন আপডেট হয়েছে।",
                                  "Staff access updated.",
                                )
                              }
                            >
                              {u.is_staff ? "✅ Staff" : "Staff Off"}
                            </button>
                            <button
                              type="button"
                              className={`admin-check-pill${u.email_verified ? " on" : ""}`}
                              disabled={busy}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/users/${u.id}/`, "PATCH", { email_verified: !u.email_verified }),
                                  "ইমেইল ভেরিফিকেশন আপডেট হয়েছে।",
                                  "Email verification updated.",
                                )
                              }
                            >
                              {u.email_verified ? "✅ Verified" : "Unverified"}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="admin-role-chips">
                            {ALL_ROLES.map((role) => {
                              const hasRole = u.groups_display.includes(role);
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  disabled={busy}
                                  className={`admin-role-chip${hasRole ? " selected" : ""}`}
                                  onClick={() => {
                                    const nextRoles = hasRole
                                      ? u.groups_display.filter((r) => r !== role)
                                      : [...u.groups_display, role];
                                    void runAction(
                                      () => api(`admin-control/users/${u.id}/`, "PATCH", { group_names: nextRoles }),
                                      `${u.username}-এর রোল আপডেট হয়েছে।`,
                                      `Updated roles for ${u.username}.`,
                                    );
                                  }}
                                >
                                  {hasRole ? `✓ ${role}` : `+ ${role}`}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 7. STORES, RESTAURANTS & PARTNER APPLICATIONS */}
          {activeKey === "partners" && (
            <>
              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn={`সকল স্টোর, রেস্টুরেন্ট ও ফার্মেসি (${orgs.length})`} en={`All Stores, Restaurants & Organizations (${orgs.length})`} /></h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th><Text bn="প্রতিষ্ঠানের নাম" en="Organization Name" /></th>
                        <th><Text bn="বিভাগ ও এলাকা" en="Division & Area" /></th>
                        <th><Text bn="মালিক" en="Owner" /></th>
                        <th><Text bn="অনুমোদন (✅)" en="Approved" /></th>
                        <th><Text bn="অর্ডার গ্রহণ" en="Accepting Orders" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgs.map((org) => (
                        <tr key={org.id}>
                          <td>#{org.id}</td>
                          <td>
                            <strong>{org.name}</strong>
                            <br />
                            <small>Min: ৳{org.minimum_order}</small>
                          </td>
                          <td>{org.division_name} · {org.area}</td>
                          <td>{org.owner_username}</td>
                          <td>
                            <button
                              type="button"
                              disabled={busy}
                              className={`admin-check-pill${org.approved ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/organizations/${org.id}/`, "PATCH", { approved: !org.approved }),
                                  "স্টোর অনুমোদন আপডেট হয়েছে।",
                                  "Store approval updated.",
                                )
                              }
                            >
                              {org.approved ? "✅ Approved" : "Pending"}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              disabled={busy}
                              className={`admin-check-pill${org.accepting_orders ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/organizations/${org.id}/`, "PATCH", { accepting_orders: !org.accepting_orders }),
                                  "অর্ডার স্ট্যাটাস আপডেট হয়েছে।",
                                  "Order status updated.",
                                )
                              }
                            >
                              {org.accepting_orders ? "✅ Open" : "Paused"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <PartnerApplications />
              </section>
            </>
          )}

          {/* 8. MANAGED INVESTMENT PROJECTS */}
          {activeKey === "projects" && (
            <>
              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn="নতুন বিনিয়োগ প্রজেক্ট তৈরি করুন" en="Create New Investment Project" /></h2>
                  <Link href="/project-account" className="button secondary">
                    <Text bn="ইনভেস্টর আবেদন ও লেজার দেখুন" en="Investor Applications & Ledger" />
                  </Link>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/projects/", "POST", {
                          title: String(fd.get("title") || "").trim(),
                          title_bn: String(fd.get("title_bn") || "").trim(),
                          category: String(fd.get("category") || "construction"),
                          area: String(fd.get("area") || "Dhaka").trim(),
                          progress: Number(fd.get("progress") || 15),
                          description: String(fd.get("description") || "").trim(),
                          description_bn: String(fd.get("description_bn") || "").trim(),
                          published: true,
                        });
                        formEl.reset();
                      },
                      "নতুন প্রজেক্ট তৈরি ও পাবলিশ হয়েছে।",
                      "Project created and published.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="প্রজেক্টের নাম (ইংরেজি)" en="Project Title (EN)" />
                    <input name="title" required placeholder="Uttara Commercial Hub Phase 2" />
                  </label>
                  <label className="field">
                    <Text bn="প্রজেক্টের নাম (বাংলা)" en="Project Title (BN)" />
                    <input name="title_bn" required placeholder="উত্তরা কমার্শিয়াল হাব ফেজ ২" />
                  </label>
                  <label className="field">
                    <Text bn="ক্যাটাগরি" en="Category" />
                    <select name="category">
                      <option value="construction">Construction</option>
                      <option value="electrical">Electrical</option>
                      <option value="solar">Solar</option>
                      <option value="finishing">Finishing</option>
                    </select>
                  </label>
                  <label className="field">
                    <Text bn="এলাকা" en="Area" />
                    <input name="area" required defaultValue="Dhaka" />
                  </label>
                  <label className="field">
                    <Text bn="অগ্রগতি (%)" en="Progress (%)" />
                    <input type="number" min="0" max="100" name="progress" required defaultValue="25" />
                  </label>
                  <label className="field full-span">
                    <Text bn="বিবরণ (বাংলা / ইংরেজি)" en="Project Description" />
                    <input name="description" required placeholder="Project scope, timeline and return details..." />
                  </label>
                  <div className="full-span">
                    <button className="button" disabled={busy}>
                      <Plus size={15} /> <Text bn="প্রজেক্ট যুক্ত করুন" en="Create Project" />
                    </button>
                  </div>
                </form>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th><Text bn="প্রজেক্ট" en="Project" /></th>
                        <th><Text bn="ক্যাটাগরি ও এলাকা" en="Category & Area" /></th>
                        <th><Text bn="অগ্রগতি (%)" en="Progress %" /></th>
                        <th><Text bn="পাবলিশড (✅)" en="Published" /></th>
                        <th><Text bn="মুছুন" en="Delete" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => (
                        <tr key={p.id}>
                          <td>#{p.id}</td>
                          <td>
                            <strong>{p.title_bn || p.title}</strong>
                            <br />
                            <small>{p.title}</small>
                          </td>
                          <td>{p.category} · {p.area}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={p.progress}
                              className="admin-inline-input"
                              onBlur={(e) => {
                                const val = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                                if (val !== p.progress) {
                                  void runAction(
                                    () => api(`admin-control/projects/${p.id}/`, "PATCH", { progress: val }),
                                    "অগ্রগতি আপডেট হয়েছে।",
                                    "Progress updated.",
                                  );
                                }
                              }}
                            />%
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`admin-check-pill${p.published ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/projects/${p.id}/`, "PATCH", { published: !p.published }),
                                  "পাবলিশ স্ট্যাটাস আপডেট হয়েছে।",
                                  "Publish status updated.",
                                )
                              }
                            >
                              {p.published ? "✅ Published" : "Draft"}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/projects/${p.id}/`, "DELETE"),
                                  "প্রজেক্ট মুছে ফেলা হয়েছে।",
                                  "Project deleted.",
                                )
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* 9. CMS PAGES, FAQS & DELIVERY AREAS */}
          {activeKey === "cms" && (
            <>
              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text
                      bn={editingPage ? `পেজ এডিট: /pages/${editingPage.slug}` : "ওয়েবসাইট পেজ কন্ট্রোল (About, Privacy, Terms ও নতুন পেজ)"}
                      en={editingPage ? `Edit Page: /pages/${editingPage.slug}` : "Website CMS Pages Control"}
                    />
                  </h2>
                  {editingPage && (
                    <button type="button" className="button secondary" onClick={() => setEditingPage(null)}>
                      <Text bn="নতুন পেজ ফর্মে ফিরুন" en="Cancel Edit" />
                    </button>
                  )}
                </div>
                <form
                  key={editingPage?.id || "new-cms-page"}
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const payload = {
                      slug: String(fd.get("slug") || "").trim().toLowerCase(),
                      title: String(fd.get("title") || "").trim(),
                      title_bn: String(fd.get("title_bn") || "").trim(),
                      description: String(fd.get("description") || "").trim(),
                      body: String(fd.get("body") || "").trim(),
                      body_bn: String(fd.get("body_bn") || "").trim(),
                      published: fd.get("published") === "on",
                    };
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        if (editingPage) {
                          await api(`admin-control/pages/${editingPage.id}/`, "PATCH", payload);
                          setEditingPage(null);
                        } else {
                          await api("admin-control/pages/", "POST", payload);
                          formEl.reset();
                        }
                      },
                      "পেজ সংরক্ষিত হয়েছে।",
                      "CMS page saved.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="পেজ স্লাগ (যেমন: about, privacy, terms)" en="Page Slug" />
                    <input name="slug" required defaultValue={editingPage?.slug || ""} placeholder="refund-policy" />
                  </label>
                  <label className="field">
                    <Text bn="শিরোনাম (ইংরেজি)" en="Title (English)" />
                    <input name="title" required defaultValue={editingPage?.title || ""} />
                  </label>
                  <label className="field">
                    <Text bn="শিরোনাম (বাংলা)" en="Title (Bangla)" />
                    <input name="title_bn" required defaultValue={editingPage?.title_bn || ""} />
                  </label>
                  <label className="field full-span">
                    <Text bn="সংক্ষিপ্ত মেটা বিবরণ (SEO Description)" en="SEO Description" />
                    <input name="description" required defaultValue={editingPage?.description || ""} />
                  </label>
                  <label className="field full-span">
                    <Text bn="মূল বিষয়বস্তু (ইংরেজি)" en="Page Body (English)" />
                    <textarea name="body" rows={3} required defaultValue={editingPage?.body || ""} />
                  </label>
                  <label className="field full-span">
                    <Text bn="মূল বিষয়বস্তু (বাংলা)" en="Page Body (Bangla)" />
                    <textarea name="body_bn" rows={3} defaultValue={editingPage?.body_bn || ""} />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                    <input type="checkbox" name="published" defaultChecked={editingPage ? editingPage.published : true} />
                    <Text bn="✅ পাবলিশড" en="✅ Published" />
                  </label>
                  <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                    <button className="button" disabled={busy}>
                      <Text bn={editingPage ? "পেজ আপডেট করুন" : "নতুন পেজ তৈরি করুন"} en={editingPage ? "Update Page" : "Create Page"} />
                    </button>
                  </div>
                </form>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>URL</th>
                        <th><Text bn="শিরোনাম" en="Title" /></th>
                        <th><Text bn="স্ট্যাটাস" en="Status" /></th>
                        <th><Text bn="অ্যাকশন" en="Actions" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((pg) => (
                        <tr key={pg.id}>
                          <td><Link href={`/pages/${pg.slug}`} style={{ color: "#6b1199", fontWeight: 700 }}>/pages/{pg.slug}</Link></td>
                          <td>{pg.title_bn} / {pg.title}</td>
                          <td>
                            <button
                              type="button"
                              className={`admin-check-pill${pg.published ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/pages/${pg.id}/`, "PATCH", { published: !pg.published }),
                                  "পেজ স্ট্যাটাস আপডেট হয়েছে।",
                                  "Page status updated.",
                                )
                              }
                            >
                              {pg.published ? "✅ Published" : "Draft"}
                            </button>
                          </td>
                          <td>
                            <button type="button" className="admin-mini-btn" onClick={() => setEditingPage(pg)}>
                              <Text bn="এডিট" en="Edit" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn={`হোমপেজ প্রশ্নোত্তর (FAQs — ${faqs.length})`} en={`Homepage FAQs (${faqs.length})`} /></h2>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/faqs/", "POST", {
                          question: String(fd.get("question") || "").trim(),
                          question_bn: String(fd.get("question_bn") || "").trim(),
                          answer: String(fd.get("answer") || "").trim(),
                          answer_bn: String(fd.get("answer_bn") || "").trim(),
                          published: true,
                          position: faqs.length + 1,
                        });
                        formEl.reset();
                      },
                      "নতুন FAQ যোগ হয়েছে।",
                      "FAQ added.",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="প্রশ্ন (বাংলা)" en="Question (BN)" />
                    <input name="question_bn" required />
                  </label>
                  <label className="field">
                    <Text bn="প্রশ্ন (ইংরেজি)" en="Question (EN)" />
                    <input name="question" required />
                  </label>
                  <label className="field">
                    <Text bn="উত্তর (বাংলা)" en="Answer (BN)" />
                    <input name="answer_bn" required />
                  </label>
                  <label className="field full-span">
                    <Text bn="উত্তর (ইংরেজি)" en="Answer (EN)" />
                    <input name="answer" required />
                  </label>
                  <div className="full-span">
                    <button className="button" disabled={busy}>
                      <Plus size={15} /> <Text bn="FAQ যুক্ত করুন" en="Add FAQ" />
                    </button>
                  </div>
                </form>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th><Text bn="প্রশ্ন" en="Question" /></th>
                        <th><Text bn="পাবলিশড" en="Published" /></th>
                        <th><Text bn="মুছুন" en="Delete" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {faqs.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <strong>{f.question_bn}</strong>
                            <br />
                            <small>{f.answer_bn}</small>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`admin-check-pill${f.published ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/faqs/${f.id}/`, "PATCH", { published: !f.published }),
                                  "FAQ আপডেট হয়েছে।",
                                  "FAQ updated.",
                                )
                              }
                            >
                              {f.published ? "✅ Live" : "Hidden"}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/faqs/${f.id}/`, "DELETE"),
                                  "FAQ মুছে ফেলা হয়েছে।",
                                  "FAQ deleted.",
                                )
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn={`ডেলিভারি ও সার্ভিস এরিয়া চার্জ (${areas.length})`} en={`Service & Delivery Areas (${areas.length})`} /></h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th><Text bn="জেলা ও এলাকা" en="District & Area" /></th>
                        <th><Text bn="ডেলিভারি চার্জ (৳)" en="Delivery Fee (৳)" /></th>
                        <th><Text bn="স্ট্যাটাস (✅)" en="Status" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {areas.slice(0, 60).map((ar) => (
                        <tr key={ar.id}>
                          <td><strong>{ar.name_bn || ar.name}</strong> ({ar.district})</td>
                          <td>
                            ৳<input
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={ar.delivery_fee}
                              className="admin-inline-input"
                              onBlur={(e) => {
                                const fee = e.target.value;
                                if (fee && fee !== ar.delivery_fee) {
                                  void runAction(
                                    () => api(`admin-control/areas/${ar.id}/`, "PATCH", { delivery_fee: fee }),
                                    "ডেলিভারি ফি আপডেট হয়েছে।",
                                    "Delivery fee updated.",
                                  );
                                }
                              }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`admin-check-pill${ar.active ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/areas/${ar.id}/`, "PATCH", { active: !ar.active }),
                                  "এরিয়া আপডেট হয়েছে।",
                                  "Area updated.",
                                )
                              }
                            >
                              {ar.active ? "✅ Active" : "Inactive"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* 10. SUPPORT, REVIEWS & BROADCAST NOTIFICATIONS */}
          {activeKey === "support" && (
            <>
              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn="সকল ইউজারকে নোটিফিকেশন পাঠান (Broadcast Notification)" en="Send Notification / Broadcast" /></h2>
                  <Link href="/support" className="button secondary">
                    <Headphones size={15} /> <Text bn="সাপোর্ট টিকেট ডেস্ক খুলুন" en="Open Support Ticket Desk" />
                  </Link>
                </div>
                <form
                  className="admin-form-grid"
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const formEl = e.currentTarget;
                    void runAction(
                      async () => {
                        await api("admin-control/broadcast/", "POST", {
                          username: String(fd.get("username") || "").trim(),
                          title: String(fd.get("title") || "").trim(),
                          body: String(fd.get("body") || "").trim(),
                        });
                        formEl.reset();
                      },
                      "নোটিফিকেশন পাঠানো হয়েছে!",
                      "Notification broadcast sent!",
                    );
                  }}
                >
                  <label className="field">
                    <Text bn="টার্গেট ইউজারনেম (ফাঁকা রাখলে সবাই পাবে)" en="Target Username (Blank = All Users)" />
                    <input name="username" placeholder="Leave blank to send to ALL users" />
                  </label>
                  <label className="field" style={{ gridColumn: "span 2" }}>
                    <Text bn="নোটিফিকেশনের শিরোনাম" en="Notification Title" />
                    <input name="title" required placeholder="যেমন: ঈদ স্পেশাল ছাড় শুরু হয়েছে!" />
                  </label>
                  <label className="field full-span">
                    <Text bn="বিস্তারিত বার্তা" en="Message Body" />
                    <textarea name="body" rows={2} required placeholder="আপনার বার্তা লিখুন..." />
                  </label>
                  <div className="full-span">
                    <button className="button" disabled={busy}>
                      <Text bn="নোটিফিকেশন পাঠান" en="Send Notification" />
                    </button>
                  </div>
                </form>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2>
                    <Text
                      bn={`যোগাযোগ ফর্ম মেসেজ / লিডস (${leads.length})`}
                      en={`Contact Form Inquiries / Leads (${leads.length})`}
                    />
                  </h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th><Text bn="নাম ও যোগাযোগ" en="Name & Contact" /></th>
                        <th><Text bn="বিষয়" en="Interest" /></th>
                        <th><Text bn="বার্তা" en="Message" /></th>
                        <th><Text bn="স্ট্যাটাস (✅)" en="Status" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((ld) => (
                        <tr key={ld.id}>
                          <td>
                            <strong>{ld.name}</strong>
                            <br />
                            <small>{ld.email}{ld.phone ? ` · ${ld.phone}` : ""}</small>
                          </td>
                          <td>{ld.interest}</td>
                          <td>{ld.message}</td>
                          <td>
                            <button
                              type="button"
                              className={`admin-check-pill${ld.status === "contacted" ? " on" : ""}`}
                              onClick={() =>
                                void runAction(
                                  () =>
                                    api(`admin-control/leads/${ld.id}/`, "PATCH", {
                                      status: ld.status === "contacted" ? "new" : "contacted",
                                    }),
                                  "লিড স্ট্যাটাস আপডেট হয়েছে।",
                                  "Lead status updated.",
                                )
                              }
                            >
                              {ld.status === "contacted" ? "✅ Contacted" : "New Lead"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!leads.length && (
                        <tr>
                          <td colSpan={4}>
                            <Text bn="এখনও কোনো যোগাযোগ মেসেজ আসেনি।" en="No contact inquiries yet." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-head">
                  <h2><Text bn={`কাস্টমার রিভিউ মডারেশন (${reviews.length})`} en={`Customer Reviews Moderation (${reviews.length})`} /></h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th><Text bn="কাস্টমার" en="Customer" /></th>
                        <th><Text bn="রেটিং" en="Rating" /></th>
                        <th><Text bn="মন্তব্য" en="Comment" /></th>
                        <th><Text bn="মুছুন" en="Delete" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((rv) => (
                        <tr key={rv.id}>
                          <td><strong>{rv.customer_username}</strong></td>
                          <td>{"★".repeat(rv.rating)} ({rv.rating}/5)</td>
                          <td>{rv.comment}</td>
                          <td>
                            <button
                              type="button"
                              className="admin-mini-btn danger"
                              onClick={() =>
                                void runAction(
                                  () => api(`admin-control/reviews/${rv.id}/`, "DELETE"),
                                  "রিভিউ মুছে ফেলা হয়েছে।",
                                  "Review removed.",
                                )
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* 11. AUDIT LOGS & SYSTEM */}
          {activeKey === "audit" && (
            <section className="admin-card">
              <div className="admin-card-head">
                <h2><Text bn="সিস্টেম অডিট লগ (System Security & Change Trail)" en="System Security & Audit Trail" /></h2>
                <a
                  href="/api/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button secondary"
                >
                  <ExternalLink size={14} /> <Text bn="OpenAPI / Swagger ডকস" en="OpenAPI / Swagger Docs" />
                </a>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th><Text bn="সময়" en="Time" /></th>
                      <th><Text bn="অ্যাডমিন / ইউজার" en="Actor" /></th>
                      <th><Text bn="অ্যাকশন" en="Action" /></th>
                      <th><Text bn="এনটিটি" en="Entity" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((log) => (
                      <tr key={log.id}>
                        <td><small>{new Date(log.created_at).toLocaleString()}</small></td>
                        <td><strong>{log.actor}</strong></td>
                        <td><code>{log.action}</code></td>
                        <td>{log.entity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
