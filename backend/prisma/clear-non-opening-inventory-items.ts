import { PrismaClient } from '../src/generated/prisma';

/** Keep only items imported by seed-opening-inventory (numeric codes like 1, 2, 76). */
const OPENING_ITEM_CODE_PATTERN = /^[0-9]+$/;

export async function clearNonOpeningInventoryItems(prisma: PrismaClient) {
  const items = await prisma.inventoryItem.findMany({
    select: { id: true, code: true },
  });

  const nonOpeningItems = items.filter((item) => !OPENING_ITEM_CODE_PATTERN.test(item.code));

  if (nonOpeningItems.length === 0) {
    console.log('No non-opening inventory items to remove.');
    return { removedCount: 0, deactivatedCount: 0 };
  }

  const itemIds = nonOpeningItems.map((item) => item.id);

  const blockedByHistory = await prisma.inventoryItem.findMany({
    where: {
      id: { in: itemIds },
      OR: [
        { salesInvoiceLines: { some: {} } },
        { posReturnLines: { some: {} } },
        { salesQuotationLines: { some: {} } },
        { salesOrderLines: { some: {} } },
        { creditNoteLines: { some: {} } },
        { purchaseRequestLines: { some: {} } },
        { purchaseOrderLines: { some: {} } },
        { purchaseInvoiceLines: { some: {} } },
        { goodsReceiptLines: { some: {} } },
        { goodsIssueLines: { some: {} } },
        { transferLines: { some: {} } },
        { adjustmentLines: { some: {} } },
      ],
    },
    select: { id: true, code: true },
  });

  const blockedIds = new Set(blockedByHistory.map((item) => item.id));
  const deletableIds = itemIds.filter((id) => !blockedIds.has(id));

  await prisma.$transaction(async (tx) => {
    const clearStockFor = async (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }

      await tx.repCarStockMovement.deleteMany({ where: { itemId: { in: ids } } });
      await tx.repCarStockBalance.deleteMany({ where: { itemId: { in: ids } } });
      await tx.repCarStocktakeLine.deleteMany({ where: { itemId: { in: ids } } });

      const repLoadLines = await tx.repCarLoadLine.findMany({
        where: { itemId: { in: ids } },
        select: { repCarLoadId: true },
      });
      const repLoadIds = [...new Set(repLoadLines.map((line) => line.repCarLoadId))];
      if (repLoadIds.length > 0) {
        await tx.inventoryStockMovement.deleteMany({
          where: { transactionId: { in: repLoadIds } },
        });
        await tx.repCarLoadLine.deleteMany({ where: { itemId: { in: ids } } });
        await tx.repCarLoad.deleteMany({ where: { id: { in: repLoadIds } } });
      }

      await tx.inventoryStockMovement.deleteMany({ where: { itemId: { in: ids } } });
      await tx.inventoryWarehouseBalance.deleteMany({ where: { itemId: { in: ids } } });
      await tx.inventoryCostLayer.deleteMany({ where: { itemId: { in: ids } } });
      await tx.posUserFavoriteItem.deleteMany({ where: { itemId: { in: ids } } });
      await tx.inventoryItemUnitConversion.deleteMany({
        where: { inventoryItemId: { in: ids } },
      });
    };

    await clearStockFor(itemIds);

    if (deletableIds.length > 0) {
      await tx.inventoryItem.deleteMany({ where: { id: { in: deletableIds } } });
    }

    if (blockedIds.size > 0) {
      await tx.inventoryItem.updateMany({
        where: { id: { in: [...blockedIds] } },
        data: {
          isActive: false,
          onHandQuantity: 0,
          valuationAmount: 0,
        },
      });
    }
  });

  console.log(
    `Non-opening inventory cleanup: removed ${deletableIds.length}, deactivated ${blockedIds.size} (kept for history).`,
  );
  if (blockedByHistory.length > 0) {
    console.log(
      `Deactivated (history): ${blockedByHistory.map((item) => item.code).join(', ')}`,
    );
  }

  return {
    removedCount: deletableIds.length,
    deactivatedCount: blockedIds.size,
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await clearNonOpeningInventoryItems(prisma);
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
