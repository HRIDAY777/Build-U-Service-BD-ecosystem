"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Text, useApp } from "./provider";

const ROLE_LABELS: Record<string, [string, string]> = {
  Admin: ["অ্যাডমিন", "Admin"],
  Customer: ["গ্রাহক", "Customer"],
  Provider: ["সার্ভিস প্রোভাইডার", "Service Provider"],
  Rider: ["ডেলিভারি রাইডার", "Delivery Rider"],
  Partner: ["পার্টনার / মার্চেন্ট", "Partner / Merchant"],
  "Operations Manager": ["অপারেশনস ম্যানেজার", "Operations Manager"],
  Finance: ["ফাইন্যান্স ও লেজার", "Finance & Ledger"],
  Pharmacist: ["ফার্মাসিস্ট", "Pharmacist"],
  "Customer Support": ["কাস্টমার সাপোর্ট", "Customer Support"],
  "Content Manager": ["কনটেন্ট ম্যানেজার", "Content Manager"],
};

export function RoleWorkspaces({ currentPath }: { currentPath?: string }) {
  const { user, lang } = useApp();
  if (!user) return null;

  const rawRoles = user.roles?.length
    ? user.roles
    : user.is_superuser
      ? ["Admin"]
      : user.is_staff
        ? ["Operations Manager"]
        : ["Customer"];

  const hasRole = (name: string) =>
    Boolean(user.is_superuser || rawRoles.includes("Admin") || rawRoles.includes(name));

  const links: { href: string; bn: string; en: string; show: boolean }[] = [
    {
      href: "/admin-panel",
      bn: "মাস্টার অ্যাডমিন ড্যাশবোর্ড",
      en: "Master Admin Dashboard",
      show: Boolean(user.is_staff || user.is_superuser),
    },
    {
      href: "/account",
      bn: "গ্রাহক ড্যাশবোর্ড",
      en: "Customer dashboard",
      show: true,
    },
    {
      href: "/portal",
      bn: "অপারেশনস পোর্টাল",
      en: "Operations portal",
      show:
        user.is_staff ||
        hasRole("Operations Manager") ||
        hasRole("Partner") ||
        hasRole("Finance") ||
        hasRole("Pharmacist") ||
        hasRole("Customer Support"),
    },
    {
      href: "/provider",
      bn: "প্রোভাইডার ওয়ার্কস্পেস",
      en: "Provider workspace",
      show: hasRole("Provider"),
    },
    {
      href: "/rider",
      bn: "রাইডার ড্যাশবোর্ড",
      en: "Rider dashboard",
      show: hasRole("Rider"),
    },
    {
      href: "/project-account",
      bn: "বিনিয়োগ ও প্রজেক্ট হিসাব",
      en: "Investment & project ledger",
      show: true,
    },
    {
      href: "/partner-application",
      bn: "পার্টনার আবেদন ও চুক্তি",
      en: "Partner applications",
      show:
        hasRole("Partner") ||
        hasRole("Operations Manager") ||
        user.is_staff,
    },
    {
      href: "/support",
      bn: "সাপোর্ট ও টিকেট ডেস্ক",
      en: "Support desk",
      show: hasRole("Customer Support") || user.is_staff,
    },
    {
      href: "/loyalty",
      bn: "লয়্যালটি রিওয়ার্ডস",
      en: "Loyalty rewards",
      show: !user.is_staff || hasRole("Customer"),
    },
    {
      href: "/admin/",
      bn: "কেন্দ্রীয় অ্যাডমিন প্যানেল ↗",
      en: "Central admin ↗",
      show: Boolean(
        user.is_staff ||
          user.is_superuser ||
          hasRole("Content Manager") ||
          hasRole("Finance") ||
          hasRole("Pharmacist"),
      ),
    },
  ];

  const visibleLinks = links.filter(
    (item) => item.show && item.href !== currentPath,
  );

  return (
    <div
      className="form-panel"
      style={{
        marginBottom: 16,
        padding: "14px 18px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>
          <Text bn="অ্যাকাউন্ট রোল:" en="Account role:" />
        </strong>
        {rawRoles.map((role) => {
          const label = ROLE_LABELS[role] || [role, role];
          return (
            <span
              key={role}
              className="pill"
              style={{
                background: "#0a7a3b18",
                color: "#0a7a3b",
                fontWeight: 600,
              }}
            >
              {lang === "bn" ? label[0] : label[1]}
            </span>
          );
        })}
        {user.email && (
          <span className="subtle" style={{ fontSize: 13 }}>
            · {user.email}
            {user.phone ? ` · ${user.phone}` : ""}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {visibleLinks.map((item) =>
          item.href.startsWith("/admin/") ? (
            <a
              key={item.href}
              href={item.href}
              className="button secondary"
              style={{ padding: "6px 12px", minHeight: 0, fontSize: 13 }}
            >
              {lang === "bn" ? item.bn : item.en}
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={item.href === "/admin-panel" ? "button" : "button secondary"}
              style={{ padding: "6px 12px", minHeight: 0, fontSize: 13 }}
            >
              {lang === "bn" ? item.bn : item.en}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

export function ProfileCard({ collapsible = false }: { collapsible?: boolean }) {
  const { user, refresh, toast, lang, setLang } = useApp();
  const [busy, setBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [error, setError] = useState("");
  const [pwdError, setPwdError] = useState("");

  if (!user) return null;

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const nextLang = (data.get("language") as "bn" | "en") || lang;
    try {
      await api("auth/me/", "PATCH", {
        first_name: String(data.get("first_name") || "").trim(),
        last_name: String(data.get("last_name") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        language: nextLang,
        marketing_consent: data.has("marketing_consent"),
      });
      setLang(nextLang);
      await refresh();
      toast(
        lang === "bn"
          ? "প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে"
          : "Profile saved",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === "bn"
            ? "প্রোফাইল সংরক্ষণ করা যায়নি"
            : "Unable to save profile",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdError("");
    setPwdBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await api("auth/password/", "POST", {
        old_password: String(data.get("old_password") || ""),
        new_password: String(data.get("new_password") || ""),
      });
      form.reset();
      toast(
        lang === "bn"
          ? "পাসওয়ার্ড পরিবর্তন হয়েছে"
          : "Password changed",
      );
    } catch (err) {
      setPwdError(
        err instanceof Error
          ? err.message
          : lang === "bn"
            ? "পাসওয়ার্ড পরিবর্তন করা যায়নি"
            : "Unable to change password",
      );
    } finally {
      setPwdBusy(false);
    }
  }

  const content = (
    <div style={{ display: "grid", gap: 20 }}>
      <form className="form-panel" onSubmit={saveProfile}>
        <h2>
          <Text bn="ব্যক্তিগত প্রোফাইল ও তথ্য" en="Personal profile & details" />
        </h2>
        <p className="subtle">
          <Text
            bn={`ইউজারনেম: ${user.username} · ইমেইল: ${user.email || "—"}`}
            en={`Username: ${user.username} · Email: ${user.email || "—"}`}
          />
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <label className="field">
            <Text bn="নামের প্রথম অংশ" en="First name" />
            <input
              name="first_name"
              defaultValue={user.first_name || ""}
              maxLength={150}
            />
          </label>
          <label className="field">
            <Text bn="নামের শেষ অংশ" en="Last name" />
            <input
              name="last_name"
              defaultValue={user.last_name || ""}
              maxLength={150}
            />
          </label>
          <label className="field">
            <Text bn="মোবাইল নম্বর" en="Phone number" />
            <input
              name="phone"
              defaultValue={user.phone || ""}
              placeholder="+8801XXXXXXXXX"
              maxLength={20}
            />
          </label>
          <label className="field">
            <Text bn="পছন্দের ভাষা" en="Preferred language" />
            <select name="language" defaultValue={user.language || lang}>
              <option value="bn">
                <Text bn="বাংলা (Bangla)" en="Bangla" />
              </option>
              <option value="en">
                <Text bn="ইংরেজি (English)" en="English" />
              </option>
            </select>
          </label>
        </div>
        <label className="field" style={{ marginTop: 8 }}>
          <span>
            <input
              type="checkbox"
              name="marketing_consent"
              defaultChecked={Boolean(user.marketing_consent)}
              style={{ width: "auto", minHeight: 0 }}
            />{" "}
            <Text
              bn="আমি প্রোমোশনাল ও অফার বার্তা পেতে চাই।"
              en="I want to receive promotional messages."
            />
          </span>
        </label>
        <button className="button" disabled={busy}>
          <Text
            bn={busy ? "সংরক্ষণ হচ্ছে…" : "প্রোফাইল সংরক্ষণ করুন"}
            en={busy ? "Saving…" : "Save profile"}
          />
        </button>
      </form>

      <form className="form-panel" onSubmit={changePassword}>
        <h2>
          <Text bn="পাসওয়ার্ড ও সেশন নিরাপত্তা" en="Password & session security" />
        </h2>
        {pwdError && (
          <p className="error" role="alert">
            {pwdError}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <label className="field">
            <Text bn="বর্তমান পাসওয়ার্ড" en="Current password" />
            <input
              type="password"
              name="old_password"
              required
              autoComplete="current-password"
            />
          </label>
          <label className="field">
            <Text bn="নতুন পাসওয়ার্ড" en="New password" />
            <input
              type="password"
              name="new_password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          <button className="button" disabled={pwdBusy}>
            <Text
              bn={pwdBusy ? "পরিবর্তন হচ্ছে…" : "পাসওয়ার্ড পরিবর্তন করুন"}
              en={pwdBusy ? "Updating…" : "Change password"}
            />
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              try {
                await api("auth/logout-all/", "POST");
                await refresh();
                toast(
                  lang === "bn"
                    ? "সব ডিভাইস থেকে সাইন আউট করা হয়েছে"
                    : "Signed out of all devices",
                );
              } catch (err) {
                setPwdError(
                  err instanceof Error
                    ? err.message
                    : "Unable to sign out all sessions",
                );
              }
            }}
          >
            <Text bn="সব ডিভাইস থেকে লগআউট" en="Sign out all devices" />
          </button>
        </div>
      </form>
    </div>
  );

  if (collapsible) {
    return (
      <details className="form-panel" style={{ marginTop: 18, marginBottom: 18 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          <Text
            bn="প্রোফাইল ও পাসওয়ার্ড সেটিংস"
            en="Profile & password settings"
          />
        </summary>
        <div style={{ marginTop: 14 }}>{content}</div>
      </details>
    );
  }

  return content;
}
