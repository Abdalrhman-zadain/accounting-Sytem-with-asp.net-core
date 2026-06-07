import type { InventoryItem } from "@/types/api";

export function normalizeResumeCategory(value: string): string {
  return value || "all";
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
