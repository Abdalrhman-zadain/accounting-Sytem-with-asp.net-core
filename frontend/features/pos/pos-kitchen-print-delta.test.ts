import { describe, expect, it } from "vitest";

import {
  diffKitchenSnapshots,
  hasKitchenPrintDiff,
  isFirstKitchenSend,
  type KitchenLineSnapshot,
} from "@/features/pos/pos-kitchen-print-delta";

const sentAt = "2026-06-18T10:00:00.000Z";

function sentLine(
  overrides: Partial<KitchenLineSnapshot> & Pick<KitchenLineSnapshot, "lineId" | "name">,
): KitchenLineSnapshot {
  return {
    itemId: "item-1",
    qty: 1,
    kitchenSentAt: sentAt,
    modifiers: null,
    ...overrides,
  };
}

describe("diffKitchenSnapshots", () => {
  it("detects void when a sent line is removed", () => {
    const before = [sentLine({ lineId: "line-1", name: "Salad", qty: 1 })];
    const after: KitchenLineSnapshot[] = [];

    const diff = diffKitchenSnapshots(before, after);

    expect(diff.voids).toHaveLength(1);
    expect(diff.voids[0]).toMatchObject({ lineId: "line-1", name: "Salad", qty: 1 });
    expect(hasKitchenPrintDiff(diff)).toBe(true);
  });

  it("detects qty decrease on a sent line", () => {
    const before = [sentLine({ lineId: "line-1", name: "Burger", qty: 2 })];
    const after = [sentLine({ lineId: "line-1", name: "Burger", qty: 1 })];

    const diff = diffKitchenSnapshots(before, after);

    expect(diff.qtyDecreases).toHaveLength(1);
    expect(diff.qtyDecreases[0]).toMatchObject({ lineId: "line-1", qty: 1 });
    expect(hasKitchenPrintDiff(diff)).toBe(true);
  });

  it("detects addition when a line becomes kitchen-sent", () => {
    const before: KitchenLineSnapshot[] = [
      {
        lineId: "line-2",
        itemId: "item-2",
        name: "Falafel",
        qty: 1,
        kitchenSentAt: null,
        modifiers: null,
      },
    ];
    const after = [sentLine({ lineId: "line-2", name: "Falafel", qty: 1 })];

    const diff = diffKitchenSnapshots(before, after);

    expect(diff.additions).toHaveLength(1);
    expect(diff.additions[0]).toMatchObject({ lineId: "line-2", name: "Falafel", qty: 1 });
    expect(hasKitchenPrintDiff(diff)).toBe(true);
  });

  it("detects qty increase on a sent line", () => {
    const before = [sentLine({ lineId: "line-1", name: "Burger", qty: 1 })];
    const after = [sentLine({ lineId: "line-1", name: "Burger", qty: 3 })];

    const diff = diffKitchenSnapshots(before, after);

    expect(diff.additions).toHaveLength(1);
    expect(diff.additions[0]).toMatchObject({ lineId: "line-1", qty: 2 });
    expect(hasKitchenPrintDiff(diff)).toBe(true);
  });

  it("returns no diff when before was captured after the cart edit (regression)", () => {
    const before: KitchenLineSnapshot[] = [];
    const after: KitchenLineSnapshot[] = [];

    const diff = diffKitchenSnapshots(before, after);

    expect(hasKitchenPrintDiff(diff)).toBe(false);
  });

  it("returns no diff when server state is unchanged", () => {
    const lines = [sentLine({ lineId: "line-1", name: "Burger", qty: 2 })];
    const diff = diffKitchenSnapshots(lines, lines);

    expect(hasKitchenPrintDiff(diff)).toBe(false);
  });
});

describe("isFirstKitchenSend", () => {
  it("returns true when no line was previously sent", () => {
    expect(
      isFirstKitchenSend([
        {
          lineId: "line-1",
          itemId: "item-1",
          name: "Burger",
          qty: 1,
          kitchenSentAt: null,
          modifiers: null,
        },
      ]),
    ).toBe(true);
  });

  it("returns false when at least one line was already sent", () => {
    expect(isFirstKitchenSend([sentLine({ lineId: "line-1", name: "Burger", qty: 1 })])).toBe(
      false,
    );
  });
});
