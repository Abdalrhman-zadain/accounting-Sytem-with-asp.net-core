import {
  InventoryStockMovementType,
  Prisma,
  PrismaClient,
  RepCarLoadStatus,
  RepCarStockMovementType,
} from '../src/generated/prisma';

import { REP_AMER_CODE } from './seed-pos-market';

export const AMER_REP_LOAD_REF = 'RCL-AMER-OPENING-01';
export const WH_AMER_CODE = 'WH-AMER';

type RepCarLoadLineDraft = {
  itemId: string;
  code: string;
  unitOfMeasure: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  lineTotalAmount: Prisma.Decimal;
};

async function syncPostedAmerRepBalances(
  prisma: PrismaClient,
  salesRepId: string,
  lineDrafts: RepCarLoadLineDraft[],
) {
  for (const line of lineDrafts) {
    await prisma.repCarStockBalance.upsert({
      where: {
        salesRepId_itemId: { salesRepId, itemId: line.itemId },
      },
      create: {
        salesRepId,
        itemId: line.itemId,
        onHandQuantity: line.quantity,
        valuationAmount: line.lineTotalAmount,
      },
      update: {
        onHandQuantity: line.quantity,
        valuationAmount: line.lineTotalAmount,
      },
    });
  }
}

async function postAmerRepCarLoad(
  tx: Prisma.TransactionClient,
  options: {
    loadId: string;
    loadReference: string;
    loadDate: Date;
    warehouseId: string;
    salesRepId: string;
    lineDrafts: RepCarLoadLineDraft[];
    loadLines: Array<{ id: string }>;
  },
) {
  for (let index = 0; index < options.lineDrafts.length; index += 1) {
    const draft = options.lineDrafts[index];
    const loadLine = options.loadLines[index];
    if (!loadLine) {
      continue;
    }

    await tx.inventoryItem.update({
      where: { id: draft.itemId },
      data: {
        onHandQuantity: { decrement: draft.quantity },
        valuationAmount: { decrement: draft.lineTotalAmount },
      },
    });

    const warehouseBalance = await tx.inventoryWarehouseBalance.update({
      where: {
        itemId_warehouseId: {
          itemId: draft.itemId,
          warehouseId: options.warehouseId,
        },
      },
      data: {
        onHandQuantity: { decrement: draft.quantity },
        valuationAmount: { decrement: draft.lineTotalAmount },
      },
    });

    await tx.inventoryStockMovement.create({
      data: {
        movementType: InventoryStockMovementType.REP_CAR_LOAD,
        transactionType: 'RepCarLoad',
        transactionId: options.loadId,
        transactionLineId: loadLine.id,
        transactionReference: options.loadReference,
        transactionDate: options.loadDate,
        itemId: draft.itemId,
        warehouseId: options.warehouseId,
        quantityOut: draft.quantity,
        unitCost: draft.unitCost,
        valueOut: draft.lineTotalAmount,
        balanceId: warehouseBalance.id,
        runningQuantity: warehouseBalance.onHandQuantity,
        runningValuation: warehouseBalance.valuationAmount,
      },
    });

    await tx.repCarStockBalance.upsert({
      where: {
        salesRepId_itemId: {
          salesRepId: options.salesRepId,
          itemId: draft.itemId,
        },
      },
      create: {
        salesRepId: options.salesRepId,
        itemId: draft.itemId,
        onHandQuantity: draft.quantity,
        valuationAmount: draft.lineTotalAmount,
      },
      update: {
        onHandQuantity: { increment: draft.quantity },
        valuationAmount: { increment: draft.lineTotalAmount },
      },
    });

    const repBalance = await tx.repCarStockBalance.findUniqueOrThrow({
      where: {
        salesRepId_itemId: {
          salesRepId: options.salesRepId,
          itemId: draft.itemId,
        },
      },
      select: {
        onHandQuantity: true,
        valuationAmount: true,
      },
    });

    await tx.repCarStockMovement.create({
      data: {
        movementType: RepCarStockMovementType.LOAD_IN,
        transactionType: 'RepCarLoad',
        transactionId: options.loadId,
        transactionLineId: loadLine.id,
        transactionReference: options.loadReference,
        transactionDate: options.loadDate,
        salesRepId: options.salesRepId,
        itemId: draft.itemId,
        quantityIn: draft.quantity,
        unitCost: draft.unitCost,
        valueIn: draft.lineTotalAmount,
        runningQuantity: repBalance.onHandQuantity,
        runningValuation: repBalance.valuationAmount,
      },
    });
  }
}

