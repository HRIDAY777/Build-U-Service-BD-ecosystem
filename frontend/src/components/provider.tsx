"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, User, Offering, ProductVariant } from "@/lib/api";
type CartItem = {
  offering: Offering;
  variant?: ProductVariant | null;
  quantity: number;
};
type Context = {
  lang: "bn" | "en";
  setLang: (v: "bn" | "en") => void;
  user: User | null;
  refresh: () => Promise<void>;
  cart: CartItem[];
  add: (o: Offering, variant?: ProductVariant | null) => void;
  remove: (id: number, variantId?: number | null) => void;
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
  function add(offering: Offering, variant: ProductVariant | null = null) {
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
      const found = items.find(
        (i) =>
          i.offering.id === offering.id &&
          (i.variant?.id ?? null) === variant?.id,
      );
      return found
        ? items.map((i) =>
            i.offering.id === offering.id &&
            (i.variant?.id ?? null) === variant?.id
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
        : [...items, { offering, variant, quantity: 1 }];
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
        remove: (id, variantId) =>
          setCart((items) =>
            items.filter(
              (i) =>
                i.offering.id !== id ||
                (variantId !== undefined &&
                  (i.variant?.id ?? null) !== variantId),
            ),
          ),
        clear: () => setCart([]),
        toast: setMessage,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
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
