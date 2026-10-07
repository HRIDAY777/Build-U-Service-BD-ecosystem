"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Area, Offering, PageResult } from "@/lib/api";
import { useApp, Text } from "./provider";
import { ShoppingBag, ArrowRight } from "lucide-react";
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
function fields(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<
    string,
    string
  >;
}
function address(data: Record<string, string>, prefix = "") {
  return {
    recipient: data[prefix + "recipient"],
    phone: data[prefix + "phone"],
    area: data[prefix + "area"],
    line: data[prefix + "line"],
  };
}
export function AddressFields({
  prefix = "",
  title = "",
}: {
  prefix?: string;
  title?: string;
}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api<PageResult<Area>>("areas/")
      .then((r) => setAreas(r.results))
      .catch(() => setFailed(true));
  }, []);
  return (
    <>
      <h3>{title}</h3>
      <div className="form-grid">
        <label className="field">
          <Text bn="নাম" en="Recipient name" />
          <input
            name={prefix + "recipient"}
            required
            maxLength={120}
            autoComplete="name"
          />
        </label>
        <label className="field">
          <Text bn="মোবাইল নম্বর" en="Phone number" />
          <input
            name={prefix + "phone"}
            required
            pattern="\+?[0-9]{10,15}"
            placeholder="01XXXXXXXXX"
            type="tel"
            autoComplete="tel"
          />
        </label>
        <label className="field wide">
          <Text bn="এলাকা" en="Service area" />
          <select name={prefix + "area"} required defaultValue="">
            <option value="">এলাকা বেছে নিন / Select area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name_bn} / {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field wide">
          <Text bn="সম্পূর্ণ ঠিকানা" en="Full address" />
          <input
            name={prefix + "line"}
            required
            maxLength={500}
            autoComplete="street-address"
          />
        </label>
      </div>
      {failed && (
        <p className="error">
          Service areas could not be loaded. Please refresh.
        </p>
      )}
    </>
  );
}
export function LoginForm() {
  const { refresh, toast } = useApp();
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `auth/${register ? "register" : "login"}/`,
        "POST",
        fields(e.currentTarget),
      );
      await refresh();
      toast(
        register
          ? "Account created / অ্যাকাউন্ট তৈরি হয়েছে"
          : "Welcome back / স্বাগতম",
      );
      router.push("/account");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-wrap">
      <div className="form-panel">
        <span className="eyebrow">ONE ACCOUNT. ALL OF U.</span>
        <h1>
          {register ? (
            <Text bn="আপনার নতুন শুরু" en="Make yourself at home" />
          ) : (
            <Text bn="আবারও স্বাগতম" en="Welcome back" />
          )}
        </h1>
        <p className="subtle">
          <Text
            bn="সব বিভাগের জন্য একই অ্যাকাউন্ট।"
            en="Your food, shopping and services. All together."
          />
        </p>
        <form onSubmit={submit}>
          {register && (
            <>
              <label className="field">
                নাম / Full name
                <input
                  name="first_name"
                  required
                  autoComplete="given-name"
                  maxLength={150}
                />
              </label>
              <label className="field">
                ইমেইল / Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label className="field">
                মোবাইল / Phone
                <input
                  name="phone"
                  type="tel"
                  pattern="\+?[0-9]{10,15}"
                  autoComplete="tel"
                />
              </label>
            </>
          )}
          <label className="field">
            ইউজারনেম / Username
            <input
              name="username"
              required
              autoComplete="username"
              maxLength={150}
            />
          </label>
          <label className="field">
            পাসওয়ার্ড / Password
            <input
              name="password"
              type="password"
              required
              minLength={register ? 10 : 1}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          {register && (
            <p className="subtle">
              Use at least 10 characters. Avoid common or entirely numeric
              passwords.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? "Please wait…"
              : register
                ? "অ্যাকাউন্ট তৈরি করুন / Create account"
                : "লগইন / Sign in"}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="switch-auth">
          <button
            className="button secondary"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
export function OfferingDetail({ item }: { item: Offering }) {
  const { lang, add } = useApp();
  const service = ["electrician", "mechanic", "services"].includes(
    item.division_slug,
  );
  return (
    <div className="page-wrap">
      <Link
        className="text-link"
        href={`/catalog?division=${item.division_slug}`}
      >
        ← Back to {item.division_slug}
      </Link>
      <div className="detail-grid" style={{ marginTop: 30 }}>
        <div className={`offering-image card-${item.division_slug}`}>
          <ShoppingBag size={150} />
        </div>
        <div>
          <span className="eyebrow">{item.merchant}</span>
          <h1>{lang === "bn" ? item.name_bn : item.name}</h1>
          <p>{lang === "bn" ? item.description_bn : item.description}</p>
          <div className="detail-price">
            ৳{Number(item.price).toLocaleString()}
          </div>
          {item.prescription_required && (
            <p className="notice">
              A prescription must be uploaded after placing your order. An
              authorized pharmacist must approve it before processing.
            </p>
          )}
          {service ? (
            <>
              <p className="subtle">
                Estimated service duration: {item.duration_minutes} minutes
              </p>
              <Link className="button" href={`/book/${item.id}`}>
                সময় বেছে নিন / Book service
              </Link>
            </>
          ) : (
            <button
              className="button"
              disabled={!item.stock}
              onClick={() => add(item)}
            >
              {item.stock ? "ব্যাগে যোগ করুন / Add to bag" : "Out of stock"}
            </button>
          )}
          <p className="demo-note">
            Demo offering · Final availability is checked on the server.
          </p>
        </div>
      </div>
    </div>
  );
}
export function CheckoutForm() {
  const { cart, remove, clear, user } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const [quote, setQuote] = useState<{
    subtotal: string;
    discount: string;
    delivery_fee: string;
    total: string;
  } | null>(null);
  const [methods, setMethods] = useState<string[]>(["cod"]);
  useEffect(() => {
    api<{ methods: string[] }>("payment-methods/")
      .then((r) => setMethods(r.methods))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
  }, [cart]);
  const subtotal = cart.reduce(
    (s, i) => s + Number(i.offering.price) * i.quantity,
    0,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = fields(e.currentTarget);
    try {
      const result = await api<{
        id: string;
        subtotal: string;
        discount: string;
        delivery_fee: string;
        total: string;
      }>(
        quote ? "orders/" : "orders/quote/",
        "POST",
        {
          items: cart.map((i) => ({
            offering: i.offering.id,
            quantity: i.quantity,
          })),
          address: address(data),
          coupon: data.coupon,
          notes: data.notes,
          payment_method: data.payment_method,
          ...(quote ? { expected_total: quote.total } : {}),
        },
        requestKey,
      );
      if (!quote) {
        setQuote(result);
        return;
      }
      clear();
      router.push("/account");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (!cart.length)
    return (
      <div className="empty">
        <h1>
          <Text bn="আপনার ব্যাগ খালি" en="A little room for your everyday" />
        </h1>
        <Link href="/catalog" className="button">
          সেবা দেখুন / Explore
        </Link>
      </div>
    );
  return (
    <>
      <span className="eyebrow">YOUR BAG</span>
      <h1>
        <Text bn="অর্ডার সম্পন্ন করুন" en="Make it yours" />
      </h1>
      <div className="checkout-grid">
        <form
          className="form-panel"
          onSubmit={submit}
          onChange={() => setQuote(null)}
        >
          <AddressFields />
          <label className="field">
            কুপন / Coupon
            <input name="coupon" maxLength={40} />
          </label>
          <label className="field">
            নোট / Notes
            <textarea name="notes" maxLength={1000} />
          </label>
          <p className="notice">
            Review the full price before confirming. Online payments, when
            available, are completed from your account after placing the order.
          </p>
          <label className="field">
            Payment method
            <select name="payment_method">
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m === "cod"
                    ? "Cash on delivery"
                    : "SSLCOMMERZ online payment"}
                </option>
              ))}
            </select>
          </label>
          {quote && (
            <div className="notice">
              <p>
                Subtotal: ৳{quote.subtotal} · Discount: ৳{quote.discount}
                <br />
                Delivery: ৳{quote.delivery_fee}
              </p>
              <strong>Total to pay: ৳{quote.total}</strong>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {user ? (
            <button className="button" disabled={busy || !requestKey}>
              {busy
                ? "Please wait…"
                : quote
                  ? "অর্ডার নিশ্চিত করুন / Confirm order"
                  : "মোট মূল্য দেখুন / Review total"}
            </button>
          ) : (
            <Link className="button" href="/login">
              লগইন করে এগিয়ে যান / Sign in to continue
            </Link>
          )}
        </form>
        <aside className="form-panel">
          <h2>আপনার ব্যাগ / Your bag</h2>
          {cart.map((i) => (
            <div className="cart-line" key={i.offering.id}>
              <div>
                <strong>{i.offering.name}</strong>
                <small>
                  {i.quantity} × ৳{i.offering.price}
                </small>
                <button onClick={() => remove(i.offering.id)}>Remove</button>
              </div>
              <span>৳{(Number(i.offering.price) * i.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="total-line">
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          <p className="subtle">
            Delivery is additional. Prices and stock are verified when you place
            the order.
          </p>
          {cart.some((i) => i.offering.prescription_required) && (
            <p className="notice">
              Prescription required. Upload it from your account after placing
              the order.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
export function BookingForm({ item }: { item: Offering }) {
  const { user } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : "",
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = fields(e.currentTarget);
    try {
      await api(
        "bookings/",
        "POST",
        {
          offering: item.id,
          scheduled_at: new Date(data.scheduled_at).toISOString(),
          address: address(data),
          notes: data.notes,
        },
        key,
      );
      router.push("/account");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">LET’S TAKE CARE OF IT</span>
      <h1>
        <Text bn={item.name_bn} en={item.name} />
      </h1>
      <p className="page-intro">
        ৳{item.price} · {item.duration_minutes} minutes · Payment after service
      </p>
      <form className="form-panel" onSubmit={submit}>
        <label className="field">
          তারিখ ও সময় / Date & time
          <input type="datetime-local" name="scheduled_at" required />
        </label>
        <p className="subtle">
          Time is entered in your device’s local timezone and converted for
          scheduling.
        </p>
        <AddressFields />
        <label className="field">
          সমস্যার বিবরণ / Describe the issue
          <textarea name="notes" maxLength={2000} />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {user ? (
          <button className="button" disabled={busy}>
            {busy ? "Booking…" : "বুকিং করুন / Request booking"}
          </button>
        ) : (
          <Link className="button" href="/login">
            Sign in to book
          </Link>
        )}
      </form>
    </>
  );
}
export function DeliveryForm() {
  const { user } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = fields(e.currentTarget);
    try {
      await api("deliveries/", "POST", {
        pickup: address(data, "pickup_"),
        dropoff: address(data, "dropoff_"),
        description: data.description,
        weight_kg: data.weight_kg,
      });
      router.push("/account");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">U DELIVERY</span>
      <h1>
        <Text bn="আপনার পার্সেল, যত্নের সাথে" en="From your door to theirs" />
      </h1>
      <p className="page-intro">
        Request a parcel delivery within available service areas. Base area fee
        plus ৳20 per kg above 1 kg; maximum 20 kg.
      </p>
      <form className="form-panel" onSubmit={submit}>
        <AddressFields prefix="pickup_" title="পিকআপ / Pickup" />
        <AddressFields prefix="dropoff_" title="ডেলিভারি / Drop-off" />
        <label className="field">
          পার্সেলের বিবরণ / Package description
          <input name="description" required maxLength={500} />
        </label>
        <label className="field">
          ওজন / Weight (kg)
          <input
            name="weight_kg"
            type="number"
            min="0.01"
            max="20"
            step="0.01"
            required
            defaultValue="1"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {user ? (
          <button className="button" disabled={busy}>
            {busy ? "Submitting…" : "ডেলিভারি অনুরোধ / Request delivery"}
          </button>
        ) : (
          <Link className="button" href="/login">
            Sign in to continue
          </Link>
        )}
      </form>
    </>
  );
}
export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [interest, setInterest] = useState("support");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("interest");
    if (value) setInterest(value);
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("leads/", "POST", {
        ...fields(e.currentTarget),
        source: "website",
      });
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">LET’S CONNECT</span>
      <h1>
        <Text bn="একসাথে শুরু হোক" en="Good things start with a conversation" />
      </h1>
      <p className="page-intro">
        <Text
          bn="প্রশ্ন, ব্যবসার সুযোগ অথবা আমাদের সাথে কাজ করার আগ্রহ — জানান আমাদের।"
          en="A question, a business idea, or a new opportunity. Tell us what’s on your mind."
        />
      </p>
      {sent ? (
        <div className="notice" role="status">
          আপনার বার্তা জমা হয়েছে। / Your message has been saved for our team.
        </div>
      ) : (
        <form className="form-panel" onSubmit={submit}>
          <label className="field">
            নাম / Name
            <input name="name" required maxLength={120} />
          </label>
          <label className="field">
            ইমেইল / Email
            <input name="email" type="email" required />
          </label>
          <label className="field">
            মোবাইল / Phone
            <input name="phone" type="tel" maxLength={20} />
          </label>
          <label className="field">
            আগ্রহের বিষয় / Interest
            <select
              name="interest"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            >
              <option value="support">Customer support</option>
              <option value="partner">Business partnership</option>
              <option value="provider">Service provider</option>
              <option value="rider">Delivery rider</option>
              <option value="careers">Careers</option>
            </select>
          </label>
          <label className="field">
            বার্তা / Message
            <textarea name="message" required maxLength={4000} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Sending…" : "বার্তা পাঠান / Send message"}
          </button>
        </form>
      )}
    </>
  );
}
