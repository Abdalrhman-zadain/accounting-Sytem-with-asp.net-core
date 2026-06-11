import { PrismaClient } from '../src/generated/prisma';

import { SHOUQ_CODE_PREFIX } from './seed-shouq-catalog';

export async function clearShouqCatalog(prisma: PrismaClient) {
  const items = await prisma.inventoryItem.findMany({
    where: { code: { startsWith: SHOUQ_CODE_PREFIX } },
    select: { id: true, code: true },
  });

  if (items.length === 0) {
    console.log('No Shouq catalog products to remove.');
    return { removedCount: 0 };
  }

  const itemIds = items.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.repCarStockMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.repCarStockBalance.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.repCarStocktakeLine.deleteMany({ where: { itemId: { in: itemIds } } });

    const demoLoad = await tx.repCarLoad.findUnique({
      where: { reference: 'RCL-DEMO-01' },
      select: { id: true },
    });
    if (demoLoad) {
      await tx.inventoryStockMovement.deleteMany({ where: { transactionId: demoLoad.id } });
      await tx.repCarLoadLine.deleteMany({ where: { repCarLoadId: demoLoad.id } });
      await tx.repCarLoad.delete({ where: { id: demoLoad.id } });
    }

    await tx.inventoryStockMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryWarehouseBalance.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryCostLayer.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.posUserFavoriteItem.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.inventoryItemUnitConversion.deleteMany({ where: { inventoryItemId: { in: itemIds } } });
    await tx.inventoryItem.deleteMany({ where: { id: { in: itemIds } } });
  });

  console.log(`Removed ${items.length} Shouq catalog products (${SHOUQ_CODE_PREFIX}*).`);
  return { removedCount: items.length };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await clearShouqCatalog(prisma);
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
