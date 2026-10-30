"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp, Text } from "./provider";
import { UiText } from "./ui-text";

export type PaymentGatewayItem = {
  id?: number;
  code: string;
  name: string;
  name_bn: string;
  category: "cash" | "mfs" | "aggregator" | "bank";
  active: boolean;
  sandbox: boolean;
  account_number: string;
  instructions: string;
  instructions_bn: string;
  display_order: number;
  api_configured: boolean;
  updated_at?: string | null;
};

const CATEGORY_LABELS: Record<
  PaymentGatewayItem["category"],
  { bn: string; en: string }
> = {
  cash: { bn: "নগদ পরিশোধ (COD)", en: "Cash on Delivery" },
  mfs: {
    bn: "মোবাইল ব্যাংকিং (MFS)",
    en: "Mobile Financial Service (MFS)",
  },
  aggregator: {
    bn: "অনলাইন পেমেন্ট গেটওয়ে (কার্ড ও ব্যাংকিং)",
    en: "Payment Gateway (Cards & Banking)",
  },
  bank: { bn: "ব্যাংক ট্রান্সফার", en: "Bank Transfer" },
};

export const GATEWAY_LABELS: Record<string, { bn: string; en: string }> = {
  cod: { bn: "ক্যাশ অন ডেলিভারি (COD)", en: "Cash on delivery" },
  bkash: { bn: "বিকাশ (bKash)", en: "bKash" },
  nagad: { bn: "নগদ (Nagad)", en: "Nagad" },
  rocket: { bn: "রকেট - ডাচ-বাংলা ব্যাংক (Rocket)", en: "Rocket (DBBL)" },
  upay: { bn: "উপায় (Upay)", en: "Upay" },
  sslcommerz: {
    bn: "এসএসএলকমার্জ অনলাইন পেমেন্ট",
    en: "SSLCOMMERZ online payment",
  },
  aamarpay: { bn: "আমারপে (aamarPay)", en: "aamarPay" },
  shurjopay: { bn: "সূর্যপে (ShurjoPay)", en: "ShurjoPay" },
  portpos: { bn: "পোর্টপস / পোর্টওয়ালেট (PortPos)", en: "PortPos (PortWallet)" },
  ekpay: { bn: "একপে (EkPay)", en: "EkPay" },
  bank_transfer: {
    bn: "ব্যাংক ট্রান্সফার (NPSB / BEFTN)",
    en: "Bank Transfer (NPSB / BEFTN)",
  },
};

