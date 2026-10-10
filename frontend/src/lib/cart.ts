import { Offering, ProductVariant, FoodOption } from "./api";
export type CartItem = {
  offering: Offering;
  variant?: ProductVariant | null;
  foodOptions?: FoodOption[];
  quantity: number;
};
export function cartLineKey(
  item: Pick<CartItem, "offering" | "variant" | "foodOptions">,
) {
  return `${item.offering.id}:${item.variant?.id ?? "base"}:${(
    item.foodOptions || []
  )
    .map((option) => option.id)
    .sort((a, b) => a - b)
    .join(",")}`;
}
export function cartUnitPrice(item: CartItem) {
  return (
    Number(
      item.variant?.current_price ??
        item.offering.current_price ??
        item.variant?.price ??
        item.offering.price,
    ) +
    (item.foodOptions || []).reduce(
      (total, option) => total + Number(option.price),
      0,
    )
  );
}
