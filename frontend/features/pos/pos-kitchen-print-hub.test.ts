import { describe, expect, it } from "vitest";

import {
  collectKitchenOrderItemIds,
  findUnprintedKitchenItems,
  kitchenItemsToDeltaLines,
  kitchenOrderToSaleStub,
  primePrintedKitchenItemIds,
} from "@/features/pos/pos-kitchen-print-hub";
import type { KitchenOrder } from "@/types/api";

function makeOrder(
  id: string,
  items: Array<{ id: string; salesInvoiceLineId?: string; itemName?: string }>,
): KitchenOrder {
  return {
    id,
    orderNumber: `KOT-${id}`,
    salesInvoiceId: `sale-${id}`,
    tableId: "table-1",
    tableName: "12",
    waiterId: "waiter-1",
    waiterName: "Ali",
    orderType: "DINE_IN",
    status: "NEW",
    waiterStatus: "WAITING",
    hasUpdateNotification: false,
    createdAt: "2026-06-17T10:00:00.000Z",
    updatedAt: "2026-06-17T10:00:00.000Z",
    items: items.map((item, index) => ({
      id: item.id,
      kitchenOrderId: id,
      salesInvoiceLineId: item.salesInvoiceLineId ?? `line-${item.id}`,
      itemId: `item-${index + 1}`,
      itemName: item.itemName ?? `Item ${index + 1}`,
      quantity: "1",
      status: "NEW",
      createdAt: "2026-06-17T10:00:00.000Z",
    })),
  };
}

describe("pos-kitchen-print-hub helpers", () => {
  it("collects all kitchen order item ids", () => {
    const orders = [
      makeOrder("o1", [{ id: "i1" }, { id: "i2" }]),
      makeOrder("o2", [{ id: "i3" }]),
    ];

    expect(collectKitchenOrderItemIds(orders)).toEqual(["i1", "i2", "i3"]);
  });

  it("returns no printable groups when all items are already known", () => {
    const orders = [makeOrder("o1", [{ id: "i1" }, { id: "i2" }])];
    const known = new Set(["i1", "i2"]);

    expect(findUnprintedKitchenItems(known, orders)).toEqual([]);
  });

  it("detects only new kitchen order items after priming", () => {
    const orders = [makeOrder("o1", [{ id: "i1" }, { id: "i2" }])];
    const known = new Set(["i1"]);

    expect(findUnprintedKitchenItems(known, orders)).toEqual([
      {
        order: orders[0],
        items: [orders[0].items[1]],
      },
    ]);
  });

  it("groups multiple new items from the same order together", () => {
    const orders = [makeOrder("o1", [{ id: "i1" }, { id: "i2" }])];

    expect(findUnprintedKitchenItems(new Set(), orders)).toEqual([
      {
        order: orders[0],
        items: orders[0].items,
      },
    ]);
  });

  it("builds a sale stub and delta lines for printing", () => {
    const order = makeOrder("o1", [{ id: "i1", itemName: "Falafel" }]);

    const saleStub = kitchenOrderToSaleStub(order);
    const deltaLines = kitchenItemsToDeltaLines(order.items);

    expect(saleStub.reference).toBe("KOT-o1");
    expect(saleStub.table).toEqual({ tableNumber: "12" });
    expect(saleStub.waiter).toEqual({ name: "Ali" });
    expect(deltaLines).toEqual([
      {
        lineId: "line-i1",
        itemId: "item-1",
        name: "Falafel",
        qty: 1,
        modifiers: null,
        lineNote: undefined,
      },
    ]);
  });

  it("treats marked ids as printed and skips them on the next detection pass", () => {
    const orders = [makeOrder("o1", [{ id: "i1" }, { id: "i2" }])];
    const known = new Set<string>();

    const firstPass = findUnprintedKitchenItems(known, orders);
    for (const group of firstPass) {
      for (const item of group.items) {
        known.add(item.id);
      }
    }

    expect(findUnprintedKitchenItems(known, orders)).toEqual([]);
  });

  it("primes only kitchen items older than the recent window", () => {
    const now = new Date("2026-06-17T12:00:00.000Z").getTime();
    const orders = [
      makeOrder("o1", [
        { id: "old", itemName: "Old item" },
        { id: "new", itemName: "New item" },
      ]),
    ];
    orders[0].items[0].createdAt = "2026-06-17T11:00:00.000Z";
    orders[0].items[1].createdAt = "2026-06-17T11:58:00.000Z";

    const known = new Set<string>();
    primePrintedKitchenItemIds(orders, known, now);

    expect([...known]).toEqual(["old"]);
    expect(findUnprintedKitchenItems(known, orders)).toEqual([
      {
        order: orders[0],
        items: [orders[0].items[1]],
      },
    ]);
  });
});