export async function seedAmerRepCarLoad(prisma: PrismaClient) {
  const [warehouse, salesRep] = await Promise.all([
    prisma.inventoryWarehouse.findUniqueOrThrow({ where: { code: WH_AMER_CODE } }),
    prisma.salesRepresentative.findUniqueOrThrow({ where: { code: REP_AMER_CODE } }),
  ]);

  const balances = await prisma.inventoryWarehouseBalance.findMany({
    where: {
      warehouseId: warehouse.id,
      onHandQuantity: { gt: 0 },
    },
    include: {
      item: {
        select: {
          id: true,
          code: true,
          unitOfMeasure: true,
        },
      },
    },
    orderBy: { item: { code: 'asc' } },
  });

  if (balances.length === 0) {
    console.log('Amer rep car load: no positive stock in WH-AMER; skipped.');
    return { lineCount: 0, totalQuantity: new Prisma.Decimal(0) };
  }

  const lineDrafts: RepCarLoadLineDraft[] = balances.map((balance) => {
    const unitCost = balance.onHandQuantity.gt(0)
      ? balance.valuationAmount.div(balance.onHandQuantity)
      : new Prisma.Decimal(0);
    const lineTotalAmount = balance.valuationAmount;

    return {
      itemId: balance.item.id,
      code: balance.item.code,
      unitOfMeasure: balance.item.unitOfMeasure,
      quantity: balance.onHandQuantity,
      unitCost,
      lineTotalAmount,
    };
  });

  const existing = await prisma.repCarLoad.findUnique({
    where: { reference: AMER_REP_LOAD_REF },
    include: { lines: true },
  });

  if (existing?.status === RepCarLoadStatus.POSTED) {
    await syncPostedAmerRepBalances(prisma, salesRep.id, lineDrafts);
    console.log(
      `Amer rep car load ${AMER_REP_LOAD_REF} already posted — synced ${lineDrafts.length} rep car balances.`,
    );
    return {
      lineCount: lineDrafts.length,
      totalQuantity: lineDrafts.reduce(
        (sum, line) => sum.plus(line.quantity),
        new Prisma.Decimal(0),
      ),
    };
  }

  const loadDate = new Date('2026-05-31T12:00:00.000Z');
  const totalQuantity = lineDrafts.reduce(
    (sum, line) => sum.plus(line.quantity),
    new Prisma.Decimal(0),
  );
  const totalAmount = lineDrafts.reduce(
    (sum, line) => sum.plus(line.lineTotalAmount),
    new Prisma.Decimal(0),
  );

  await prisma.$transaction(async (tx) => {
    const load = await tx.repCarLoad.create({
      data: {
        reference: AMER_REP_LOAD_REF,
        status: RepCarLoadStatus.POSTED,
        loadDate,
        warehouseId: warehouse.id,
        salesRepId: salesRep.id,
        description:
          'Opening rep car load from Amer warehouse (مستودع عامر) seeded from opening inventory.',
        totalQuantity,
        totalAmount,
        postedAt: loadDate,
        lines: {
          create: lineDrafts.map((line, index) => ({
            lineNumber: index + 1,
            itemId: line.itemId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            unitOfMeasure: line.unitOfMeasure,
            lineTotalAmount: line.lineTotalAmount,
          })),
        },
      },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
    });

    await postAmerRepCarLoad(tx, {
      loadId: load.id,
      loadReference: load.reference,
      loadDate,
      warehouseId: warehouse.id,
      salesRepId: salesRep.id,
      lineDrafts,
      loadLines: load.lines,
    });
  });

  console.log(
    `Amer rep car load ${AMER_REP_LOAD_REF}: moved ${lineDrafts.length} products (${totalQuantity.toString()} units) from ${WH_AMER_CODE} to ${REP_AMER_CODE}.`,
  );

  return { lineCount: lineDrafts.length, totalQuantity };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedAmerRepCarLoad(prisma);
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
