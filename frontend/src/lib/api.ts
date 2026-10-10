export type Division = {
  id: number;
  slug: string;
  name: string;
  name_bn: string;
  description: string;
  description_bn: string;
  kind: string;
};
export type Offering = {
  id: number;
  slug: string;
  sku: string;
  division_slug: string;
  organization: number | null;
  merchant: string;
  name: string;
  name_bn: string;
  description: string;
  description_bn: string;
  price: string;
  sale_price: string | null;
  current_price: string;
  stock: number;
  prescription_required: boolean;
  duration_minutes: number;
  image: string;
  variants: ProductVariant[];
  food_option_groups: FoodOptionGroup[];
};
export type FoodOption = {
  id: number;
  name: string;
  name_bn: string;
  price: string;
};
export type FoodOptionGroup = {
  id: number;
  name: string;
  name_bn: string;
  min_choices: number;
  max_choices: number;
  options: FoodOption[];
};
export type ProductVariant = {
  id: number;
  label: string;
  attributes: Record<string, string | number | boolean>;
  sku: string;
  price: string;
  sale_price: string | null;
  current_price: string;
  stock: number;
};
export type Area = {
  id: number;
  name: string;
  name_bn: string;
  delivery_fee: string;
  district: string;
  divisions: number[];
};
export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  is_staff: boolean;
  email_verified: boolean;
  roles: string[];
};
export type PageResult<T> = {
  results: T[];
  count: number;
  next: string | null;
};
export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/api/v1/${path}`,
      { cache: "no-store" },
    );
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  idempotency?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    const csrf = await fetch("/api/v1/auth/csrf/", {
      credentials: "include",
    }).then((r) => r.json());
    headers["X-CSRFToken"] = csrf.csrfToken;
    if (!(body instanceof FormData))
      headers["Content-Type"] = "application/json";
  }
  if (idempotency) headers["Idempotency-Key"] = idempotency;
  const response = await fetch(`/api/v1/${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });
  if (response.status === 204) return undefined as T;
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error || data),
    );
  return data;
}
