"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, User, Offering, ProductVariant, FoodOption } from "@/lib/api";
import { CartItem, cartLineKey } from "@/lib/cart";
import { translateUi } from "@/lib/translations";
type Context = {
  lang: "bn" | "en";
  setLang: (v: "bn" | "en") => void;
  user: User | null;
  refresh: () => Promise<void>;
  cart: CartItem[];
  add: (
    o: Offering,
    variant?: ProductVariant | null,
    foodOptions?: FoodOption[],
  ) => void;
  remove: (id: number, variantId?: number | null, optionIds?: number[]) => void;
  clear: () => void;
  toast: (message: string) => void;
};
const AppContext = createContext<Context | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<"bn" | "en">("bn");
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const refresh = async () => {
    try {
      setUser(await api<User | null>("auth/me/"));
    } catch {
      setUser(null);
    }
  };
  useEffect(() => {
    refresh();
    try {
      setCart(JSON.parse(localStorage.getItem("us-cart") || "[]"));
      setLangState(localStorage.getItem("us-lang") === "en" ? "en" : "bn");
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("us-cart", JSON.stringify(cart));
  }, [cart, loaded]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  function setLang(value: "bn" | "en") {
    setLangState(value);
    try {
      localStorage.setItem("us-lang", value);
    } catch {
      /* Language still changes when storage is blocked. */
    }
    document.documentElement.lang = value;
  }
  function add(
    offering: Offering,
    variant: ProductVariant | null = null,
    foodOptions: FoodOption[] = [],
  ) {
    if (offering.variants?.length && !variant) {
      setMessage(
        lang === "bn" ? "আগে পণ্যের অপশন বাছুন" : "Choose an option first",
      );
      return;
    }
    if (
      (offering.food_option_groups || []).some((group) => {
        const count = foodOptions.filter((option) =>
          group.options.some((choice) => choice.id === option.id),
        ).length;
        return count < group.min_choices || count > group.max_choices;
      })
    ) {
      setMessage(
        lang === "bn"
          ? "খাবারের প্রয়োজনীয় অপশন বাছুন"
          : "Choose the required food options",
      );
      return;
    }
    if (!(variant?.stock ?? offering.stock)) {
      setMessage(lang === "bn" ? "স্টক নেই" : "Out of stock");
      return;
    }
    if (
      cart.length &&
      (cart[0].offering.division_slug !== offering.division_slug ||
        cart[0].offering.organization !== offering.organization)
    ) {
      setMessage(
        lang === "bn"
          ? "একবারে একটি বিভাগের ও বিক্রেতার পণ্য অর্ডার করুন।"
          : "Please check out one division and merchant at a time.",
      );
      return;
    }
    setCart((items) => {
      const key = cartLineKey({ offering, variant, foodOptions });
      const found = items.find((i) => cartLineKey(i) === key);
      return found
        ? items.map((i) =>
            cartLineKey(i) === key
              ? {
                  ...i,
                  quantity: Math.min(
                    i.quantity + 1,
                    variant?.stock ?? offering.stock,
                    99,
                  ),
                }
              : i,
          )
        : [...items, { offering, variant, foodOptions, quantity: 1 }];
    });
    setMessage(lang === "bn" ? "ব্যাগে যোগ হয়েছে" : "Added to your bag");
  }
  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        user,
        refresh,
        cart,
        add,
        remove: (id, variantId, optionIds) =>
          setCart((items) =>
            items.filter(
              (i) =>
                i.offering.id !== id ||
                (variantId !== undefined &&
                  (i.variant?.id ?? null) !== variantId) ||
                (optionIds !== undefined &&
                  (i.foodOptions || [])
                    .map((option) => option.id)
                    .sort((a, b) => a - b)
                    .join(",") !==
                    [...optionIds].sort((a, b) => a - b).join(",")),
            ),
          ),
        clear: () => setCart([]),
        toast: setMessage,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {translateUi(message, lang)}
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Missing provider");
  return value;
}
export function Text({ bn, en }: { bn: string; en: string }) {
  return <>{(useApp().lang === "bn" ? bn : en).replaceAll("\\n", "\n")}</>;
}
