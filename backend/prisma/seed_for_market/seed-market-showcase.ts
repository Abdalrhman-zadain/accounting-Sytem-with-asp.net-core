import {
  InventoryItemType,
  InventoryStockMovementType,
  Prisma,
  PrismaClient,
  RepCarLoadStatus,
  RepCarStockMovementType,
} from '../../src/generated/prisma';

import { postOpeningInventoryToGl } from './seed-shouq-catalog';
import { ensureMarketSnackFoundation } from './seed-pos-market';
import { seedMarketPosRuntimeSettings } from './seed-market-pos-settings';
import { setupPosMarketCashierUser } from './setup-pos-market-cashier';

export const MARKET_DEMO_CODE_PREFIX = 'MKT-DEMO-';
export const MARKET_DEMO_OPENING_INVENTORY_JE_REF = 'JE-MKT-DEMO-OPENING-INV';
const SHOWCASE_REP_LOAD_REF = 'RCL-SHOWCASE-01';

type ShowcaseProduct = {
  code: string;
  name: string;
  unitCode: string;
  warehouseQty: number;
  purchasePrice: number;
  salesPrice: number;
  repCarQty: number;
};

/** Round-number demo products for warehouse + market POS register demos. */
const SHOWCASE_PRODUCTS: ShowcaseProduct[] = [
  {
    code: 'MKT-DEMO-01',
    name: 'شوكولاتة بالحليب — عرض',
    unitCode: 'PCS',
    warehouseQty: 500,
    purchasePrice: 0.85,
    salesPrice: 1.25,
    repCarQty: 80,
  },
  {
    code: 'MKT-DEMO-02',
    name: 'بسكويت محشي — عرض',
    unitCode: 'PCS',
    warehouseQty: 400,
    purchasePrice: 0.6,
    salesPrice: 0.95,
    repCarQty: 60,
  },
  {
    code: 'MKT-DEMO-03',
    name: 'كيك شوكولا — عرض',
    unitCode: 'PCS',
    warehouseQty: 200,
    purchasePrice: 1.2,
    salesPrice: 1.8,
    repCarQty: 40,
  },
  {
    code: 'MKT-DEMO-04',
    name: 'حلاوة طحينية — عرض',
    unitCode: 'KG',
    warehouseQty: 150,
    purchasePrice: 3.5,
    salesPrice: 5.0,
    repCarQty: 25,
  },
  {
    code: 'MKT-DEMO-05',
    name: 'مكسرات مشكلة — عرض',
    unitCode: 'KG',
    warehouseQty: 100,
    purchasePrice: 8.0,
    salesPrice: 12.0,
    repCarQty: 15,
  },
  {
    code: 'MKT-DEMO-06',
    name: 'عصير برتقال — عرض',
    unitCode: 'PCS',
    warehouseQty: 300,
    purchasePrice: 0.45,
    salesPrice: 0.75,
    repCarQty: 50,
  },
  {
    code: 'MKT-DEMO-07',
    name: 'رقائق بطاطا — عرض',
    unitCode: 'PCS',
    warehouseQty: 600,
    purchasePrice: 0.35,
    salesPrice: 0.55,
    repCarQty: 100,
  },
  {
    code: 'MKT-DEMO-08',
    name: 'علكة نعناع — عرض',
    unitCode: 'PCS',
    warehouseQty: 800,
    purchasePrice: 0.15,
    salesPrice: 0.25,
    repCarQty: 120,
  },
];

