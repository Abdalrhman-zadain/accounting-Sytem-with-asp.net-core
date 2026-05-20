import type { InventoryItem } from "@/types/api";

/** Fixed POS register category filters (see product spec). */
export const POS_CATALOG_CHIPS = ["all", "drinks", "food", "services", "offers", "favorites"] as const;

export type PosCatalogChip = (typeof POS_CATALOG_CHIPS)[number];

export function isPosCatalogChip(value: string): value is PosCatalogChip {
  return (POS_CATALOG_CHIPS as readonly string[]).includes(value);
}

export function normalizeResumeCategory(value: string): PosCatalogChip {
  return isPosCatalogChip(value) ? value : "all";
}

/** Category label used for display and legacy dynamic chips. */
export function getPosItemShelfCategory(item: InventoryItem): string {
  return (
    item.itemCategory?.name ||
    item.itemGroup?.name ||
    item.category ||
    (item.trackInventory ? "Inventory" : "Services")
  );
}

export function catalogItemMatchesChip(
  item: InventoryItem,
  chip: PosCatalogChip,
  favoriteIds: Set<string>,
): boolean {
  if (chip === "all") {
    return true;
  }
  if (chip === "favorites") {
    return favoriteIds.has(item.id);
  }
  if (chip === "offers") {
    const hay = `${item.description ?? ""} ${item.category ?? ""} ${item.itemGroup?.name ?? ""} ${item.itemCategory?.name ?? ""} ${item.code ?? ""}`.toLowerCase();
    return (
      hay.includes("offer") ||
      hay.includes("promo") ||
      hay.includes("خصم") ||
      item.code?.toUpperCase().startsWith("OFFER")
    );
  }
  const cat = getPosItemShelfCategory(item).toLowerCase();
  if (chip === "services") {
    return !item.trackInventory || cat.includes("service") || cat.includes("خدمة");
  }
  if (chip === "drinks") {
    return cat.includes("drink") || cat.includes("beverage") || cat.includes("مشروب");
  }
  if (chip === "food") {
    return cat.includes("food") || cat.includes("meal") || cat.includes("طعام");
  }
  return false;
}
