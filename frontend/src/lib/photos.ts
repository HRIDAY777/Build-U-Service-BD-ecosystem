import { Offering } from "./api";

export const divisionPhotos: Record<string, string> = {
  food: "/images/photos/food.jpg",
  pharmacy: "/images/photos/pharmacy.jpg",
  shop: "/images/photos/shop.jpg",
  electrician: "/images/photos/electrician.jpg",
  mechanic: "/images/photos/mechanic.jpg",
  services: "/images/photos/services.jpg",
  delivery: "/images/photos/delivery-branded.png",
};

export function offeringPhoto(item: Offering) {
  if (item.image) return item.image;
  if (!item.sku?.startsWith("DEMO-")) return "";
  const specific: Record<string, string> = {
    "steel-water-bottle": "/images/photos/bottle.jpg",
    "ac-cleaning": "/images/photos/aircon.jpg",
    "ceiling-fan-service": "/images/photos/fan.jpg",
    "vegetable-lunch": "/images/photos/vegetable.jpg",
  };
  if (item.slug === "prescription-workflow-demo") return "";
  return specific[item.slug] || divisionPhotos[item.division_slug] || "";
}