export async function seedMarketShowcase(
  prisma: PrismaClient,
  options: { adminUserId: string },
) {
  console.log('Seeding market showcase demo (MKT-DEMO-* products with warehouse + rep car stock)...');

  await ensureMarketSnackFoundation(prisma);

  const snackGroup = await prisma.inventoryItemGroup.findUniqueOrThrow({
    where: { code: 'MARKET-SNACKS' },
    select: { id: true },
  });

  const [
    inventoryAccount,
    salesAccount,
    cogsAccount,
    vat16,
    mainWarehouse,
    snackCategory,
    units,
    marketRepNorth,
  ] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '1131001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '4110001' } }),
    prisma.account.findFirstOrThrow({
      where: {
        code: '5130001',
        isActive: true,
        isPosting: true,
      },
    }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT16' } }),
    prisma.inventoryWarehouse.findUniqueOrThrow({ where: { code: 'WH-MAIN' } }),
    prisma.inventoryItemCategory.findUniqueOrThrow({ where: { code: 'MARKET-SNACKS' } }),
    prisma.inventoryUnitOfMeasure.findMany(),
    prisma.salesRepresentative.findUniqueOrThrow({ where: { code: 'REP-AMER' } }),
  ]);

  const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
  const getUnit = (code: string) => unitByCode.get(code) ?? unitByCode.get('PCS')!;

  const seededItems: Array<{
    id: string;
    code: string;
    unitOfMeasure: string;
    warehouseQty: number;
    repCarQty: number;
    unitCost: number;
  }> = [];

  for (const product of SHOWCASE_PRODUCTS) {
    const unit = getUnit(product.unitCode);
    const sellByWeight = product.unitCode === 'KG';
    const unitCost = product.purchasePrice;
    const totalValue = product.warehouseQty * unitCost;

    const item = await prisma.inventoryItem.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        category: snackCategory.name,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: snackGroup.id,
        itemCategoryId: snackCategory.id,
        type: InventoryItemType.FINISHED_GOOD,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(unitCost),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory: true,
        reorderLevel: new Prisma.Decimal(0),
        reorderQuantity: new Prisma.Decimal(0),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: new Prisma.Decimal(product.warehouseQty),
        valuationAmount: new Prisma.Decimal(totalValue),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(sellByWeight ? 0.001 : 1),
      },
      create: {
        code: product.code,
        name: product.name,
        category: snackCategory.name,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: snackGroup.id,
        itemCategoryId: snackCategory.id,
        type: InventoryItemType.FINISHED_GOOD,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(unitCost),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory: true,
        reorderLevel: new Prisma.Decimal(0),
        reorderQuantity: new Prisma.Decimal(0),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: new Prisma.Decimal(product.warehouseQty),
        valuationAmount: new Prisma.Decimal(totalValue),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(sellByWeight ? 0.001 : 1),
      },
    });

    await prisma.inventoryWarehouseBalance.upsert({
      where: {
        itemId_warehouseId: {
          itemId: item.id,
          warehouseId: mainWarehouse.id,
        },
      },
      update: {
        onHandQuantity: new Prisma.Decimal(product.warehouseQty),
        valuationAmount: new Prisma.Decimal(totalValue),
      },
      create: {
        itemId: item.id,
        warehouseId: mainWarehouse.id,
        onHandQuantity: new Prisma.Decimal(product.warehouseQty),
        valuationAmount: new Prisma.Decimal(totalValue),
      },
    });

    seededItems.push({
      id: item.id,
      code: item.code,
      unitOfMeasure: item.unitOfMeasure,
      warehouseQty: product.warehouseQty,
      repCarQty: product.repCarQty,
      unitCost,
    });
  }

  await seedShowcaseRepCarLoad(prisma, {
    salesRepId: marketRepNorth.id,
    warehouseId: mainWarehouse.id,
    items: seededItems,
  });

  await postOpeningInventoryToGl(prisma, options.adminUserId, inventoryAccount.id, {
    codePrefix: MARKET_DEMO_CODE_PREFIX,
    journalRef: MARKET_DEMO_OPENING_INVENTORY_JE_REF,
    label: 'Market showcase demo',
  });

  const totalWarehouseQty = SHOWCASE_PRODUCTS.reduce((sum, row) => sum + row.warehouseQty, 0);
  const totalRepCarQty = SHOWCASE_PRODUCTS.reduce((sum, row) => sum + row.repCarQty, 0);

  console.log(
    `Market showcase ready: ${SHOWCASE_PRODUCTS.length} products (${MARKET_DEMO_CODE_PREFIX}*), ${totalWarehouseQty} units in WH-MAIN, ${totalRepCarQty} units on REP-AMER car.`,
  );
  await seedMarketPosRuntimeSettings(prisma);
  printShowcaseGuide();
}

