import { PrismaClient } from '../src/generated/prisma';

import { SHOUQ_CODE_PREFIX } from './seed-shouq-catalog';

const MARKET_DEMO_CODE_PREFIX = 'MKT-DEMO-';

export async function clearLegacyMarketDemoProducts(prisma: PrismaClient) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      code: { startsWith: 'MKT-' },
      NOT: {
        OR: [
          { code: { startsWith: SHOUQ_CODE_PREFIX } },
          { code: { startsWith: MARKET_DEMO_CODE_PREFIX } },
        ],
      },
    },
    select: { id: true, code: true },
  });

  if (items.length === 0) {
    console.log('No legacy market demo products to remove.');
    return { removedCount: 0 };
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

    await tx.inventoryStockMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryWarehouseBalance.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryCostLayer.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.posUserFavoriteItem.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryItemUnitConversion.deleteMany({ where: { inventoryItemId: { in: itemIds } } });
    await tx.inventoryItem.deleteMany({ where: { id: { in: itemIds } } });
  });

  console.log(
    `Removed ${items.length} legacy market demo products: ${items.map((item) => item.code).join(', ')}`,
  );
  return { removedCount: items.length };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await clearLegacyMarketDemoProducts(prisma);
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
