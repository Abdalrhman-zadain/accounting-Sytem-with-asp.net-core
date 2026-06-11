import { PrismaClient } from '../src/generated/prisma';

import { SHOUQ_CODE_PREFIX } from './seed-shouq-catalog';

type ClearItemInventoryStockOptions = {
  codePrefix?: string;
};

export async function clearItemInventoryStock(
  prisma: PrismaClient,
  options: ClearItemInventoryStockOptions = {},
) {
  const codePrefix = options.codePrefix ?? SHOUQ_CODE_PREFIX;

  const items = await prisma.inventoryItem.findMany({
    where: { code: { startsWith: codePrefix } },
    select: { id: true, code: true },
  });

  if (items.length === 0) {
    console.log(`No items found with code prefix "${codePrefix}".`);
    return { clearedItemCount: 0 };
  }

  const itemIds = items.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.repCarStockMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.repCarStockBalance.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.repCarStocktakeLine.deleteMany({ where: { itemId: { in: itemIds } } });

    const repLoadLines = await tx.repCarLoadLine.findMany({
      where: { itemId: { in: itemIds } },
      select: { repCarLoadId: true },
    });
    const repLoadIds = [...new Set(repLoadLines.map((line) => line.repCarLoadId))];
    if (repLoadIds.length > 0) {
      await tx.inventoryStockMovement.deleteMany({ where: { transactionId: { in: repLoadIds } } });
      await tx.repCarLoadLine.deleteMany({ where: { itemId: { in: itemIds } } });
      await tx.repCarLoad.deleteMany({ where: { id: { in: repLoadIds } } });
    }

    const receiptLines = await tx.inventoryGoodsReceiptLine.findMany({
      where: { itemId: { in: itemIds } },
      select: { goodsReceiptId: true },
    });
    const receiptIds = [...new Set(receiptLines.map((line) => line.goodsReceiptId))];
    if (receiptIds.length > 0) {
      await tx.inventoryStockMovement.deleteMany({
        where: { transactionId: { in: receiptIds } },
      });
      await tx.inventoryGoodsReceiptLine.deleteMany({ where: { itemId: { in: itemIds } } });
      await tx.inventoryGoodsReceipt.deleteMany({ where: { id: { in: receiptIds } } });
    }

    const issueLines = await tx.inventoryGoodsIssueLine.findMany({
      where: { itemId: { in: itemIds } },
      select: { goodsIssueId: true },
    });
    const issueIds = [...new Set(issueLines.map((line) => line.goodsIssueId))];
    if (issueIds.length > 0) {
      await tx.inventoryStockMovement.deleteMany({
        where: { transactionId: { in: issueIds } },
      });
      await tx.inventoryGoodsIssueLine.deleteMany({ where: { itemId: { in: itemIds } } });
      await tx.inventoryGoodsIssue.deleteMany({ where: { id: { in: issueIds } } });
    }

    const transferLines = await tx.inventoryTransferLine.findMany({
      where: { itemId: { in: itemIds } },
      select: { transferId: true },
    });
    const transferIds = [...new Set(transferLines.map((line) => line.transferId))];
    if (transferIds.length > 0) {
      await tx.inventoryStockMovement.deleteMany({
        where: { transactionId: { in: transferIds } },
      });
      await tx.inventoryTransferLine.deleteMany({ where: { itemId: { in: itemIds } } });
      await tx.inventoryTransfer.deleteMany({ where: { id: { in: transferIds } } });
    }

    const adjustmentLines = await tx.inventoryAdjustmentLine.findMany({
      where: { itemId: { in: itemIds } },
      select: { adjustmentId: true },
    });
    const adjustmentIds = [...new Set(adjustmentLines.map((line) => line.adjustmentId))];
    if (adjustmentIds.length > 0) {
      await tx.inventoryStockMovement.deleteMany({
        where: { transactionId: { in: adjustmentIds } },
      });
      await tx.inventoryAdjustmentLine.deleteMany({ where: { itemId: { in: itemIds } } });
      await tx.inventoryAdjustment.deleteMany({ where: { id: { in: adjustmentIds } } });
    }

    await tx.inventoryStockMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryCostLayer.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryWarehouseBalance.deleteMany({ where: { itemId: { in: itemIds } } });
  });

  console.log(
    `Cleared inventory stock for ${items.length} items (${codePrefix}*). Item Master records were kept.`,
  );
  return { clearedItemCount: items.length };
}

async function main() {
  const codePrefix = process.argv[2] || SHOUQ_CODE_PREFIX;
  const prisma = new PrismaClient();
  try {
    await clearItemInventoryStock(prisma, { codePrefix });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
