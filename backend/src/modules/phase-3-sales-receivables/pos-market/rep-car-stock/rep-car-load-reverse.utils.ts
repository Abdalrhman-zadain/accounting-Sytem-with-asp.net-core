import { Prisma, RepCarLoadStatus } from "../../../../generated/prisma";

export type RepLoadReverseLinePreview = {
  itemId: string;
  itemCode: string;
  loadedQuantity: number;
  repOnHand: number;
  shortfall: number;
};

export type RepLoadReversePreview = {
  canReverse: boolean;
  reasons: string[];
  hasSalesAfterPost: boolean;
  lines: RepLoadReverseLinePreview[];
};

type EvaluateInput = {
  status: RepCarLoadStatus;
  postedAt: Date | null;
  lines: Array<{
    itemId: string;
    quantity: Prisma.Decimal;
    item: { code: string };
  }>;
  repBalances: Map<string, Prisma.Decimal>;
  hasSalesAfterPost: boolean;
};

export function evaluateRepLoadReverseEligibility(input: EvaluateInput): RepLoadReversePreview {
  const reasons: string[] = [];
  const lines: RepLoadReverseLinePreview[] = input.lines.map((line) => {
    const loadedQuantity = Number(line.quantity.toString());
    const repOnHand = Number((input.repBalances.get(line.itemId) ?? new Prisma.Decimal(0)).toString());
    const shortfall = Math.max(0, loadedQuantity - repOnHand);
    return {
      itemId: line.itemId,
      itemCode: line.item.code,
      loadedQuantity,
      repOnHand,
      shortfall,
    };
  });

  if (input.status !== RepCarLoadStatus.POSTED) {
    reasons.push("Only posted rep car loads can be reversed.");
  }

  if (!input.postedAt) {
    reasons.push("Rep car load has no posted timestamp.");
  }

  if (input.hasSalesAfterPost) {
    reasons.push("The sales rep already sold from the car after this load was posted.");
  }

  for (const line of lines) {
    if (line.shortfall > 0) {
      reasons.push(
        `${line.itemCode}: only ${line.repOnHand} still on the car, but ${line.loadedQuantity} were loaded.`,
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
