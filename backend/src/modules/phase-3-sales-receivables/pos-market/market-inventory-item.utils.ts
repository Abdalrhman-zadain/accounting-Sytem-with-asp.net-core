type MarketInventoryItemLike = {
  code: string;
  trackInventory?: boolean;
  itemGroup?: { code?: string | null } | null;
};

/** Opening stock import uses numeric ERP codes (1, 2, 54); legacy demos use MKT-*. */
export function isMarketInventoryItem(item: MarketInventoryItemLike) {
  if (item.code.startsWith("MENU-")) {
    return false;
  }

  return (
    /^[0-9]+$/.test(item.code) ||
    item.code.startsWith("MKT-") ||
    item.itemGroup?.code?.startsWith("MARKET-") ||
    item.itemGroup?.code?.startsWith("MKT-")
  );
}
