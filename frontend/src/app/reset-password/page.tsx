"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Text } from "@/components/provider";
export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <div className="auth-wrap" role="status">
          <UiText text={"লোড হচ্ছে / Loading…"} />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
function ResetPasswordForm() {
  const params = useSearchParams();
  const [request, setRequest] = useState(!params.get("token"));
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setRequest(!params.get("token")), [params]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      if (request) {
        await api("auth/password-reset/", "POST", data);
        setSent(true);
      } else {
        await api("auth/password-reset/confirm/", "POST", {
          ...data,
          uid: params.get("uid"),
          token: params.get("token"),
        });
        setDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="auth-wrap">
        <div className="notice" role="status">
          <UiText
            text={
              "If an active account matches, reset instructions have been sent. Check your email."
            }
          />
        </div>
        <Link className="button" href="/login">
          <UiText text={"Back to sign in"} />
        </Link>
      </div>
    );
  if (done)
    return (
      <div className="auth-wrap">
        <div className="notice" role="status">
          <UiText text={"Password updated successfully."} />
        </div>
        <Link className="button" href="/login">
          <UiText text={"Sign in"} />
        </Link>
      </div>
    );
  return (
    <div className="auth-wrap">
      <div className="form-panel">
        <span className="eyebrow">
          <UiText text={"ACCOUNT SECURITY"} />
        </span>
        <h1>
          <Text
            bn={request ? "পাসওয়ার্ড ফিরে পান" : "নতুন পাসওয়ার্ড"}
            en={request ? "Reset your password" : "Choose a new password"}
          />
        </h1>
        <form onSubmit={submit}>
          {request ? (
            <label className="field">
              <UiText text={"ইমেইল / Email"} />
              <input name="email" type="email" required autoComplete="email" />
            </label>
          ) : (
            <label className="field">
              <UiText text={"নতুন পাসওয়ার্ড / New password"} />
              <input
                name="new_password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              <UiText text={error} />
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? (
              <UiText text={"Please wait…"} />
            ) : request ? (
              <UiText text={"Send reset link"} />
            ) : (
              <UiText text={"Update password"} />
            )}
          </button>
        </form>
        <p className="switch-auth">
          <Link className="text-link" href="/login">
            <UiText text={"Back to sign in"} />
          </Link>
        </p>
      </div>
    </div>
  );
}
