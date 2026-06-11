import * as fs from 'fs';
import * as path from 'path';

import * as XLSX from 'xlsx';
import { InventoryItemType, Prisma, PrismaClient } from '../src/generated/prisma';

import { postJournalEntry } from './seed-posting';

export const SHOUQ_OPENING_INVENTORY_JE_REF = 'JE-SHOUQ-OPENING-INV';

export const SHOUQ_GROUP_CODE = 'MARKET-SNACKS';
export const SHOUQ_CODE_PREFIX = 'MKT-SHQ-';
export const DEFAULT_SHOUQ_XLSX_PATH = path.join(__dirname, '..', 'data', 'shouq.xlsx');

const AR_HEADERS = {
  itemCode: 'رمز المادة',
  name: 'وصف المادة',
  unit: 'الوحدة',
  quantity: 'الكمية',
  cost: 'الكلفة',
  salesPrice: 'سعر البيع',
} as const;

export type ShouqCatalogRow = {
  sourceCode: string;
  code: string;
  name: string;
  unitCode: string;
  quantity: number;
  purchasePrice: number;
  salesPrice: number;
  sellByWeight: boolean;
};

function stringify(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function parseDecimal(value: unknown) {
  const normalized = stringify(value).replace(/,/g, '');
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapUnitArabic(unitAr: string) {
  const normalized = unitAr.trim();
  if (normalized === 'كيلو') {
    return 'KG';
  }
  if (normalized === 'حبة') {
    return 'PCS';
  }
  return normalized.toUpperCase();
}

export function buildShouqItemCode(rawCode: string | number) {
  const digits = String(rawCode).trim();
  return `${SHOUQ_CODE_PREFIX}${digits.padStart(3, '0')}`;
}

export function readShouqCatalogRows(xlsxPath = DEFAULT_SHOUQ_XLSX_PATH): ShouqCatalogRow[] {
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Shouq catalog file not found: ${xlsxPath}`);
  }

  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Shouq workbook has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return rawRows
    .map((row) => {
      const sourceCode = stringify(row[AR_HEADERS.itemCode]);
      const name = stringify(row[AR_HEADERS.name]);
      if (!sourceCode || !name) {
        return null;
      }

      const unitCode = mapUnitArabic(stringify(row[AR_HEADERS.unit]));
      return {
        sourceCode,
        code: buildShouqItemCode(sourceCode),
        name,
        unitCode,
        quantity: parseDecimal(row[AR_HEADERS.quantity]),
        purchasePrice: parseDecimal(row[AR_HEADERS.cost]),
        salesPrice: parseDecimal(row[AR_HEADERS.salesPrice]),
        sellByWeight: unitCode === 'KG',
      };
    })
    .filter((row): row is ShouqCatalogRow => row !== null);
}

import { clearLegacyMarketDemoProducts } from './clear-legacy-market-demo';

export { clearLegacyMarketDemoProducts as deactivateLegacyMarketDemoProducts };

export async function deactivateRemovedShouqProducts(
  prisma: PrismaClient,
  activeCodes: Set<string>,
) {
  const staleItems = await prisma.inventoryItem.findMany({
    where: {
      code: { startsWith: SHOUQ_CODE_PREFIX },
      NOT: { code: { in: [...activeCodes] } },
    },
    select: { id: true, code: true },
  });

  if (staleItems.length === 0) {
    return;
  }

  await prisma.inventoryItem.updateMany({
    where: { id: { in: staleItems.map((item) => item.id) } },
    data: { isActive: false },
  });

  console.log(
    `Deactivated ${staleItems.length} Shouq products removed from catalog: ${staleItems.map((item) => item.code).join(', ')}`,
  );
}

export async function seedShouqCatalog(
  prisma: PrismaClient,
  _options: { adminUserId: string; xlsxPath?: string },
) {
  const rows = readShouqCatalogRows(_options.xlsxPath);
  if (rows.length === 0) {
    throw new Error('No product rows found in Shouq catalog file.');
  }

  console.log(`Seeding Shouq market catalog (${rows.length} products from Excel)...`);

  const activeCodes = new Set(rows.map((row) => row.code));

  await clearLegacyMarketDemoProducts(prisma);
  await deactivateRemovedShouqProducts(prisma, activeCodes);

  const [
    inventoryAccount,
    salesAccount,
    cogsAccount,
    vat16,
    mainWarehouse,
    snackGroup,
    snackCategory,
    units,
    stockWarehouses,
  ] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '1131001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '4110001' } }),
    prisma.account.findFirstOrThrow({
      where: {
        OR: [{ code: '5130001' }, { code: '5100000' }],
        isActive: true,
        isPosting: true,
      },
    }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT16' } }),
    prisma.inventoryWarehouse.findUniqueOrThrow({ where: { code: 'WH-MAIN' } }),
    prisma.inventoryItemGroup.findUniqueOrThrow({ where: { code: SHOUQ_GROUP_CODE } }),
    prisma.inventoryItemCategory.findUniqueOrThrow({ where: { code: SHOUQ_GROUP_CODE } }),
    prisma.inventoryUnitOfMeasure.findMany(),
    prisma.inventoryWarehouse.findMany({
      where: { isActive: true, isTransit: false },
      orderBy: { code: 'asc' },
    }),
  ]);

  const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
  const getUnit = (code: string) => unitByCode.get(code) ?? unitByCode.get('PCS')!;

  let created = 0;
  let updated = 0;
  let withStock = 0;

  for (const product of rows) {
    const unit = getUnit(product.unitCode);
    const sellByWeight = product.sellByWeight;
    const minSalesQty = sellByWeight ? 0.001 : 1;
    const stockMain = product.quantity;
    const unitCost = product.purchasePrice > 0 ? product.purchasePrice : product.salesPrice;
    const totalValue = stockMain * unitCost;
    const totalOnHand = stockMain * stockWarehouses.length;
    const totalValuation = totalValue * stockWarehouses.length;

    const existing = await prisma.inventoryItem.findUnique({
      where: { code: product.code },
      select: { id: true },
    });

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
        onHandQuantity: new Prisma.Decimal(totalOnHand),
        valuationAmount: new Prisma.Decimal(totalValuation),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(minSalesQty),
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
        onHandQuantity: new Prisma.Decimal(totalOnHand),
        valuationAmount: new Prisma.Decimal(totalValuation),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(minSalesQty),
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }

    for (const warehouse of stockWarehouses) {
      await prisma.inventoryWarehouseBalance.upsert({
        where: {
          itemId_warehouseId: {
            itemId: item.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          onHandQuantity: new Prisma.Decimal(stockMain),
          valuationAmount: new Prisma.Decimal(totalValue),
        },
        create: {
          itemId: item.id,
          warehouseId: warehouse.id,
          onHandQuantity: new Prisma.Decimal(stockMain),
          valuationAmount: new Prisma.Decimal(totalValue),
        },
      });
    }

    if (stockMain > 0) {
      withStock += 1;
    }
  }

  console.log(
    `Shouq catalog ready: ${created} created, ${updated} updated, ${withStock} with opening stock (codes ${SHOUQ_CODE_PREFIX}*).`,
  );

  await postOpeningInventoryToGl(prisma, _options.adminUserId, inventoryAccount.id, {
    codePrefix: SHOUQ_CODE_PREFIX,
    journalRef: SHOUQ_OPENING_INVENTORY_JE_REF,
    label: 'Shouq catalog',
  });

  return { created, updated, withStock, rows };
}

export async function postOpeningInventoryToGl(
  prisma: PrismaClient,
  adminUserId: string,
  inventoryAccountId: string,
  config: { codePrefix: string; journalRef: string; label: string },
) {
  const openingEquityAccount = await prisma.account.findUnique({
    where: { code: '3410001' },
    select: { id: true },
  });
  if (!openingEquityAccount) {
    console.log(`Opening Balance Equity (3410001) not found — skipping ${config.label} GL posting.`);
    return;
  }

  const aggregate = await prisma.inventoryWarehouseBalance.aggregate({
    where: { item: { code: { startsWith: config.codePrefix } } },
    _sum: { valuationAmount: true },
  });
  const targetAmount = Number(aggregate._sum.valuationAmount ?? 0);
  if (targetAmount <= 0) {
    console.log(`No ${config.label} opening inventory value to post to GL.`);
    return;
  }

  const existing = await prisma.journalEntry.findUnique({
    where: { reference: config.journalRef },
    include: { lines: true },
  });

  const postedInventoryDebit = existing
    ? existing.lines
        .filter((line) => line.accountId === inventoryAccountId)
        .reduce((sum, line) => sum + Number(line.debitAmount), 0)
    : 0;

  const delta = Number((targetAmount - postedInventoryDebit).toFixed(2));
  if (Math.abs(delta) < 0.01) {
    if (existing) {
      console.log(
        `${config.label} opening inventory already in GL (${postedInventoryDebit.toFixed(2)} JOD on 1131001).`,
      );
    }
    return;
  }

  const period = await prisma.fiscalPeriod.findFirst({
    where: { status: 'OPEN' },
    orderBy: [{ fiscalYear: { startDate: 'desc' } }, { periodNumber: 'asc' }],
  });
  if (!period) {
    console.log(`No open fiscal period — skipping ${config.label} GL posting.`);
    return;
  }

  const amount = Math.abs(delta);
  const isIncrease = delta > 0;
  const reference = existing
    ? `${config.journalRef}-ADJ-${Date.now()}`
    : config.journalRef;

  await postJournalEntry(prisma, adminUserId, {
    reference,
    description: existing
      ? `${config.label} opening inventory adjustment (${amount.toFixed(2)} JOD)`
      : `${config.label} opening inventory (${amount.toFixed(2)} JOD)`,
    entryDate: new Date(),
    fiscalPeriodId: period.id,
    lines: [
      {
        accountId: inventoryAccountId,
        description: `${config.label} opening merchandise inventory`,
        debitAmount: isIncrease ? amount : 0,
        creditAmount: isIncrease ? 0 : amount,
      },
      {
        accountId: openingEquityAccount.id,
        description: `${config.label} opening merchandise inventory offset`,
        debitAmount: isIncrease ? 0 : amount,
        creditAmount: isIncrease ? amount : 0,
      },
    ],
  });

  console.log(
    `Posted ${config.label} opening inventory to GL: ${isIncrease ? '+' : '-'}${amount.toFixed(2)} JOD (1131001 / 3410001, ref ${reference}).`,
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });
    if (!admin) {
      throw new Error('Admin user not found. Run the main seed first.');
    }

    const snackGroup = await prisma.inventoryItemGroup.findUnique({
      where: { code: SHOUQ_GROUP_CODE },
      select: { id: true },
    });
    if (!snackGroup) {
      throw new Error(`${SHOUQ_GROUP_CODE} group not found. Run npm run seed:market first.`);
    }

    await seedShouqCatalog(prisma, { adminUserId: admin.id });
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
