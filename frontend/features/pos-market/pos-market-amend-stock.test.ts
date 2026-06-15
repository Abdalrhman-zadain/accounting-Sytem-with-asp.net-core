import { describe, expect, it } from "vitest";

import {
  applyAmendEffectiveStockToCartLines,
  applyAmendEffectiveStockToCatalogItems,
  buildAmendReleasedQtyByItemIdRecord,
  getAmendEffectiveOnHand,
  type PosMarketCartLine,
} from "@/features/pos-market/pos-market-cart-utils";
import type { InventoryItem } from "@/types/api";

function cartLine(itemId: string, quantity: number): PosMarketCartLine {
  return {
    itemId,
    name: "Demo",
    code: "MKT-DEMO-01",
    unit: "PCS",
    itemType: "FINISHED_GOOD",
    quantity,
    unitPrice: 1,
    discountType: "FIXED",
    discountValue: 0,
    taxRate: 0,
    trackInventory: true,
    unitCost: 0.5,
    onHandQuantity: 0,
  };
}

function catalogItem(id: string, onHand: number): InventoryItem {
  return {
    id,
    code: "MKT-DEMO-01",
    name: "Demo",
    unitOfMeasure: "PCS",
    type: "FINISHED_GOOD",
    defaultSalesPrice: "1.00",
    defaultPurchasePrice: "0.50",
    taxable: false,
    trackInventory: true,
    reorderLevel: "0.00",
    reorderQuantity: "0.00",
    onHandQuantity: onHand.toFixed(4),
    valuationAmount: "0.00",
    isActive: true,
    status: "ACTIVE",
    unitConversions: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

describe("market amend effective stock", () => {
  it("adds original invoice qty to catalog on-hand during amend", () => {
    const released = buildAmendReleasedQtyByItemIdRecord([cartLine("item-1", 5)]);
    expect(getAmendEffectiveOnHand(5, "item-1", released)).toBe(10);
    expect(getAmendEffectiveOnHand(5, "item-2", released)).toBe(5);
  });

  it("applies effective stock to catalog and cart lines", () => {
    const released = buildAmendReleasedQtyByItemIdRecord([cartLine("item-1", 5)]);
    const rawCatalog = [catalogItem("item-1", 5)];
    const catalog = applyAmendEffectiveStockToCatalogItems(rawCatalog, released);
    expect(catalog[0]?.onHandQuantity).toBe("10.0000");

    const lines = applyAmendEffectiveStockToCartLines([cartLine("item-1", 5)], rawCatalog, released);
    expect(lines[0]?.onHandQuantity).toBe(10);
  });
});