export function PaymentGatewayManager() {
  const { lang, toast } = useApp();
  const [gateways, setGateways] = useState<PaymentGatewayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadGateways = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api<{ results: PaymentGatewayItem[] }>(
        "payment-gateways/",
      );
      setGateways(data.results);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "পেমেন্ট গেটওয়ে লোড করা যায়নি / Unable to load payment gateways.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGateways();
  }, [loadGateways]);

  async function toggleGateway(
    gw: PaymentGatewayItem,
    field: "active" | "sandbox",
    value: boolean,
  ) {
    setError("");
    setBusyCode(gw.code);
    try {
      const updated = await api<PaymentGatewayItem>(
        `payment-gateways/${gw.code}/`,
        "PATCH",
        { [field]: value },
      );
      setGateways((prev) =>
        prev.map((item) => (item.code === gw.code ? updated : item)),
      );
      toast(
        field === "active"
          ? value
            ? `✅ ${lang === "bn" ? gw.name_bn : gw.name} চালু করা হয়েছে / Activated`
            : `${lang === "bn" ? gw.name_bn : gw.name} বন্ধ করা হয়েছে / Deactivated`
          : "মোড আপডেট হয়েছে / Mode updated",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyCode(null);
    }
  }

  async function saveGatewayDetails(
    event: FormEvent<HTMLFormElement>,
    gw: PaymentGatewayItem,
  ) {
    event.preventDefault();
    setError("");
    setBusyCode(gw.code);
    const formData = new FormData(event.currentTarget);
    try {
      const updated = await api<PaymentGatewayItem>(
        `payment-gateways/${gw.code}/`,
        "PATCH",
        {
          account_number: String(formData.get("account_number") || ""),
          instructions_bn: String(formData.get("instructions_bn") || ""),
          instructions: String(formData.get("instructions") || ""),
        },
      );
      setGateways((prev) =>
        prev.map((item) => (item.code === gw.code ? updated : item)),
      );
      setEditingCode(null);
      toast("গেটওয়ের তথ্য সংরক্ষিত হয়েছে / Gateway settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save settings");
    } finally {
      setBusyCode(null);
    }
  }

  const activeCount = gateways.filter((g) => g.active).length;

  return (
    <section aria-labelledby="payment-gateways-heading">
      <div className="record-head">
        <div>
          <h2 id="payment-gateways-heading">
            <Text
              bn="বাংলাদেশের পেমেন্ট গেটওয়ে ও মেথড ব্যবস্থাপনা"
              en="Bangladesh payment gateways & methods"
            />
          </h2>
          <p className="subtle">
            <Text
              bn="যে পেমেন্ট মেথডটি দরকার সেটিতে ✅ টিক দিয়ে চালু (Active) রাখুন এবং যেটি দরকার নেই সেটির টিক তুলে বন্ধ (Deactivate) করে রাখুন।"
              en="Check ✅ to activate the payment gateways you want at checkout, or uncheck to deactivate them."
            />
          </p>
        </div>
        <span className="status">
          {lang === "bn"
            ? `চালু আছে: ${activeCount.toLocaleString("bn-BD")} / ${gateways.length.toLocaleString("bn-BD")}`
            : `Active: ${activeCount} / ${gateways.length}`}
        </span>
      </div>

      {error && (
        <p className="error" role="alert">
          <UiText text={error} />
        </p>
      )}

      {loading ? (
        <p role="status">
          <Text
            bn="পেমেন্ট গেটওয়ে লোড হচ্ছে…"
            en="Loading payment gateways…"
          />
        </p>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          {gateways.map((gw) => {
            const cat = CATEGORY_LABELS[gw.category] || CATEGORY_LABELS.mfs;
            const isBusy = busyCode === gw.code;
            const isEditing = editingCode === gw.code;
            return (
              <article
                className="record"
                key={gw.code}
                data-testid={`gateway-card-${gw.code}`}
                style={{
                  borderLeft: gw.active
                    ? "4px solid #0a7a3b"
                    : "4px solid #cbd5e1",
                }}
              >
                <div
                  className="record-head"
                  style={{ alignItems: "flex-start", gap: 16 }}
                >
                  <div>
                    <span className="eyebrow">
                      {lang === "bn" ? cat.bn : cat.en} ·{" "}
                      <code>{gw.code.toUpperCase()}</code>
                    </span>
                    <h3 style={{ marginTop: 4 }}>
                      {gw.active ? "✅ " : ""}
                      {lang === "bn" ? gw.name_bn : gw.name}
                    </h3>
                    <p style={{ marginTop: 4 }}>
                      {lang === "bn"
                        ? gw.instructions_bn || gw.instructions
                        : gw.instructions || gw.instructions_bn}
                    </p>
                    {gw.account_number && (
                      <p>
                        <strong>
                          <Text
                            bn="মার্চেন্ট / অ্যাকাউন্ট নম্বর:"
                            en="Merchant / Account No:"
                          />
                        </strong>{" "}
                        <code>{gw.account_number}</code>
                      </p>
                    )}
                    <p className="subtle" style={{ fontSize: 13 }}>
                      {gw.code === "cod" ? (
                        <Text
                          bn="ডেলিভারির সময় নগদ টাকা গ্রহণ"
                          en="Cash collection upon delivery"
                        />
                      ) : gw.api_configured ? (
                        <Text
                          bn="সার্ভার API ক্রেডেনশিয়াল সংযুক্ত"
                          en="Server API credentials configured"
                        />
                      ) : gw.code === "sslcommerz" ? (
                        <Text
                          bn="সার্ভারে SSLCOMMERZ_STORE_ID ও PASSWORD বসালে অনলাইন রিডাইরেক্ট সচল হবে"
                          en="Set SSLCOMMERZ_STORE_ID & PASSWORD on server for hosted redirect"
                        />
                      ) : (
                        <Text
                          bn="গ্রাহক পেমেন্ট করে TrxID / রেফারেন্স জমা দিতে পারবেন (অথবা API কী যুক্ত করা যাবে)"
                          en="Supports customer TrxID / reference verification & merchant configuration"
                        />
                      )}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 10,
                      minWidth: 190,
                    }}
                  >
                    <label
                      className="check-row"
                      style={{
                        cursor: isBusy ? "wait" : "pointer",
                        fontWeight: 700,
                        padding: "8px 14px",
                        borderRadius: 10,
                        background: gw.active ? "#ecfdf5" : "#f8fafc",
                        border: gw.active
                          ? "1px solid #10b981"
                          : "1px solid #cbd5e1",
                        color: gw.active ? "#065f46" : "#475569",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={gw.active}
                        disabled={isBusy}
                        aria-label={`${gw.name} active`}
                        onChange={(e) =>
                          void toggleGateway(gw, "active", e.target.checked)
                        }
                      />
                      <span>
                        {gw.active ? (
                          <Text bn="✅ চালু আছে (Active)" en="✅ Active" />
                        ) : (
                          <Text bn="বন্ধ আছে (Inactive)" en="Inactive" />
                        )}
                      </span>
                    </label>

                    {gw.code !== "cod" && gw.code !== "bank_transfer" && (
                      <label
                        className="check-row"
                        style={{ fontSize: 13, cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={gw.sandbox}
                          disabled={isBusy}
                          onChange={(e) =>
                            void toggleGateway(gw, "sandbox", e.target.checked)
                          }
                        />
                        <span>
                          <Text
                            bn="স্যান্ডবক্স / টেস্ট মোড"
                            en="Sandbox / test mode"
                          />
                        </span>
                      </label>
                    )}

                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        setEditingCode(isEditing ? null : gw.code)
                      }
                    >
                      {isEditing ? (
                        <Text bn="বন্ধ করুন" en="Cancel" />
                      ) : (
                        <Text
                          bn="নম্বর ও নির্দেশনা সম্পাদনা"
                          en="Edit number & instructions"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <form
                    className="form-grid"
                    style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}
                    onSubmit={(e) => void saveGatewayDetails(e, gw)}
                  >
                    <label className="field wide">
                      <Text
                        bn="মার্চেন্ট নম্বর / ব্যাংক অ্যাকাউন্ট নম্বর (ঐচ্ছিক)"
                        en="Merchant number / bank account details (optional)"
                      />
                      <input
                        name="account_number"
                        defaultValue={gw.account_number}
                        maxLength={120}
                        placeholder={
                          lang === "bn"
                            ? "যেমন: 017XXXXXXXX (বিকাশ মার্চেন্ট) বা ব্যাংক হিসাব নম্বর"
                            : "e.g. 017XXXXXXXX (Merchant) or Bank A/C number"
                        }
                      />
                    </label>
                    <label className="field wide">
                      <Text
                        bn="গ্রাহকের জন্য পেমেন্ট নির্দেশনা (বাংলা)"
                        en="Customer payment instructions (Bangla)"
                      />
                      <input
                        name="instructions_bn"
                        defaultValue={gw.instructions_bn}
                        maxLength={500}
                      />
                    </label>
                    <label className="field wide">
                      <Text
                        bn="গ্রাহকের জন্য পেমেন্ট নির্দেশনা (ইংরেজি)"
                        en="Customer payment instructions (English)"
                      />
                      <input
                        name="instructions"
                        defaultValue={gw.instructions}
                        maxLength={500}
                      />
                    </label>
                    <div className="field wide">
                      <button
                        type="submit"
                        className="button"
                        disabled={isBusy}
                      >
                        <Text bn="সংরক্ষণ করুন" en="Save settings" />
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
