"use client";
import { TranslatedInput } from "@/components/translated-elements";

import { MechanicFields } from "./mechanic-details";
import { MechanicServiceDetail } from "./mechanic-service-detail";
import { BookingTimes } from "./booking-times";
import { UiText } from "@/components/ui-text";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Area, Offering, PageResult } from "@/lib/api";
import { useApp, Text } from "./provider";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { LocationPicker, addressLine } from "./location-picker";
import { Photo } from "./photo";
import { offeringPhoto } from "@/lib/photos";
import { cartLineKey, cartUnitPrice } from "@/lib/cart";
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
    line: addressLine(data[prefix + "line"], data[prefix + "geo_address"]),
  };
}
export function AddressFields({
  prefix = "",
  title = "",
  defaultDistrict = "",
  division = "",
}: {
  prefix?: string;
  title?: string;
  defaultDistrict?: string;
  division?: string;
}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [failed, setFailed] = useState(false);
  const [location, setLocation] = useState<{
    district: string;
    districtNames: string[];
    localities: string[];
  }>({ district: "", districtNames: [], localities: [] });
  const locationChanged = useCallback(
    (value: typeof location) => setLocation(value),
    [],
  );
  const [manualArea, setManualArea] = useState({ district: "", name: "" });
  const normalize = (value: string) =>
    value.trim().normalize("NFC").toLocaleLowerCase();
  const matchingAreas = location.district
    ? areas.filter((area) =>
        location.districtNames.some(
          (name) => normalize(name) === normalize(area.district),
        ),
      )
    : areas;
  const inferredArea = matchingAreas.find((area) =>
    location.localities.some((name) =>
      [area.name, area.name_bn].some(
        (value) => normalize(value) === normalize(name),
      ),
    ),
  );
  const selectedArea =
    inferredArea?.name ||
    (manualArea.district === location.district &&
    matchingAreas.some((area) => area.name === manualArea.name)
      ? manualArea.name
      : matchingAreas.length === 1
        ? matchingAreas[0].name
        : "");
  useEffect(() => {
    let active = true;
    async function load() {
      const all: Area[] = [];
      let page = 1;
      let more = true;
      while (more) {
        const result = await api<PageResult<Area>>(
          `areas/?division=${encodeURIComponent(division)}&page=${page++}`,
        );
        all.push(...result.results);
        more = !!result.next;
      }
      if (active) setAreas(all);
    }
    void load().catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [division]);
  return (
    <>
      <h3>
        <UiText text={title} />
      </h3>
      <div className="form-grid">
        <LocationPicker
          prefix={prefix}
          districtField
          defaultDistrict={defaultDistrict}
          onSelectionChange={locationChanged}
        />
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
          <TranslatedInput
            name={prefix + "phone"}
            required
            pattern="\+?[0-9]{10,15}"
            placeholder="01XXXXXXXXX"
            type="tel"
            autoComplete="tel"
          />
        </label>
        <label className="field wide">
          <Text
            bn="সেবার জোন / চার্জের এলাকা"
            en="Service zone / pricing area"
          />
          <select
            name={prefix + "area"}
            required
            value={selectedArea}
            onChange={(event) =>
              setManualArea({
                district: location.district,
                name: event.target.value,
              })
            }
          >
            <option value="">
              {location.district && !matchingAreas.length ? (
                <UiText
                  text={
                    "এই জেলায় সেবার জোন নেই / No service zone in this district"
                  }
                />
              ) : (
                <UiText text={"সেবার জোন বেছে নিন / Select service zone"} />
              )}
            </option>
            {matchingAreas.map((a) => (
              <option key={a.id} value={a.name}>
                <Text bn={a.name_bn} en={a.name} />
              </option>
            ))}
          </select>
          <small>
            {inferredArea || matchingAreas.length === 1 ? (
              <UiText
                text={
                  "আপনার ঠিকানা থেকে জোন বসানো হয়েছে। / Zone matched from your address."
                }
              />
            ) : (
              <UiText
                text={
                  "এটি নতুন ঠিকানা নয়; ডেলিভারি/সেবার চার্জের জোন। / This selects service coverage and pricing, not another address."
                }
              />
            )}
          </small>
          {location.district && !matchingAreas.length && !failed && (
            <p className="error" role="status">
              <UiText
                text={
                  "বাছাই করা ঠিকানা ঠিক আছে, তবে এই জেলায় সেবার জোন এখনো চালু করা হয়নি। ঢাকার কোনো এলাকা দিয়ে এই ঠিকানার বুকিং করা যাবে না। / This district has no configured service coverage yet."
                }
              />
            </p>
          )}
        </label>
        <label className="field wide">
          <Text
            bn="বাড়ি / হোল্ডিং, রাস্তা ও ল্যান্ডমার্ক"
            en="House / holding, street and landmark"
          />
          <TranslatedInput
            name={prefix + "line"}
            required
            maxLength={500}
            autoComplete="street-address"
            placeholder="যেমন: বাড়ি ১২, মসজিদের পাশে / House 12, beside the mosque"
          />
          <small>
            <UiText
              text={
                "উপরে বাছাই করা গ্রাম, ইউনিয়ন, থানা ও জেলা নিজে যুক্ত হবে; এখানে আবার লিখবেন না। / Selected locality details are added automatically."
              }
            />
          </small>
        </label>
      </div>
      {failed && (
        <p className="error">
          <UiText text={"Service areas could not be loaded. Please refresh."} />
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
        <span className="eyebrow">
          <UiText text={"ONE ACCOUNT. ALL OF U."} />
        </span>
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
                <UiText text={"নাম / Full name"} />
                <input
                  name="first_name"
                  required
                  autoComplete="given-name"
                  maxLength={150}
                />
              </label>
              <label className="field">
                <UiText text={"ইমেইল / Email"} />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <UiText text={"মোবাইল / Phone"} />
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
            {register ? (
              <Text bn="ইউজারনেম" en="Username" />
            ) : (
              <Text bn="ইমেইল বা ইউজারনেম" en="Email or username" />
            )}
            <input
              name="username"
              required
              autoComplete="username"
              maxLength={register ? 150 : 254}
            />
          </label>
          <label className="field">
            <UiText text={"পাসওয়ার্ড / Password"} />
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
              <UiText
                text={
                  "Use at least 10 characters. Avoid common or entirely numeric passwords."
                }
              />
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              <UiText text={error} />
            </p>
          )}
          <button className="button" disabled={busy}>
            <UiText
              text={
                busy
                  ? "Please wait…"
                  : register
                    ? "অ্যাকাউন্ট তৈরি করুন / Create account"
                    : "লগইন / Sign in"
              }
            />
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
            <UiText
              text={
                register
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"
              }
            />
          </button>
        </div>
        {!register && (
          <p className="switch-auth">
            <Link className="text-link" href="/reset-password">
              <UiText text={"Forgot password? / পাসওয়ার্ড ভুলে গেছেন?"} />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
export function OfferingDetail({ item }: { item: Offering }) {
  const { lang, add } = useApp();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const variants = item.variants ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const [foodIds, setFoodIds] = useState<number[]>([]);
  const foodGroups = item.food_option_groups ?? [];
  const foodOptions = foodGroups
    .flatMap((group) => group.options)
    .filter((option) => foodIds.includes(option.id));
  const foodValid = foodGroups.every((group) => {
    const count = group.options.filter((option) =>
      foodIds.includes(option.id),
    ).length;
    return count >= group.min_choices && count <= group.max_choices;
  });
  const optionPrice = foodOptions.reduce(
    (sum, option) => sum + Number(option.price),
    0,
  );
  const regularPrice = selectedVariant?.price ?? item.price;
  const currentPrice =
    selectedVariant?.current_price ?? item.current_price ?? item.price;
  const service = ["electrician", "mechanic", "services"].includes(
    item.division_slug,
  );
  if (item.division_slug === "mechanic")
    return <MechanicServiceDetail item={item} />;
  return (
    <div className="page-wrap">
      <Link
        className="text-link"
        href={`/catalog?division=${item.division_slug}`}
      >
        <UiText text={"← Back to"} />
        {item.division_slug}
      </Link>
      <div className="detail-grid" style={{ marginTop: 30 }}>
        <div className={`offering-image card-${item.division_slug}`}>
          {offeringPhoto(item) ? (
            <Photo
              src={offeringPhoto(item)}
              alt={lang === "bn" ? item.name_bn : item.name}
              eager
            />
          ) : (
            <ShoppingBag size={150} />
          )}
          {item.sku?.startsWith("DEMO-") && (
            <small className="photo-demo-label">
              <UiText text={"দৃষ্টান্তমূলক ছবি / Demo imagery"} />
            </small>
          )}
        </div>
        <div>
          <span className="eyebrow">{item.merchant}</span>
          <h1>{lang === "bn" ? item.name_bn : item.name}</h1>
          <p>{lang === "bn" ? item.description_bn : item.description}</p>
          <div className="detail-price">
            {Number(currentPrice) < Number(regularPrice) && (
              <s>৳{Number(regularPrice).toLocaleString()} </s>
            )}
            ৳{(Number(currentPrice) + optionPrice).toLocaleString()}
          </div>
          {item.prescription_required && (
            <p className="notice">
              <UiText
                text={
                  "A prescription must be uploaded after placing your order. An authorized pharmacist must approve it before processing."
                }
              />
            </p>
          )}
          {service ? (
            <>
              <p className="subtle">
                <UiText text={"Estimated service duration:"} />
                {item.duration_minutes}
                <UiText text={"minutes"} />
              </p>
              <Link className="button" href={`/book/${item.id}`}>
                <UiText text={"সময় বেছে নিন / Book service"} />
              </Link>
            </>
          ) : (
            <>
              {variants.length > 0 && (
                <label className="field">
                  <UiText text={"Size / Color / Option"} />
                  <select
                    required
                    value={selectedVariantId ?? ""}
                    onChange={(event) =>
                      setSelectedVariantId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">
                      <UiText text={"Select an option"} />
                    </option>
                    {variants.map((variant) => (
                      <option
                        key={variant.id}
                        value={variant.id}
                        disabled={!variant.stock}
                      >
                        {variant.label} ·{" "}
                        {Object.entries(variant.attributes)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")}{" "}
                        · ৳{Number(variant.current_price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {foodGroups.map((group) => (
                <fieldset key={group.id}>
                  <legend>
                    {lang === "bn" ? group.name_bn || group.name : group.name}
                  </legend>
                  <p>
                    {lang === "bn"
                      ? `কমপক্ষে ${group.min_choices}, সর্বোচ্চ ${group.max_choices}টি বাছুন`
                      : `Choose ${group.min_choices} to ${group.max_choices}`}
                  </p>
                  {group.options.map((option) => (
                    <label key={option.id} className="field">
                      <input
                        type="checkbox"
                        checked={foodIds.includes(option.id)}
                        disabled={
                          !foodIds.includes(option.id) &&
                          group.max_choices > 1 &&
                          group.options.filter((o) => foodIds.includes(o.id))
                            .length >= group.max_choices
                        }
                        onChange={(event) =>
                          setFoodIds((ids) =>
                            event.target.checked
                              ? [
                                  ...ids.filter(
                                    (id) =>
                                      group.max_choices !== 1 ||
                                      !group.options.some((o) => o.id === id),
                                  ),
                                  option.id,
                                ]
                              : ids.filter((id) => id !== option.id),
                          )
                        }
                      />
                      {lang === "bn"
                        ? option.name_bn || option.name
                        : option.name}{" "}
                      · +৳{option.price}
                    </label>
                  ))}
                </fieldset>
              ))}
              <button
                className="button"
                disabled={
                  !foodValid ||
                  (variants.length ? !selectedVariant?.stock : !item.stock)
                }
                onClick={() => add(item, selectedVariant, foodOptions)}
              >
                {(selectedVariant?.stock ?? item.stock) ? (
                  <UiText text={"ব্যাগে যোগ করুন / Add to bag"} />
                ) : (
                  <UiText text={"Out of stock"} />
                )}
              </button>
            </>
          )}
          <p className="demo-note">
            <UiText
              text={
                "Demo offering · Final availability is checked on the server."
              }
            />
          </p>
        </div>
      </div>
    </div>
  );
}
export function CheckoutForm() {
  const { cart, remove, clear, user } = useApp();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const [quote, setQuote] = useState<{
    subtotal: string;
    discount: string;
    delivery_fee: string;
    total: string;
    preparation_minutes: number | null;
  } | null>(null);
  const [methods, setMethods] = useState<string[]>(["cod"]);
  const [savedAddresses, setSavedAddresses] = useState<
    {
      id: number;
      label: string;
      recipient: string;
      phone: string;
      district: string;
      area: string;
      line: string;
    }[]
  >([]);
  const [savedDistrict, setSavedDistrict] = useState("");
  useEffect(() => {
    api<{ methods: string[] }>("payment-methods/")
      .then((r) => setMethods(r.methods))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      return;
    }
    api<PageResult<(typeof savedAddresses)[number]>>("addresses/")
      .then((r) => setSavedAddresses(r.results))
      .catch(() => setSavedAddresses([]));
  }, [user]);
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
  }, [cart]);
  const subtotal = cart.reduce(
    (sum, item) => sum + cartUnitPrice(item) * item.quantity,
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
        preparation_minutes: number | null;
      }>(
        quote ? "orders/" : "orders/quote/",
        "POST",
        {
          items: cart.map((i) => ({
            offering: i.offering.id,
            ...(i.variant ? { variant: i.variant.id } : {}),
            quantity: i.quantity,
            food_options: (i.foodOptions || [])
              .map((option) => option.id)
              .sort((a, b) => a - b),
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
      if (user && data.save_address === "on") {
        try {
          await api("addresses/", "POST", {
            label: "Checkout address",
            recipient: data.recipient,
            phone: data.phone,
            district: data.district || data.area,
            area: data.area,
            line: addressLine(data.line, data.geo_address),
          });
        } catch {
          // The order is already placed; address saving is a convenience.
        }
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
          <UiText text={"সেবা দেখুন / Explore"} />
        </Link>
      </div>
    );
  return (
    <>
      <span className="eyebrow">
        <UiText text={"YOUR BAG"} />
      </span>
      <h1>
        <Text bn="অর্ডার সম্পন্ন করুন" en="Make it yours" />
      </h1>
      <div className="checkout-grid">
        <form
          ref={formRef}
          className="form-panel"
          onSubmit={submit}
          onChange={() => setQuote(null)}
        >
          {savedAddresses.length > 0 && (
            <label className="field">
              <UiText text={"Saved address / সংরক্ষিত ঠিকানা"} />
              <select
                defaultValue=""
                onChange={(e) => {
                  const selected = savedAddresses.find(
                    (item) => String(item.id) === e.currentTarget.value,
                  );
                  if (!selected || !formRef.current) return;
                  formRef.current.dispatchEvent(new Event("address:reset"));
                  setSavedDistrict(selected.district);
                  for (const [name, value] of Object.entries({
                    recipient: selected.recipient,
                    phone: selected.phone,
                    area: selected.area,
                    line: selected.line,
                  })) {
                    const input = formRef.current.elements.namedItem(name);
                    if (
                      input instanceof HTMLInputElement ||
                      input instanceof HTMLSelectElement
                    ) {
                      input.value = value;
                    }
                  }
                }}
              >
                <option value="">
                  <UiText text={"Choose a saved address"} />
                </option>
                {savedAddresses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.area} · {item.line}
                  </option>
                ))}
              </select>
            </label>
          )}
          <AddressFields defaultDistrict={savedDistrict} />
          {user && (
            <label className="check-row">
              <input name="save_address" type="checkbox" />
              <UiText
                text={
                  "Save this address for next time / পরেরবারের জন্য ঠিকানা সংরক্ষণ"
                }
              />
            </label>
          )}
          <label className="field">
            <UiText text={"কুপন / Coupon"} />
            <input name="coupon" maxLength={40} />
          </label>
          <label className="field">
            <UiText text={"নোট / Notes"} />
            <textarea name="notes" maxLength={1000} />
          </label>
          <p className="notice">
            <UiText
              text={
                "Review the full price before confirming. Online payments, when available, are completed from your account after placing the order."
              }
            />
          </p>
          <label className="field">
            <UiText text={"Payment method"} />
            <select name="payment_method">
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m === "cod" ? (
                    <UiText text={"Cash on delivery"} />
                  ) : (
                    <UiText text={"SSLCOMMERZ online payment"} />
                  )}
                </option>
              ))}
            </select>
          </label>
          {quote && (
            <div className="notice">
              <p>
                <UiText text={"Subtotal: ৳"} />
                {quote.subtotal}
                <UiText text={"· Discount: ৳"} />
                {quote.discount}
                <br />
                <UiText text={"Delivery: ৳"} />
                {quote.delivery_fee}
              </p>
              <strong>
                <UiText text={"Total to pay: ৳"} />
                {quote.total}
              </strong>
              {quote.preparation_minutes != null && (
                <p>
                  <Text
                    bn="খাবার প্রস্তুতির আনুমানিক সময়: "
                    en="Estimated food preparation: "
                  />
                  {quote.preparation_minutes}{" "}
                  <Text
                    bn="মিনিট; ডেলিভারির সময় আলাদা।"
                    en="minutes; delivery time is additional."
                  />
                </p>
              )}
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              <UiText text={error} />
            </p>
          )}
          {user ? (
            <button className="button" disabled={busy || !requestKey}>
              {busy ? (
                <UiText text={"Please wait…"} />
              ) : quote ? (
                <UiText text={"অর্ডার নিশ্চিত করুন / Confirm order"} />
              ) : (
                <UiText text={"মোট মূল্য দেখুন / Review total"} />
              )}
            </button>
          ) : (
            <Link className="button" href="/login">
              <UiText text={"লগইন করে এগিয়ে যান / Sign in to continue"} />
            </Link>
          )}
        </form>
        <aside className="form-panel">
          <h2>
            <UiText text={"আপনার ব্যাগ / Your bag"} />
          </h2>
          {cart.map((i) => (
            <div className="cart-line" key={cartLineKey(i)}>
              <div>
                <strong>{i.offering.name}</strong>
                {i.variant && <small>{i.variant.label}</small>}
                {(i.foodOptions || []).map((option) => (
                  <small key={option.id}>
                    {option.name} · +৳{option.price}
                  </small>
                ))}
                {Number(i.variant?.current_price ?? i.offering.current_price) <
                  Number(i.variant?.price ?? i.offering.price) && (
                  <small>
                    <s>৳{i.variant?.price ?? i.offering.price}</s>
                  </small>
                )}
                <small>
                  {i.quantity} × ৳{cartUnitPrice(i).toFixed(2)}
                </small>
                <button
                  onClick={() =>
                    remove(
                      i.offering.id,
                      i.variant?.id ?? null,
                      (i.foodOptions || []).map((option) => option.id),
                    )
                  }
                >
                  <UiText text={"Remove"} />
                </button>
              </div>
              <span>৳{(cartUnitPrice(i) * i.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="total-line">
            <span>
              <UiText text={"Subtotal"} />
            </span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          <p className="subtle">
            <UiText
              text={
                "Delivery is additional. Prices and stock are verified when you place the order."
              }
            />
          </p>
          {cart.some((i) => i.offering.prescription_required) && (
            <p className="notice">
              <UiText
                text={
                  "Prescription required. Upload it from your account after placing the order."
                }
              />
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
export function BookingForm({ item }: { item: Offering }) {
  const { user } = useApp();
  const mechanic = item.division_slug === "mechanic";
  const router = useRouter();
  const [scheduled, setScheduled] = useState("");
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
          scheduled_at: new Date(`${data.scheduled_at}+06:00`).toISOString(),
          address: address(data),
          notes: data.notes,
          ...(item.division_slug === "mechanic"
            ? {
                service_details: {
                  vehicle_type: data.vehicle_type,
                  vehicle_model: data.vehicle_model,
                  registration: data.registration,
                  problem_type: data.problem_type,
                  mobility: data.mobility,
                  odometer_km: data.odometer_km
                    ? Number(data.odometer_km)
                    : null,
                },
              }
            : {}),
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
    <div className={mechanic ? "mechanic-booking" : undefined}>
      {mechanic && (
        <Link className="mechanic-back-link" href="/mechanic">
          <span aria-hidden="true">←</span>
          <Text bn="মেকানিক সেবায় ফিরে যান" en="Back to mechanic services" />
        </Link>
      )}
      <div className={mechanic ? "mechanic-booking-heading" : undefined}>
        <span className="eyebrow">
          <UiText text={"LET’S TAKE CARE OF IT"} />
        </span>
        <h1>
          <Text bn={item.name_bn} en={item.name} />
        </h1>
        <p className="page-intro">
          ৳{item.price} · {item.duration_minutes}
          <UiText text={"minutes · Payment after service"} />
        </p>
      </div>
      {(item.service_leave_dates || []).length > 0 && (
        <p>
          <UiText text={"বন্ধের তারিখ / Closed dates:"} />
          {item.service_leave_dates.join(", ")}
        </p>
      )}
      {Object.keys(item.service_weekly_hours || {}).length > 0 && (
        <div className="notice">
          <strong>
            <UiText text={"বুকিংয়ের সময় / Booking hours (Bangladesh)"} />
          </strong>
          {[
            "সোমবার",
            "মঙ্গলবার",
            "বুধবার",
            "বৃহস্পতিবার",
            "শুক্রবার",
            "শনিবার",
            "রবিবার",
          ].map((day, i) => (
            <p key={day}>
              <UiText text={day} />:{" "}
              {(item.service_weekly_hours[String(i)] || [])
                .map((slot) => `${slot.open}–${slot.close}`)
                .join(", ") || <Text bn="বন্ধ" en="Closed" />}
            </p>
          ))}
        </div>
      )}
      <div className={mechanic ? "mechanic-booking-grid" : undefined}>
        <form className="form-panel" onSubmit={submit}>
          {mechanic && (
            <div className="mechanic-form-heading">
              <span className="eyebrow">
                <Text bn="আপনার বুকিং" en="YOUR BOOKING" />
              </span>
              <h2>
                <Text bn="সময় ও ঠিকানা জানান" en="Tell us when and where" />
              </h2>
              <p>
                <Text
                  bn="তথ্য পূরণ করে অনুরোধ পাঠান। টিম সময় নিশ্চিত করবে।"
                  en="Send your details and preferred time. Our team confirms the appointment."
                />
              </p>
            </div>
          )}
          <label className="field">
            <UiText
              text={"তারিখ ও সময় (বাংলাদেশ) / Date & time (Bangladesh)"}
            />
            <input
              type="datetime-local"
              name="scheduled_at"
              required
              value={scheduled}
              onInput={(e) => setScheduled(e.currentTarget.value)}
            />
          </label>
          <BookingTimes
            key={scheduled.slice(0, 10)}
            id={item.id}
            day={scheduled.slice(0, 10)}
            onSelect={setScheduled}
          />

          <p className="subtle">
            <UiText
              text={
                "Times use Bangladesh time (Asia/Dhaka). The team confirms your appointment."
              }
            />
          </p>
          <AddressFields division={item.division_slug} />
          {item.division_slug === "mechanic" && <MechanicFields />}
          <label className="field">
            <UiText text={"সমস্যার বিবরণ / Describe the issue"} />
            <textarea name="notes" maxLength={2000} />
          </label>
          {error && (
            <p role="alert" className="error">
              <UiText text={error} />
            </p>
          )}
          {user ? (
            <button className="button" disabled={busy}>
              {busy ? (
                <UiText text={"Booking…"} />
              ) : (
                <UiText text={"বুকিং করুন / Request booking"} />
              )}
            </button>
          ) : (
            <Link className="button" href="/login">
              <UiText text={"Sign in to book"} />
            </Link>
          )}
        </form>
        {mechanic && (
          <aside className="mechanic-booking-aside">
            <Photo
              src={offeringPhoto(item) || "/images/photos/mechanic.jpg"}
              alt={`${item.name_bn} / ${item.name}`}
            />
            <div className="mechanic-booking-aside-body">
              <span className="eyebrow">
                <Text bn="নির্বাচিত সেবা" en="SELECTED SERVICE" />
              </span>
              <h2>
                <Text bn={item.name_bn} en={item.name} />
              </h2>
              <dl>
                <div>
                  <dt>
                    <Text bn="সেবার মূল্য" en="Service fee" />
                  </dt>
                  <dd>৳{item.price}</dd>
                </div>
                <div>
                  <dt>
                    <Text bn="নির্ধারিত সময়" en="Service duration" />
                  </dt>
                  <dd>
                    {item.duration_minutes} <Text bn="মিনিট" en="minutes" />
                  </dd>
                </div>
              </dl>
              <p>
                <Text
                  bn="বাড়তি মেরামত বা যন্ত্রাংশের খরচ কাজের আগে নিশ্চিত করতে হবে।"
                  en="Confirm additional repair and parts costs before work."
                />
              </p>
              <div className="mechanic-aside-next">
                <strong>
                  <Text bn="এরপর কী হবে?" en="What happens next?" />
                </strong>
                <p>
                  <Text
                    bn="টিম এলাকা ও সময় যাচাই করবে। বুকিংয়ের অগ্রগতি ও কাজের রিপোর্ট আপনার অ্যাকাউন্টে দেখতে পাবেন।"
                    en="The team reviews your area and time. Follow progress and review the work report in your account."
                  />
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
export function DeliveryForm() {
  const { user } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<{
    base_fee: string;
    weight_fee: string;
    fee: string;
  } | null>(null);
  const deliveryKey = useRef("");
  const deliveryRevision = useRef(0);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = fields(e.currentTarget);
    const revision = deliveryRevision.current;
    try {
      const payload = {
        pickup: {
          ...address(data, "pickup_"),
          instructions: data.pickup_instructions,
        },
        dropoff: {
          ...address(data, "dropoff_"),
          instructions: data.dropoff_instructions,
        },
        description: data.description,
        weight_kg: data.weight_kg,
        quantity: data.quantity,
        cod_amount: data.cod_amount,
        package_type: data.package_type,
        fragile: data.fragile === "on",
        pickup_at: data.pickup_at
          ? new Date(data.pickup_at).toISOString()
          : null,
        instructions: data.instructions,
      };
      if (!quote) {
        const price = await api<{
          base_fee: string;
          weight_fee: string;
          fee: string;
        }>("deliveries/quote/", "POST", payload);
        if (revision === deliveryRevision.current) {
          setQuote(price);
          if (!deliveryKey.current) deliveryKey.current = crypto.randomUUID();
        }
      } else {
        const result = await api<{ id: string }>(
          "deliveries/",
          "POST",
          { ...payload, expected_fee: quote.fee },
          deliveryKey.current,
        );
        router.push(`/delivery/${result.id}`);
      }
    } catch (e) {
      setError(errorText(e));
      setQuote(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">
        <UiText text={"U DELIVERY"} />
      </span>
      <h2>
        <Text bn="আপনার পার্সেল, যত্নের সাথে" en="From your door to theirs" />
      </h2>
      <p className="page-intro">
        <UiText
          text={
            "Request a parcel delivery within available service areas. Base area fee plus ৳20 per kg above 1 kg; maximum 20 kg."
          }
        />
      </p>
      <form
        className="form-panel"
        onSubmit={submit}
        onChange={() => {
          setQuote(null);
          deliveryRevision.current++;
          deliveryKey.current = "";
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('[role="option"]')) {
            setQuote(null);
            deliveryRevision.current++;
            deliveryKey.current = "";
          }
        }}
      >
        <AddressFields
          prefix="pickup_"
          title="পিকআপ / Pickup"
          division="delivery"
        />
        <label className="field">
          <UiText text={"পিকআপ নির্দেশনা / Pickup instructions"} />
          <textarea name="pickup_instructions" maxLength={500} />
        </label>
        <AddressFields
          prefix="dropoff_"
          title="ডেলিভারি / Drop-off"
          division="delivery"
        />
        <label className="field">
          <UiText text={"গন্তব্যের নির্দেশনা / Drop-off instructions"} />
          <textarea name="dropoff_instructions" maxLength={500} />
        </label>
        <label className="field">
          <UiText text={"পার্সেলের বিবরণ / Package description"} />
          <input name="description" required maxLength={500} />
        </label>
        <label className="field">
          <UiText text={"পার্সেলের ধরন / Package type"} />
          <select name="package_type" defaultValue="general">
            <option value="general">
              <UiText text={"সাধারণ / General"} />
            </option>
            <option value="documents">
              <UiText text={"ডকুমেন্ট / Documents"} />
            </option>
            <option value="clothing">
              <UiText text={"পোশাক / Clothing"} />
            </option>
            <option value="electronics">
              <UiText text={"ইলেকট্রনিকস / Electronics"} />
            </option>
            <option value="other">
              <UiText text={"অন্যান্য / Other"} />
            </option>
          </select>
        </label>
        <label className="field">
          <UiText text={"পার্সেলের সংখ্যা / Quantity"} />
          <input
            type="number"
            name="quantity"
            min="1"
            max="100"
            step="1"
            defaultValue="1"
            required
          />
        </label>
        <label className="field">
          <UiText
            text={"প্রাপকের কাছ থেকে সংগ্রহযোগ্য মূল্য / Parcel COD (৳)"}
          />
          <input
            type="number"
            name="cod_amount"
            min="0"
            max="100000"
            step="0.01"
            defaultValue="0"
            required
          />
          <small>
            <UiText
              text={
                "পার্সেলের মূল্য; ডেলিভারি চার্জ আলাদা। প্রেরককে স্বয়ংক্রিয় পেমেন্ট পাঠানো হয় না।"
              }
            />
          </small>
        </label>
        <label className="field">
          <UiText
            text={"পিকআপের পছন্দের সময় / Preferred pickup time (optional)"}
          />
          <input type="datetime-local" name="pickup_at" />
        </label>
        <label>
          <input type="checkbox" name="fragile" />
          <UiText text={"ভঙ্গুর পার্সেল / Handle with care"} />
        </label>
        <label className="field">
          <UiText text={"বিশেষ নির্দেশনা / Instructions"} />
          <textarea name="instructions" maxLength={1000} />
        </label>
        <p>
          <UiText
            text={
              "বিপজ্জনক, অবৈধ বা নিষিদ্ধ পণ্য পাঠাবেন না। পিকআপের সময় অপারেশন টিম নিশ্চিত করবে। COD থাকলে রাইডার হস্তান্তরের সময় সংগ্রহের রেকর্ড দেবেন। বীমা অন্তর্ভুক্ত নয়।"
            }
          />
        </p>
        {quote && (
          <div className="notice" role="status">
            <UiText text={"বেস চার্জ / Base: ৳"} />
            {quote.base_fee}
            <br />
            <UiText text={"অতিরিক্ত ওজন / Extra weight: ৳"} />
            {quote.weight_fee}
            <br />
            <strong>
              <UiText text={"ডেলিভারি চার্জ / Delivery fee: ৳"} />
              {quote.fee}
            </strong>
            <p>
              <UiText
                text={
                  "এটি সার্ভিস চার্জ; অনলাইনে টাকা কাটা হচ্ছে না। তথ্য বদলালে আবার চার্জ দেখুন।"
                }
              />
            </p>
          </div>
        )}
        <label className="field">
          <UiText text={"সব পার্সেলের মোট ওজন / Total weight (kg)"} />
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
            <UiText text={error} />
          </p>
        )}
        {user ? (
          <button className="button" disabled={busy}>
            {busy ? (
              <UiText text={"Submitting…"} />
            ) : quote ? (
              <UiText text={"ডেলিভারি নিশ্চিত করুন / Confirm delivery"} />
            ) : (
              <UiText text={"চার্জ দেখুন / Review delivery fee"} />
            )}
          </button>
        ) : (
          <Link className="button" href="/login">
            <UiText text={"Sign in to continue"} />
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
      <span className="eyebrow">
        <UiText text={"LET’S CONNECT"} />
      </span>
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
          <UiText
            text={
              "আপনার বার্তা জমা হয়েছে। / Your message has been saved for our team."
            }
          />
        </div>
      ) : (
        <form className="form-panel" onSubmit={submit}>
          <label className="field">
            <UiText text={"নাম / Name"} />
            <input name="name" required maxLength={120} />
          </label>
          <label className="field">
            <UiText text={"ইমেইল / Email"} />
            <input name="email" type="email" required />
          </label>
          <label className="field">
            <UiText text={"মোবাইল / Phone"} />
            <input name="phone" type="tel" maxLength={20} />
          </label>
          <label className="field">
            <UiText text={"আগ্রহের বিষয় / Interest"} />
            <select
              name="interest"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            >
              <option value="support">
                <UiText text={"Customer support"} />
              </option>
              <option value="partner">
                <UiText text={"Business partnership"} />
              </option>
              <option value="provider">
                <UiText text={"Service provider"} />
              </option>
              <option value="rider">
                <UiText text={"Delivery rider"} />
              </option>
              <option value="careers">
                <UiText text={"Careers"} />
              </option>
            </select>
          </label>
          <label className="field">
            <UiText text={"বার্তা / Message"} />
            <textarea name="message" required maxLength={4000} />
          </label>
          {error && (
            <p className="error" role="alert">
              <UiText text={error} />
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? (
              <UiText text={"Sending…"} />
            ) : (
              <UiText text={"বার্তা পাঠান / Send message"} />
            )}
          </button>
        </form>
      )}
    </>
  );
}
