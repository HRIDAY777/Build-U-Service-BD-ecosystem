"use client";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
export default function VerifyEmail() {
  const params = useSearchParams();
  const [state, setState] = useState("Verifying your email…");
  useEffect(() => {
    const uid = params.get("uid"),
      token = params.get("token");
    if (!uid || !token) {
      setState("This verification link is incomplete.");
      return;
    }
    api("auth/email-verification/confirm/", "POST", { uid, token })
      .then(() => setState("Email verified successfully."))
      .catch((e) =>
        setState(
          e instanceof Error
            ? e.message
            : "This verification link is invalid or expired.",
        ),
      );
  }, [params]);
  return (
    <div className="auth-wrap">
      <div className="notice" role="status">
        {state}
      </div>
      <Link className="button" href="/account">
        <UiText text={"Go to account"} />
      </Link>
    </div>
  );
}
