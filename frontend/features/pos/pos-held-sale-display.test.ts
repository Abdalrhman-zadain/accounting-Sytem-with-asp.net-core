import { describe, expect, it, vi } from "vitest";
import {
  buildHeldSaleHeadline,
  buildHeldSaleIdentityStrip,
  buildHeldSaleMetaSummary,
  formatHeldSaleRelativeTime,
  resolveHeldSaleOrderNumber,
  resolveHeldSaleTableNumber,
  type PosHeldSaleDisplay,
} from "@/features/pos/pos-held-sale-display";

function buildSale(overrides: Partial<PosHeldSaleDisplay> = {}): PosHeldSaleDisplay {
  return {
    title: "POS-20260620-0042",
    createdAt: "2026-06-20T12:00:00.000Z",
    orderType: "TAKEAWAY",
    cartLines: [{ itemId: "1", name: "Item" }],
    totalAmount: 25.5,
    ...overrides,
  };
}

describe("resolveHeldSaleOrderNumber", () => {
  it("extracts daily sequence from POS reference", () => {
    expect(resolveHeldSaleOrderNumber("POS-20260620-0042")).toBe("42");
    expect(resolveHeldSaleOrderNumber("POS-20260620-1042")).toBe("1042");
  });
});

describe("resolveHeldSaleTableNumber", () => {
  it("falls back to sale.tableNumber when heldContext is missing", () => {
    expect(
      resolveHeldSaleTableNumber(
        buildSale({
          orderType: "DINE_IN",
          tableNumber: "12",
          heldContext: null,
        }),
      ),
    ).toBe("12");
  });

  it("prefers heldContext.tableNumber", () => {
    expect(
      resolveHeldSaleTableNumber(
        buildSale({
          orderType: "DINE_IN",
          tableNumber: "5",
          heldContext: { source: "TABLE_ORDER", tableNumber: "12" },
        }),
      ),
    ).toBe("12");
  });
});

describe("buildHeldSaleHeadline", () => {
  it("builds dine-in headline with table", () => {
    expect(
      buildHeldSaleHeadline(
        buildSale({ orderType: "DINE_IN", tableNumber: "12" }),
        "ar",
      ),
    ).toBe("طاولة 12 · صالة");
  });

  it("builds takeaway headline with order number and customer", () => {
    expect(
      buildHeldSaleHeadline(
        buildSale({ customerName: "أحمد" }),
        "ar",
      ),
    ).toBe("سفري · طلب #42 · أحمد");
  });

  it("builds delivery headline from driver", () => {
    expect(
      buildHeldSaleHeadline(
        buildSale({
          orderType: "DELIVERY",
          driverName: "خالد",
        }),
        "ar",
      ),
    ).toBe("توصيل · خالد");
  });
});

describe("buildHeldSaleIdentityStrip", () => {
  it("includes table and waiter for dine-in", () => {
    expect(
      buildHeldSaleIdentityStrip(
        buildSale({
          orderType: "DINE_IN",
          tableNumber: "7",
          waiterName: "سامي",
        }),
        "ar",
      ),
    ).toBe("صالة · طاولة 7 · نادل: سامي");
  });
});

describe("formatHeldSaleRelativeTime", () => {
  it("formats minutes ago in Arabic", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:12:00.000Z"));
    const result = formatHeldSaleRelativeTime("2026-06-20T12:00:00.000Z", "ar");
    expect(result).toMatch(/12|١٢/);
    vi.useRealTimers();
  });
});

describe("buildHeldSaleMetaSummary", () => {
  it("joins order number, items, total, and time", () => {
    const summary = buildHeldSaleMetaSummary(
      buildSale({ cartLines: [{ itemId: "1", name: "A" }, { itemId: "2", name: "B" }] }),
      "ar",
      "25.50 د.أ",
      "منذ 12 دقيقة",
    );
    expect(summary).toContain("طلب #42");
    expect(summary).toContain("2 أصناف");
    expect(summary).toContain("25.50 د.أ");
    expect(summary).toContain("منذ 12 دقيقة");
  });
});
