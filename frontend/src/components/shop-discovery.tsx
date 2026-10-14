"use client";
import { useEffect, useState } from "react";
import { api, type Offering } from "@/lib/api";
import { OfferingCard } from "./offering-card";
import { Text } from "./provider";

type Discovery = {
  related: Offering[];
  recommended: Offering[];
  bought_together: Offering[];
  recent: Offering[];
};
const key = "us-shop-recent";
export function ShopDiscovery({ id }: { id: number }) {
  const [data, setData] = useState<Discovery | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setData(null);
    setError(false);
    let recent: number[] = [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(saved))
        recent = [
          ...new Set(
            saved.filter(
              (value) =>
                Number.isSafeInteger(value) && value > 0 && value !== id,
            ),
          ),
        ].slice(0, 11);
      localStorage.setItem(key, JSON.stringify([id, ...recent]));
    } catch {
      /* Browsing still works without local storage. */
    }
    api<Discovery>(`offerings/${id}/discovery/?recent=${recent.join(",")}`)
      .then((value) => {
        if (current) {
          setData(value);
          setError(false);
        }
      })
      .catch(() => {
        if (current) {
          setData(null);
          setError(true);
        }
      });
    return () => {
      current = false;
    };
  }, [id, retry]);
  return (
    <div className="page-wrap shop-discovery">
      {error && (
        <p role="status">
          <Text
            bn="পণ্যের পরামর্শ লোড হয়নি।"
            en="Product suggestions could not load."
          />{" "}
          <button
            className="text-link"
            onClick={() => setRetry((value) => value + 1)}
          >
            <Text bn="আবার চেষ্টা করুন" en="Try again" />
          </button>
        </p>
      )}
      {data &&
        (
          [
            ["related", "একই ধরনের পণ্য", "Related products"],
            ["recommended", "আরও পণ্য দেখুন", "Recommended products"],
            [
              "bought_together",
              "একসঙ্গে কেনা হয়",
              "Frequently bought together",
            ],
            ["recent", "সম্প্রতি দেখা পণ্য", "Recently viewed"],
          ] as const
        ).map(
          ([section, bn, en]) =>
            data[section].length > 0 && (
              <section key={section} className={`shop-discovery-${section}`}>
                <div className="shop-discovery-heading">
                  <h2>
                    <Text bn={bn} en={en} />
                  </h2>
                  {section === "recent" && (
                    <button
                      className="text-link"
                      onClick={() => {
                        try {
                          localStorage.removeItem(key);
                        } catch {}
                        setData({ ...data, recent: [] });
                      }}
                    >
                      <Text bn="দেখার ইতিহাস মুছুন" en="Clear viewed history" />
                    </button>
                  )}
                </div>
                {section === "bought_together" && (
                  <p>
                    <Text
                      bn="সম্পন্ন অর্ডারে একসঙ্গে কেনার ভিত্তিতে দেখানো হচ্ছে। কোনো অতিরিক্ত ছাড় ধরে নেওয়া হয়নি।"
                      en="Based on products purchased together in fulfilled orders. No extra discount is assumed."
                    />
                  </p>
                )}
                <div className="catalog-grid">
                  {data[section].map((product) => (
                    <OfferingCard key={product.id} offering={product} />
                  ))}
                </div>
              </section>
            ),
        )}
    </div>
  );
}
