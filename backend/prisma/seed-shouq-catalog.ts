import * as fs from 'fs';
import * as path from 'path';

import * as XLSX from 'xlsx';
import { InventoryItemType, Prisma, PrismaClient } from '../src/generated/prisma';

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

export { clearLegacyMarketDemoProducts as deactivateLegacyMarketDemoProducts } from './clear-legacy-market-demo';

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

  await deactivateLegacyMarketDemoProducts(prisma);
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

  return { created, updated, withStock, rows };
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
