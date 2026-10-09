import { UiText } from "@/components/ui-text";
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-wrap empty">
      <span className="eyebrow">404</span>
      <h1>
        <UiText text={"This page took a different route."} />
      </h1>
      <p>
        <UiText text={"Let’s get you back to your everyday."} />
      </p>
      <Link className="button" href="/">
        <UiText text={"Back home"} />
      </Link>
    </div>
  );
}