async function seedShowcaseRepCarLoad(
  prisma: PrismaClient,
  options: {
    salesRepId: string;
    warehouseId: string;
    items: Array<{
      id: string;
      code: string;
      unitOfMeasure: string;
      warehouseQty: number;
      repCarQty: number;
      unitCost: number;
    }>;
  },
) {
  const repLines = options.items.filter((item) => item.repCarQty > 0);
  if (repLines.length === 0) {
    return;
  }

  const existing = await prisma.repCarLoad.findUnique({
    where: { reference: SHOWCASE_REP_LOAD_REF },
    include: { lines: true },
  });

  if (existing?.status === RepCarLoadStatus.POSTED) {
    for (const line of repLines) {
      const lineTotal = line.unitCost * line.repCarQty;
      await prisma.repCarStockBalance.upsert({
        where: {
          salesRepId_itemId: { salesRepId: options.salesRepId, itemId: line.id },
        },
        create: {
          salesRepId: options.salesRepId,
          itemId: line.id,
          onHandQuantity: new Prisma.Decimal(line.repCarQty),
          valuationAmount: new Prisma.Decimal(lineTotal),
        },
        update: {
          onHandQuantity: new Prisma.Decimal(line.repCarQty),
          valuationAmount: new Prisma.Decimal(lineTotal),
        },
      });
    }
    console.log(
      `Showcase rep car load ${SHOWCASE_REP_LOAD_REF} already posted — synced ${repLines.length} rep car balances.`,
    );
    return;
  }

  const loadDate = new Date();
  let totalQuantity = new Prisma.Decimal(0);
  let totalAmount = new Prisma.Decimal(0);
  const lineDrafts: Array<{
    itemId: string;
    code: string;
    unitOfMeasure: string;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    lineTotalAmount: Prisma.Decimal;
  }> = [];

  for (let index = 0; index < repLines.length; index += 1) {
    const line = repLines[index];
    const balance = await prisma.inventoryWarehouseBalance.findUnique({
      where: {
        itemId_warehouseId: { itemId: line.id, warehouseId: options.warehouseId },
      },
    });
    const whQty = balance?.onHandQuantity ?? new Prisma.Decimal(0);
    const whVal = balance?.valuationAmount ?? new Prisma.Decimal(0);
    const unitCost =
      line.unitCost > 0
        ? new Prisma.Decimal(line.unitCost)
        : whQty.gt(0)
          ? whVal.div(whQty)
          : new Prisma.Decimal(0.5);
    const quantity = new Prisma.Decimal(line.repCarQty);
    const lineTotalAmount = unitCost.mul(quantity);

    if (whQty.lt(quantity)) {
      throw new Error(
        `Not enough warehouse stock for showcase rep load (${line.code}: need ${line.repCarQty}, have ${whQty}).`,
      );
    }

    lineDrafts.push({
      itemId: line.id,
      code: line.code,
      unitOfMeasure: line.unitOfMeasure,
      quantity,
      unitCost,
      lineTotalAmount,
    });
    totalQuantity = totalQuantity.add(quantity);
    totalAmount = totalAmount.add(lineTotalAmount);
  }

  await prisma.$transaction(async (tx) => {
    const load = await tx.repCarLoad.create({
      data: {
        reference: SHOWCASE_REP_LOAD_REF,
        status: RepCarLoadStatus.POSTED,
        loadDate,
        warehouseId: options.warehouseId,
        salesRepId: options.salesRepId,
        description: 'Showcase demo rep car load for boss demo',
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
      include: { lines: true },
    });

    for (let index = 0; index < lineDrafts.length; index += 1) {
      const draft = lineDrafts[index];
      const loadLine = load.lines[index];
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
          transactionId: load.id,
          transactionLineId: loadLine.id,
          transactionReference: load.reference,
          transactionDate: loadDate,
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
          salesRepId_itemId: { salesRepId: options.salesRepId, itemId: draft.itemId },
        },
        create: {
          salesRepId: options.salesRepId,
          itemId: draft.itemId,
          onHandQuantity: draft.quantity,
          valuationAmount: draft.lineTotalAmount,
        },
        update: {
          onHandQuantity: draft.quantity,
          valuationAmount: draft.lineTotalAmount,
        },
      });

      await tx.repCarStockMovement.create({
        data: {
          movementType: RepCarStockMovementType.LOAD_IN,
          transactionType: 'RepCarLoad',
          transactionId: load.id,
          transactionLineId: loadLine.id,
          transactionReference: load.reference,
          transactionDate: loadDate,
          salesRepId: options.salesRepId,
          itemId: draft.itemId,
          quantityIn: draft.quantity,
          unitCost: draft.unitCost,
          valueIn: draft.lineTotalAmount,
          runningQuantity: draft.quantity,
          runningValuation: draft.lineTotalAmount,
        },
      });
    }
  });

  console.log(
    `Showcase rep car load ${SHOWCASE_REP_LOAD_REF}: ${repLines.length} products on REP-AMER.`,
  );
}

function printShowcaseGuide() {
  console.log('');
  console.log('--- Boss demo quick guide ---');
  console.log('Inventory (warehouse):  /inventory  → search MKT-DEMO');
  console.log('Chart of accounts:      /accounts   → 1131001 Merchandise Inventory');
  console.log('Market POS register:    /pos-market/register');
  console.log('  Login: market_cashier / market123');
  console.log('  Open shift → pick rep REP-AMER → pick destination market → sell MKT-DEMO-*');
  console.log('Rep car stock:            /pos-market/my-stock  (login as amer / amer123)');
  console.log('---');
}

async function main() {
  const { PrismaClient } = await import('../../src/generated/prisma');
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });
    if (!admin) {
      throw new Error('Admin user not found. Run npm run seed first.');
    }

    const { seedPosMarketDemo } = await import('./seed-pos-market');
    await seedPosMarketDemo(prisma, { adminUserId: admin.id });
    await seedMarketShowcase(prisma, { adminUserId: admin.id });
    await setupPosMarketCashierUser(prisma);
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
