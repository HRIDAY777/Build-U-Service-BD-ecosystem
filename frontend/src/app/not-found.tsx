import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-wrap empty">
      <span className="eyebrow">404</span>
      <h1>This page took a different route.</h1>
      <p>Let’s get you back to your everyday.</p>
      <Link className="button" href="/">
        Back home
      </Link>
    </div>
  );
}
