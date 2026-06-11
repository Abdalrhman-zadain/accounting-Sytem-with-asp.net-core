import { Prisma, RepCarLoadStatus } from "../../../../generated/prisma";
import { evaluateRepLoadReverseEligibility } from "./rep-car-load-reverse.utils";

describe("evaluateRepLoadReverseEligibility", () => {
  const baseLine = {
    itemId: "item-1",
    quantity: new Prisma.Decimal(120),
    item: { code: "MKT-001" },
  };

  it("allows reverse when full quantity is still on the rep car and no sales occurred", () => {
    const result = evaluateRepLoadReverseEligibility({
      status: RepCarLoadStatus.POSTED,
      postedAt: new Date("2026-06-10T10:00:00.000Z"),
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(120)]]),
      hasSalesAfterPost: false,
    });

    expect(result.canReverse).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.lines[0]).toMatchObject({
      loadedQuantity: 120,
      repOnHand: 120,
      shortfall: 0,
    });
  });

  it("blocks reverse when the rep sold after the load was posted", () => {
    const result = evaluateRepLoadReverseEligibility({
      status: RepCarLoadStatus.POSTED,
      postedAt: new Date("2026-06-10T10:00:00.000Z"),
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(90)]]),
      hasSalesAfterPost: true,
    });

    expect(result.canReverse).toBe(false);
    expect(result.hasSalesAfterPost).toBe(true);
    expect(result.reasons.some((reason) => reason.includes("sold"))).toBe(true);
    expect(result.lines[0].shortfall).toBe(30);
  });

  it("blocks reverse when rep car balance is below the loaded quantity", () => {
    const result = evaluateRepLoadReverseEligibility({
      status: RepCarLoadStatus.POSTED,
      postedAt: new Date("2026-06-10T10:00:00.000Z"),
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(90)]]),
      hasSalesAfterPost: false,
    });

    expect(result.canReverse).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("MKT-001"))).toBe(true);
  });

  it("blocks reverse for non-posted loads", () => {
    const result = evaluateRepLoadReverseEligibility({
      status: RepCarLoadStatus.DRAFT,
      postedAt: null,
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(120)]]),
      hasSalesAfterPost: false,
    });

    expect(result.canReverse).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("posted"))).toBe(true);
  });
});
