"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Offering, PageResult } from "@/lib/api";
import { OfferingCard } from "./offering-card";
export function SharedWishlist({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<Offering> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    void api<PageResult<Offering>>(
      `wishlist-shared/${encodeURIComponent(token)}/?page=${page}`,
    )
      .then((value) => {
        if (current) {
          setResult(value);
          setError("");
        }
      })
      .catch(() => {
        if (current) {
          setResult(null);
          setError("এই শেয়ার লিংক পাওয়া যায়নি বা বন্ধ করা হয়েছে।");
        }
      });
    return () => {
      current = false;
    };
  }, [token, page]);
  return (
    <main className="page-wrap">
      <span className="eyebrow">U SERVICE BD</span>
      <h1>শেয়ার করা পছন্দের তালিকা</h1>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : result ? (
        <>
          {!result.count && (
            <p>এই তালিকায় এখন কোনো প্রকাশিত পণ্য বা সেবা নেই।</p>
          )}
          <div className="offering-grid">
            {result.results.map((o) => (
              <OfferingCard key={o.id} offering={o} />
            ))}
          </div>
          <div className="search-row">
            <button
              className="button secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              আগের পৃষ্ঠা
            </button>
            <span>পৃষ্ঠা {page}</span>
            <button
              className="button secondary"
              disabled={!result.next}
              onClick={() => setPage((p) => p + 1)}
            >
              পরের পৃষ্ঠা
            </button>
          </div>
        </>
      ) : (
        <p role="status">তালিকা লোড হচ্ছে…</p>
      )}
      <Link href="/catalog" className="text-link">
        ক্যাটালগ দেখুন
      </Link>
    </main>
  );
}
