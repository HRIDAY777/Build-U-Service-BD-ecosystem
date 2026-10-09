"use client";
import { UiText } from "@/components/ui-text";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap empty">
      <h1>
        <UiText text={"We couldn’t load this page."} />
      </h1>
      <p>
        <UiText text={"Please try again in a moment."} />
      </p>
      <button className="button" onClick={reset}>
        <UiText text={"Try again"} />
      </button>
    </div>
  );
}
