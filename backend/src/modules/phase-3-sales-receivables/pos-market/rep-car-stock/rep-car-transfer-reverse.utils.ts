import { Prisma, RepCarTransferStatus } from "../../../../generated/prisma";

export type RepTransferReverseLinePreview = {
  itemId: string;
  itemCode: string;
  transferredQuantity: number;
  repOnHand: number;
  shortfall: number;
};

export type RepTransferReversePreview = {
  canReverse: boolean;
  reasons: string[];
  hasSalesAfterPost: boolean;
  lines: RepTransferReverseLinePreview[];
};

type EvaluateInput = {
  status: RepCarTransferStatus;
  postedAt: Date | null;
  lines: Array<{
    itemId: string;
    quantity: Prisma.Decimal;
    item: { code: string };
  }>;
  repBalances: Map<string, Prisma.Decimal>;
  hasSalesAfterPost: boolean;
};

export function evaluateRepTransferReverseEligibility(
  input: EvaluateInput,
): RepTransferReversePreview {
  const reasons: string[] = [];
  const lines: RepTransferReverseLinePreview[] = input.lines.map((line) => {
    const transferredQuantity = Number(line.quantity.toString());
    const repOnHand = Number((input.repBalances.get(line.itemId) ?? new Prisma.Decimal(0)).toString());
    const shortfall = Math.max(0, transferredQuantity - repOnHand);
    return {
      itemId: line.itemId,
      itemCode: line.item.code,
      transferredQuantity,
      repOnHand,
      shortfall,
    };
  });

  if (input.status !== RepCarTransferStatus.POSTED) {
    reasons.push("Only posted rep car transfers can be reversed.");
  }

  if (!input.postedAt) {
    reasons.push("Rep car transfer has no posted timestamp.");
  }

  if (input.hasSalesAfterPost) {
    reasons.push("The destination rep already sold from the car after this transfer was posted.");
  }

  for (const line of lines) {
    if (line.shortfall > 0) {
      reasons.push(
        `${line.itemCode}: only ${line.repOnHand} still on the destination car, but ${line.transferredQuantity} were transferred.`,
      );
    }
  }

  return {
    canReverse: reasons.length === 0,
    reasons,
    hasSalesAfterPost: input.hasSalesAfterPost,
    lines,
  };
}
