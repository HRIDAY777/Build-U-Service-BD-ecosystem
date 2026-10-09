"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, PageResult } from "@/lib/api";
import { useApp, Text } from "@/components/provider";

type Entry = {
  id: number;
  points: number;
  reference: string;
  created_at: string;
};

type Reward = {
  id: number;
  name: string;
  description: string;
  points_cost: number;
};

type Redemption = {
  id: number;
  reward: string;
  points_spent: number;
  created_at: string;
  fulfilled_at: string | null;
};

export default function LoyaltyPage() {
  const { user } = useApp();
  const [statement, setStatement] = useState<PageResult<Entry> | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [entries, total, availableRewards, customerRedemptions] =
        await Promise.all([
          api<PageResult<Entry>>(`loyalty/?page=${page}`),
          api<{ points: number }>("loyalty/balance/"),
          api<Reward[]>("loyalty/rewards/"),
          api<Redemption[]>("loyalty/redemptions/"),
        ]);
      setStatement(entries);
      setBalance(total.points);
      setRewards(availableRewards);
      setRedemptions(customerRedemptions);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load loyalty statement",
      );
    } finally {
      setLoading(false);
    }
  }, [user, page]);
  useEffect(() => {
    load();
  }, [load]);

  async function redeem(reward: Reward) {
    setRedeeming(reward.id);
    setError("");
    setNotice("");
    try {
      const result = await api<{
        reward: string;
        points_spent: number;
      }>("loyalty/redeem/", "POST", { reward_id: reward.id });
      setNotice(`Redeemed ${result.reward} for ${result.points_spent} points.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to redeem this reward");
    } finally {
      setRedeeming(null);
    }
  }

  if (!user)
    return (
      <div className="page-wrap">
        <h1>Loyalty / লয়্যালটি</h1>
        <Link href="/login" className="button">
          <UiText text={"Sign in"} />
        </Link>
      </div>
    );
  return (
    <div className="page-wrap">
      <h1>
        <Text bn="আপনার লয়্যালটি পয়েন্ট" en="Your loyalty points" />
      </h1>
      <p className="notice">
        <UiText text={"Balance:"} />
        {balance ?? "—"}
        <UiText text={"points"} />
      </p>
      <p>
        <UiText
          text={"View points credited and adjustments to your account."}
        />
      </p>
      <h2>
        <UiText text={"Available rewards"} />
      </h2>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">
          <UiText text={"Loading statement…"} />
        </p>
      ) : (
        <>
          {!rewards.length && (
            <p>
              <UiText text={"No rewards are currently available."} />
            </p>
          )}
          {rewards.map((reward) => (
            <article className="record" key={reward.id}>
              <strong>{reward.name}</strong>
              {reward.description && <p>{reward.description}</p>}
              <p>
                {reward.points_cost}
                <UiText text={"points"} />
              </p>
              <button
                className="button"
                disabled={
                  redeeming !== null || (balance ?? 0) < reward.points_cost
                }
                onClick={() => redeem(reward)}
              >
                {redeeming === reward.id ? "Redeeming…" : "Redeem"}
              </button>
            </article>
          ))}
          <h2>
            <UiText text={"Your redemptions"} />
          </h2>
          {!redemptions.length && (
            <p>
              <UiText text={"No rewards redeemed yet."} />
            </p>
          )}
          {redemptions.map((redemption) => (
            <article className="record" key={redemption.id}>
              <strong>{redemption.reward}</strong>
              <p>
                {redemption.points_spent}
                <UiText text={"points ·"} />
                {new Date(redemption.created_at).toLocaleString()}
              </p>
              <p role="status">
                {redemption.fulfilled_at
                  ? `Fulfilled ${new Date(redemption.fulfilled_at).toLocaleString()}`
                  : "Awaiting fulfilment"}
              </p>
            </article>
          ))}
          <h2>
            <UiText text={"Points history"} />
          </h2>
          {!statement?.results.length && (
            <p>
              <UiText text={"No points activity yet."} />
            </p>
          )}
          {statement?.results.map((entry) => (
            <article className="record" key={entry.id}>
              <strong>
                {entry.points > 0 ? "+" : ""}
                {entry.points}
                <UiText text={"points"} />
              </strong>
              <p>{new Date(entry.created_at).toLocaleString()}</p>
              <p>
                <UiText text={"Reference:"} />
                {entry.reference}
              </p>
            </article>
          ))}
        </>
      )}
      <div className="record-actions">
        <button
          className="button secondary"
          disabled={loading || page === 1}
          onClick={() => setPage(page - 1)}
        >
          <UiText text={"Previous"} />
        </button>
        <button
          className="button secondary"
          disabled={loading || !statement?.next}
          onClick={() => setPage(page + 1)}
        >
          <UiText text={"Next"} />
        </button>
        <button className="button secondary" disabled={loading} onClick={load}>
          <UiText text={"Refresh"} />
        </button>
      </div>
    </div>
  );
}
