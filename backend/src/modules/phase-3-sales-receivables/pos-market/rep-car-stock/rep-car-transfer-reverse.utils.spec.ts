import { Prisma, RepCarTransferStatus } from "../../../../generated/prisma";
import { evaluateRepTransferReverseEligibility } from "./rep-car-transfer-reverse.utils";

describe("evaluateRepTransferReverseEligibility", () => {
  const baseLine = {
    itemId: "item-1",
    quantity: new Prisma.Decimal(10),
    item: { code: "MKT-001" },
  };

  it("allows reverse when destination still holds full transferred qty", () => {
    const result = evaluateRepTransferReverseEligibility({
      status: RepCarTransferStatus.POSTED,
      postedAt: new Date("2026-01-01"),
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(10)]]),
      hasSalesAfterPost: false,
    });

    expect(result.canReverse).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("blocks reverse when destination sold after transfer", () => {
    const result = evaluateRepTransferReverseEligibility({
      status: RepCarTransferStatus.POSTED,
      postedAt: new Date("2026-01-01"),
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(10)]]),
      hasSalesAfterPost: true,
    });

    expect(result.canReverse).toBe(false);
    expect(result.hasSalesAfterPost).toBe(true);
  });

  it("blocks reverse when destination on-hand is short", () => {
    const result = evaluateRepTransferReverseEligibility({
      status: RepCarTransferStatus.POSTED,
      postedAt: new Date("2026-01-01"),
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(4)]]),
      hasSalesAfterPost: false,
    });

    expect(result.canReverse).toBe(false);
    expect(result.lines[0]?.shortfall).toBe(6);
  });

  it("blocks reverse for non-posted transfers", () => {
    const result = evaluateRepTransferReverseEligibility({
      status: RepCarTransferStatus.DRAFT,
      postedAt: null,
      lines: [baseLine],
      repBalances: new Map([["item-1", new Prisma.Decimal(10)]]),
      hasSalesAfterPost: false,
    });

    expect(result.canReverse).toBe(false);
  });
});
