import * as fs from 'fs';
import * as path from 'path';

import {
  InventoryItemType,
  InventoryReceiptStatus,
  InventoryStockMovementType,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma';

const DEFAULT_XLSX_PATH = path.join(
  __dirname,
  '..',
  'data',
  'opening-inventory-2026-05-31.xlsx',
);
const DEFAULT_JSON_PATH = path.join(
  __dirname,
  '..',
  'data',
  'opening-inventory-2026-05-31.json',
);
const OPENING_STOCK_DATE = new Date('2026-05-31T00:00:00.000Z');

const AR_HEADERS = {
  itemCode: 'رمز المادة',
  name: 'وصف المادة',
  unit: 'الوحدة',
  quantity: 'الكمية',
  cost: 'الكلفة',
  salesPrice: 'سعر البيع',
} as const;

const WAREHOUSE_CONFIGS = [
  {
    key: 'main',
    sheetName: 'مستودع رئيسي',
    desiredCode: 'WH-MAIN',
    desiredName: 'المخزن الرئيسي',
    aliases: ['WH-MAIN', 'مستودع رئيسي', 'المخزن الرئيسي', 'Main Warehouse'],
    receiptReference: 'OPEN-STOCK-20260531-WH-MAIN',
    receiptDescription:
      'Opening Stock import from Excel workbook (Main Warehouse) dated 2026-05-31.',
  },
  {
    key: 'amer',
    sheetName: 'مستودع عامر',
    desiredCode: 'WH-AMER',
    desiredName: 'مستودع عامر',
    aliases: ['WH-AMER', 'مستودع عامر', 'سيارة عامر', 'Amer Warehouse'],
    receiptReference: 'OPEN-STOCK-20260531-WH-AMER',
    receiptDescription:
      'Opening Stock import from Excel workbook (Amer Warehouse) dated 2026-05-31.',
  },
] as const;

type WarehouseKey = (typeof WAREHOUSE_CONFIGS)[number]['key'];

type ImportedRow = {
  warehouseKey: WarehouseKey;
  sheetName: string;
  sourceCode: string;
  itemName: string;
  rawUnit: string;
  unitCode: string;
  quantity: number;
  unitCost: number | null;
  sellingPrice: number | null;
  missingCost: boolean;
  missingSellingPrice: boolean;
};

type ItemSeedCandidate = {
  code: string;
  name: string;
  unitCode: string;
  defaultPurchasePrice: number | null;
  defaultSalesPrice: number | null;
};

type WarehouseSeedResult = {
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  created: boolean;
};

type ReceiptSeedResult = {
  createdLineCount: number;
  refreshedExistingReceipt: boolean;
  skippedExisting?: boolean;
  receiptReference: string;
};

type ImportSummary = {
  itemsCreated: number;
  itemsUpdated: number;
  warehousesCreated: number;
  warehousesReused: number;
  stockReceiptLinesCreated: number;
  skippedZeroQuantityLines: number;
  missingValueRows: Array<{
    sheetName: string;
    itemCode: string;
    itemName: string;
    missing: Array<'cost' | 'sellingPrice'>;
  }>;
};

type WorkbookSheetRow = Record<string, unknown>;

type WorkbookJson = {
  sheets: Array<{
    name: string;
    rows: WorkbookSheetRow[];
  }>;
};

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeKey(value: string) {
  return normalizeText(value).toLocaleLowerCase();
}

function parseOptionalNumber(value: unknown) {
  const normalized = normalizeText(value).replace(/,/g, '');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function mapUnitCode(rawUnit: string) {
  const normalized = normalizeText(rawUnit);
  switch (normalized) {
    case 'كيلو':
    case 'كغ':
    case 'kg':
    case 'KG':
      return 'KG';
    case 'حبة':
    case 'قطعة':
    case 'PCS':
    case 'pcs':
      return 'PCS';
    case 'صندوق':
      return 'BOX';
    case 'كرتونة':
      return 'CTN';
    case 'لتر':
      return 'L';
    case 'مل':
      return 'ML';
    case 'غرام':
      return 'G';
    default:
      return normalized.toUpperCase();
  }
}

function readWorkbookJson(jsonPath: string): WorkbookJson {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Opening inventory JSON snapshot not found: ${jsonPath}. Recreate it from ${DEFAULT_XLSX_PATH}.`,
    );
  }

  return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as WorkbookJson;
}

function readOpeningInventoryRows(
  jsonPath = DEFAULT_JSON_PATH,
): { rows: ImportedRow[]; skippedZeroQuantityLines: number; missingValueRows: ImportSummary['missingValueRows'] } {
  const workbook = readWorkbookJson(jsonPath);
  const rows: ImportedRow[] = [];
  const missingValueRows: ImportSummary['missingValueRows'] = [];
  let skippedZeroQuantityLines = 0;

  for (const config of WAREHOUSE_CONFIGS) {
    const matchingSheetName =
      workbook.sheets.find(
        (sheet) => normalizeKey(sheet.name) === normalizeKey(config.sheetName),
      ) ?? null;

    if (!matchingSheetName) {
      throw new Error(
        `Workbook is missing required sheet "${config.sheetName}". Found sheets: ${workbook.sheets.map((sheet) => sheet.name).join(', ')}`,
      );
    }

    const rawRows = matchingSheetName.rows;

    for (const rawRow of rawRows) {
      const sourceCode = normalizeText(rawRow[AR_HEADERS.itemCode]);
      const itemName = normalizeText(rawRow[AR_HEADERS.name]);
      if (!sourceCode || !itemName) {
        continue;
      }

      const unitValue = normalizeText(rawRow[AR_HEADERS.unit]);
      const quantity = parseOptionalNumber(rawRow[AR_HEADERS.quantity]) ?? 0;
      const unitCost = parseOptionalNumber(rawRow[AR_HEADERS.cost]);
      const sellingPrice = parseOptionalNumber(rawRow[AR_HEADERS.salesPrice]);
      const missingFields: Array<'cost' | 'sellingPrice'> = [];

      if (unitCost === null) {
        missingFields.push('cost');
      }
      if (sellingPrice === null) {
        missingFields.push('sellingPrice');
      }

      if (missingFields.length > 0) {
        missingValueRows.push({
          sheetName: config.sheetName,
          itemCode: sourceCode,
          itemName,
          missing: missingFields,
        });
      }

      const row: ImportedRow = {
        warehouseKey: config.key,
        sheetName: config.sheetName,
        sourceCode,
        itemName,
        rawUnit: unitValue,
        unitCode: mapUnitCode(unitValue || 'PCS'),
        quantity: roundNumber(quantity, 4),
        unitCost,
        sellingPrice,
        missingCost: unitCost === null,
        missingSellingPrice: sellingPrice === null,
      };

      rows.push(row);
      if (row.quantity <= 0) {
        skippedZeroQuantityLines += 1;
      }
    }
  }

  if (rows.length === 0) {
    throw new Error('No inventory rows were found in the workbook.');
  }

  return { rows, skippedZeroQuantityLines, missingValueRows };
}

function buildItemCandidates(rows: ImportedRow[]) {
  const candidates = new Map<string, ItemSeedCandidate>();

  for (const row of rows) {
    const existing = candidates.get(row.sourceCode);
    if (!existing) {
      candidates.set(row.sourceCode, {
        code: row.sourceCode,
        name: row.itemName,
        unitCode: row.unitCode,
        defaultPurchasePrice: row.unitCost,
        defaultSalesPrice: row.sellingPrice,
      });
      continue;
    }

    if (!existing.name && row.itemName) {
      existing.name = row.itemName;
    }
    if (!existing.unitCode && row.unitCode) {
      existing.unitCode = row.unitCode;
    }
    if ((existing.defaultPurchasePrice === null || existing.defaultPurchasePrice === 0) && row.unitCost !== null) {
      existing.defaultPurchasePrice = row.unitCost;
    }
    if ((existing.defaultSalesPrice === null || existing.defaultSalesPrice === 0) && row.sellingPrice !== null) {
      existing.defaultSalesPrice = row.sellingPrice;
    }
  }

  return candidates;
}

async function ensureWarehouse(
  prisma: PrismaClient,
  config: (typeof WAREHOUSE_CONFIGS)[number],
): Promise<WarehouseSeedResult> {
  const warehouses = await prisma.inventoryWarehouse.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  const aliasKeys = new Set(config.aliases.map((alias) => normalizeKey(alias)));
  const matched =
    warehouses.find((warehouse) => aliasKeys.has(normalizeKey(warehouse.code))) ??
    warehouses.find((warehouse) => aliasKeys.has(normalizeKey(warehouse.name))) ??
    null;

  if (matched) {
    return { warehouse: matched, created: false };
  }

  const created = await prisma.inventoryWarehouse.create({
    data: {
      code: config.desiredCode,
      name: config.desiredName,
      isActive: true,
      isTransit: false,
      isDefaultTransit: false,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return { warehouse: created, created: true };
}

function unitAllowsFractions(unitCode: string) {
  return ['KG', 'G', 'L', 'ML', 'M', 'CM'].includes(unitCode);
}

function toDecimal(value: number | string) {
  return new Prisma.Decimal(value);
}

async function seedItems(
  prisma: PrismaClient,
  candidates: Map<string, ItemSeedCandidate>,
  options: {
    mainWarehouseId: string;
    mainWarehouseCode: string;
  },
) {
  const inventoryAccount = await prisma.account.findUniqueOrThrow({
    where: { code: '1131001' },
    select: { id: true },
  });
  const salesAccount = await prisma.account.findUniqueOrThrow({
    where: { code: '4110001' },
    select: { id: true },
  });
  let cogsAccount = await prisma.account.findFirst({
    where: {
      code: '5130001',
      isActive: true,
      isPosting: true,
    },
    select: { id: true },
  });

  if (!cogsAccount) {
    const operatingExpenses = await prisma.account.findUnique({
      where: { code: '5100000' },
      select: { id: true },
    });
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });
    if (operatingExpenses && admin) {
      cogsAccount = await prisma.account.create({
        data: {
          code: '5130001',
          name: 'Cost of Goods Sold',
          nameAr: 'تكلفة البضاعة المباعة',
          type: 'EXPENSE',
          isPosting: true,
          subtype: 'Expense',
          parentAccountId: operatingExpenses.id,
          createdById: admin.id,
        },
        select: { id: true },
      });
    }
  }
  const openingBalanceEquity = await prisma.account.findUnique({
    where: { code: '3410001' },
    select: { id: true },
  });

  const units = await prisma.inventoryUnitOfMeasure.findMany({
    select: { id: true, code: true, decimalPrecision: true },
  });
  const unitByCode = new Map(units.map((unit) => [unit.code, unit]));

  let itemsCreated = 0;
  let itemsUpdated = 0;

  for (const candidate of candidates.values()) {
    const unit = unitByCode.get(candidate.unitCode) ?? unitByCode.get('PCS') ?? null;
    if (!unit) {
      throw new Error(
        `Required unit of measure "${candidate.unitCode}" was not found and no PCS fallback exists.`,
      );
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { code: candidate.code },
      select: {
        id: true,
        name: true,
        unitOfMeasure: true,
        unitOfMeasureId: true,
        type: true,
        inventoryAccountId: true,
        cogsAccountId: true,
        salesAccountId: true,
        adjustmentAccountId: true,
        defaultPurchasePrice: true,
        defaultSalesPrice: true,
        currencyCode: true,
        preferredWarehouseId: true,
        preferredWarehouseCode: true,
      },
    });

    if (!existing) {
      await prisma.inventoryItem.create({
        data: {
          code: candidate.code,
          name: candidate.name,
          unitOfMeasure: unit.code,
          unitOfMeasureId: unit.id,
          type: InventoryItemType.FINISHED_GOOD,
          inventoryAccountId: inventoryAccount.id,
          cogsAccountId: cogsAccount?.id ?? null,
          salesAccountId: salesAccount.id,
          adjustmentAccountId: openingBalanceEquity?.id ?? null,
          defaultPurchasePrice:
            candidate.defaultPurchasePrice === null
              ? null
              : toDecimal(roundNumber(candidate.defaultPurchasePrice, 4)),
          defaultSalesPrice:
            candidate.defaultSalesPrice === null
              ? null
              : toDecimal(roundNumber(candidate.defaultSalesPrice, 4)),
          currencyCode: 'JOD',
          trackInventory: true,
          preferredWarehouseId: options.mainWarehouseId,
          preferredWarehouseCode: options.mainWarehouseCode,
          allowFractionalQuantity:
            unit.decimalPrecision > 0 || unitAllowsFractions(unit.code),
          minSalesQuantity: toDecimal(unit.decimalPrecision > 0 ? '0.001' : '1'),
          isActive: true,
        },
      });
      itemsCreated += 1;
      continue;
    }

    const updateData: Prisma.InventoryItemUncheckedUpdateInput = {};
    let changed = false;

    if (!normalizeText(existing.name) && candidate.name) {
      updateData.name = candidate.name;
      changed = true;
    }
    if (!normalizeText(existing.unitOfMeasure) && unit.code) {
      updateData.unitOfMeasure = unit.code;
      changed = true;
    }
    if (!existing.unitOfMeasureId) {
      updateData.unitOfMeasureId = unit.id;
      changed = true;
    }
    if (existing.inventoryAccountId !== inventoryAccount.id) {
      updateData.inventoryAccountId = inventoryAccount.id;
      changed = true;
    }
    if (existing.cogsAccountId !== (cogsAccount?.id ?? null)) {
      updateData.cogsAccountId = cogsAccount?.id ?? null;
      changed = true;
    }
    if (existing.salesAccountId !== salesAccount.id) {
      updateData.salesAccountId = salesAccount.id;
      changed = true;
    }
    if (existing.adjustmentAccountId !== (openingBalanceEquity?.id ?? null)) {
      updateData.adjustmentAccountId = openingBalanceEquity?.id ?? null;
      changed = true;
    }
    if (!existing.currencyCode) {
      updateData.currencyCode = 'JOD';
      changed = true;
    }
    if (!existing.preferredWarehouseId) {
      updateData.preferredWarehouseId = options.mainWarehouseId;
      changed = true;
    }
    if (!existing.preferredWarehouseCode) {
      updateData.preferredWarehouseCode = options.mainWarehouseCode;
      changed = true;
    }
    if (
      existing.defaultPurchasePrice === null &&
      candidate.defaultPurchasePrice !== null
    ) {
      updateData.defaultPurchasePrice = toDecimal(
        roundNumber(candidate.defaultPurchasePrice, 4),
      );
      changed = true;
    }
    if (
      existing.defaultSalesPrice === null &&
      candidate.defaultSalesPrice !== null
    ) {
      updateData.defaultSalesPrice = toDecimal(
        roundNumber(candidate.defaultSalesPrice, 4),
      );
      changed = true;
    }

    if (changed) {
      await prisma.inventoryItem.update({
        where: { code: candidate.code },
        data: updateData,
      });
      itemsUpdated += 1;
    }
  }

  return { itemsCreated, itemsUpdated };
}

async function applyWarehouseBalance(
  tx: Prisma.TransactionClient,
  options: {
    itemId: string;
    warehouseId: string;
    quantityDelta: Prisma.Decimal;
    valueDelta: Prisma.Decimal;
  },
) {
  const existing = await tx.inventoryWarehouseBalance.findUnique({
    where: {
      itemId_warehouseId: {
        itemId: options.itemId,
        warehouseId: options.warehouseId,
      },
    },
    select: {
      id: true,
      onHandQuantity: true,
      valuationAmount: true,
    },
  });

  if (!existing) {
    return tx.inventoryWarehouseBalance.create({
      data: {
        itemId: options.itemId,
        warehouseId: options.warehouseId,
        onHandQuantity: options.quantityDelta,
        valuationAmount: options.valueDelta,
      },
      select: {
        id: true,
        onHandQuantity: true,
        valuationAmount: true,
      },
    });
  }

  return tx.inventoryWarehouseBalance.update({
    where: { id: existing.id },
    data: {
      onHandQuantity: { increment: options.quantityDelta },
      valuationAmount: { increment: options.valueDelta },
    },
    select: {
      id: true,
      onHandQuantity: true,
      valuationAmount: true,
    },
  });
}

async function postOpeningReceipt(
  tx: Prisma.TransactionClient,
  receiptId: string,
) {
  const receipt = await tx.inventoryGoodsReceipt.findUniqueOrThrow({
    where: { id: receiptId },
    include: {
      lines: {
        orderBy: { lineNumber: 'asc' },
      },
    },
  });

  for (const line of receipt.lines) {
    const unitCost = line.quantity.gt(0)
      ? line.lineTotalAmount.div(line.quantity)
      : new Prisma.Decimal(0);

    await tx.inventoryItem.update({
      where: { id: line.itemId },
      data: {
        onHandQuantity: {
          increment: line.quantity,
        },
        valuationAmount: {
          increment: line.lineTotalAmount,
        },
      },
    });

    const warehouseBalance = await applyWarehouseBalance(tx, {
      itemId: line.itemId,
      warehouseId: receipt.warehouseId,
      quantityDelta: line.quantity,
      valueDelta: line.lineTotalAmount,
    });

    await tx.inventoryStockMovement.create({
      data: {
        movementType: InventoryStockMovementType.GOODS_RECEIPT,
        transactionType: 'InventoryGoodsReceipt',
        transactionId: receipt.id,
        transactionLineId: line.id,
        transactionReference: receipt.reference,
        transactionDate: receipt.receiptDate,
        itemId: line.itemId,
        warehouseId: receipt.warehouseId,
        quantityIn: line.quantity,
        quantityOut: new Prisma.Decimal(0),
        unitCost,
        valueIn: line.lineTotalAmount,
        valueOut: new Prisma.Decimal(0),
        balanceId: warehouseBalance.id,
        runningQuantity: warehouseBalance.onHandQuantity,
        runningValuation: warehouseBalance.valuationAmount,
        description: line.description ?? receipt.description ?? 'Opening Stock',
      },
    });

    await tx.inventoryCostLayer.create({
      data: {
        itemId: line.itemId,
        warehouseId: receipt.warehouseId,
        remainingQuantity: line.quantity,
        unitCost,
        sourceMovementType: InventoryStockMovementType.GOODS_RECEIPT,
        sourceTransactionType: 'InventoryGoodsReceipt',
        sourceTransactionId: receipt.id,
        sourceLineId: line.id,
        sourceReference: receipt.reference,
        sourceDate: receipt.receiptDate,
      },
    });
  }

  await tx.inventoryGoodsReceipt.update({
    where: { id: receipt.id },
    data: {
      status: InventoryReceiptStatus.POSTED,
      postedAt: new Date(),
    },
  });
}

async function assertReceiptCanBeRefreshed(
  tx: Prisma.TransactionClient,
  receipt: {
    id: string;
    warehouseId: string;
    lines: Array<{
      itemId: string;
    }>;
  },
) {
  const itemIds = [...new Set(receipt.lines.map((line) => line.itemId))];
  if (itemIds.length === 0) {
    return;
  }

  const downstreamMovement = await tx.inventoryStockMovement.findFirst({
    where: {
      itemId: { in: itemIds },
      warehouseId: receipt.warehouseId,
      transactionId: { not: receipt.id },
    },
    select: {
      id: true,
      transactionReference: true,
      transactionType: true,
      itemId: true,
    },
  });

  if (downstreamMovement) {
    throw new Error(
      `Opening receipt refresh is blocked because warehouse activity already exists for one of its items (reference ${downstreamMovement.transactionReference}, type ${downstreamMovement.transactionType}). Clear or reverse later stock activity before rerunning the opening inventory seed.`,
    );
  }
}

async function rollbackPostedOpeningReceipt(
  tx: Prisma.TransactionClient,
  receipt: {
    id: string;
    warehouseId: string;
    lines: Array<{
      itemId: string;
      quantity: Prisma.Decimal;
      lineTotalAmount: Prisma.Decimal;
    }>;
  },
) {
  await assertReceiptCanBeRefreshed(tx, receipt);

  for (const line of receipt.lines) {
    await tx.inventoryItem.update({
      where: { id: line.itemId },
      data: {
        onHandQuantity: {
          decrement: line.quantity,
        },
        valuationAmount: {
          decrement: line.lineTotalAmount,
        },
      },
    });

    const warehouseBalance = await tx.inventoryWarehouseBalance.findUnique({
      where: {
        itemId_warehouseId: {
          itemId: line.itemId,
          warehouseId: receipt.warehouseId,
        },
      },
      select: {
        id: true,
        onHandQuantity: true,
        valuationAmount: true,
      },
    });

    if (!warehouseBalance) {
      throw new Error(
        `Warehouse balance was not found while refreshing opening receipt ${receipt.id}.`,
      );
    }

    const nextQuantity = warehouseBalance.onHandQuantity.minus(line.quantity);
    const nextValuation = warehouseBalance.valuationAmount.minus(
      line.lineTotalAmount,
    );

    if (nextQuantity.lt(0) || nextValuation.lt(0)) {
      throw new Error(
        `Warehouse balance would become negative while refreshing opening receipt ${receipt.id}.`,
      );
    }

    if (nextQuantity.eq(0) && nextValuation.eq(0)) {
      await tx.inventoryWarehouseBalance.delete({
        where: { id: warehouseBalance.id },
      });
    } else {
      await tx.inventoryWarehouseBalance.update({
        where: { id: warehouseBalance.id },
        data: {
          onHandQuantity: nextQuantity,
          valuationAmount: nextValuation,
        },
      });
    }
  }

  await tx.inventoryStockMovement.deleteMany({
    where: { transactionType: 'InventoryGoodsReceipt', transactionId: receipt.id },
  });
  await tx.inventoryCostLayer.deleteMany({
    where: {
      sourceTransactionType: 'InventoryGoodsReceipt',
      sourceTransactionId: receipt.id,
    },
  });
}

async function ensureOpeningReceipt(
  prisma: PrismaClient,
  options: {
    reference: string;
    description: string;
    warehouseId: string;
    rows: ImportedRow[];
    addOnly?: boolean;
  },
) {
  const positiveRows = options.rows.filter((row) => row.quantity > 0);
  if (positiveRows.length === 0) {
    return {
      createdLineCount: 0,
      refreshedExistingReceipt: false,
      receiptReference: options.reference,
    } satisfies ReceiptSeedResult;
  }

  const existing = await prisma.inventoryGoodsReceipt.findUnique({
    where: { reference: options.reference },
    include: {
      lines: {
        select: {
          id: true,
          itemId: true,
          quantity: true,
          lineTotalAmount: true,
        },
      },
    },
  });

  if (
    existing &&
    existing.status !== InventoryReceiptStatus.DRAFT &&
    existing.status !== InventoryReceiptStatus.POSTED
  ) {
    throw new Error(
      `Receipt ${options.reference} already exists with status ${existing.status}. Delete or replace it manually before rerunning this import.`,
    );
  }

  if (existing && options.addOnly) {
    console.log(
      `Skipped existing opening receipt ${options.reference} (add-only mode; existing stock preserved).`,
    );
    return {
      createdLineCount: 0,
      refreshedExistingReceipt: false,
      skippedExisting: true,
      receiptReference: options.reference,
    } satisfies ReceiptSeedResult;
  }

  const items = await prisma.inventoryItem.findMany({
    where: {
      code: {
        in: positiveRows.map((row) => row.sourceCode),
      },
    },
    select: {
      id: true,
      code: true,
      unitOfMeasure: true,
    },
  });
  const itemByCode = new Map(items.map((item) => [item.code, item]));

  const lineDrafts = positiveRows.map((row, index) => {
    const item = itemByCode.get(row.sourceCode);
    if (!item) {
      throw new Error(
        `Imported item code ${row.sourceCode} was not found after item upsert.`,
      );
    }

    const roundedLineUnitCost = roundNumber(row.unitCost ?? 0, 2);
    const lineTotalAmount = roundNumber(row.quantity * roundedLineUnitCost, 2);

    return {
      itemId: item.id,
      lineNumber: index + 1,
      quantity: toDecimal(roundNumber(row.quantity, 4)),
      unitCost: toDecimal(roundedLineUnitCost),
      unitOfMeasure: item.unitOfMeasure,
      description: `Opening Stock import from sheet ${row.sheetName}`,
      lineTotalAmount: toDecimal(lineTotalAmount),
    };
  });

  const totalQuantity = lineDrafts.reduce(
    (sum, line) => sum.plus(line.quantity),
    new Prisma.Decimal(0),
  );
  const totalAmount = lineDrafts.reduce(
    (sum, line) => sum.plus(line.lineTotalAmount),
    new Prisma.Decimal(0),
  );

  await prisma.$transaction(async (tx) => {
    let receiptId = existing?.id ?? null;
    let refreshedExistingReceipt = false;

    if (existing) {
      if (existing.status === InventoryReceiptStatus.POSTED) {
        await rollbackPostedOpeningReceipt(tx, {
          id: existing.id,
          warehouseId: existing.warehouseId,
          lines: existing.lines,
        });
        refreshedExistingReceipt = true;
      }

      await tx.inventoryGoodsReceiptLine.deleteMany({
        where: { goodsReceiptId: existing.id },
      });
      await tx.inventoryGoodsReceipt.update({
        where: { id: existing.id },
        data: {
          status: InventoryReceiptStatus.DRAFT,
          receiptDate: OPENING_STOCK_DATE,
          warehouseId: options.warehouseId,
          description: options.description,
          totalQuantity,
          totalAmount,
          postedAt: null,
          reversedAt: null,
        },
      });
      receiptId = existing.id;
    } else {
      const created = await tx.inventoryGoodsReceipt.create({
        data: {
          reference: options.reference,
          status: InventoryReceiptStatus.DRAFT,
          receiptDate: OPENING_STOCK_DATE,
          warehouseId: options.warehouseId,
          description: options.description,
          totalQuantity,
          totalAmount,
        },
        select: { id: true },
      });
      receiptId = created.id;
    }

    await tx.inventoryGoodsReceiptLine.createMany({
      data: lineDrafts.map((line) => ({
        goodsReceiptId: receiptId!,
        itemId: line.itemId,
        lineNumber: line.lineNumber,
        quantity: line.quantity,
        unitCost: line.unitCost,
        unitOfMeasure: line.unitOfMeasure,
        description: line.description,
        lineTotalAmount: line.lineTotalAmount,
      })),
    });

    await postOpeningReceipt(tx, receiptId!);

    return refreshedExistingReceipt;
  });

  return {
    createdLineCount: lineDrafts.length,
    refreshedExistingReceipt: existing?.status === InventoryReceiptStatus.POSTED,
    receiptReference: options.reference,
  } satisfies ReceiptSeedResult;
}

export async function seedOpeningInventoryFromWorkbook(
  prisma: PrismaClient,
  options: { dataPath?: string; addOnly?: boolean } = {},
) {
  const { rows, skippedZeroQuantityLines, missingValueRows } =
    readOpeningInventoryRows(options.dataPath);

  console.log(
    `Opening inventory import: loaded ${rows.length} rows from snapshot (${options.dataPath ?? DEFAULT_JSON_PATH}).`,
  );

  const warehouses = new Map<WarehouseKey, WarehouseSeedResult>();
  let warehousesCreated = 0;
  let warehousesReused = 0;

  for (const config of WAREHOUSE_CONFIGS) {
    const result = await ensureWarehouse(prisma, config);
    warehouses.set(config.key, result);
    if (result.created) {
      warehousesCreated += 1;
    } else {
      warehousesReused += 1;
    }
  }

  const mainWarehouse = warehouses.get('main')?.warehouse;
  if (!mainWarehouse) {
    throw new Error('Main warehouse could not be resolved.');
  }

  const itemCandidates = buildItemCandidates(rows);
  const { itemsCreated, itemsUpdated } = await seedItems(prisma, itemCandidates, {
    mainWarehouseId: mainWarehouse.id,
    mainWarehouseCode: mainWarehouse.code,
  });

  let stockReceiptLinesCreated = 0;
  for (const config of WAREHOUSE_CONFIGS) {
    const warehouse = warehouses.get(config.key)?.warehouse;
    if (!warehouse) {
      throw new Error(`Warehouse ${config.key} could not be resolved.`);
    }

    const receiptResult = await ensureOpeningReceipt(prisma, {
      reference: config.receiptReference,
      description: config.receiptDescription,
      warehouseId: warehouse.id,
      rows: rows.filter((row) => row.warehouseKey === config.key),
      addOnly: options.addOnly,
    });

    stockReceiptLinesCreated += receiptResult.createdLineCount;

    if (receiptResult.skippedExisting) {
      // logged inside ensureOpeningReceipt
    } else if (receiptResult.refreshedExistingReceipt) {
      console.log(
        `Refreshed existing opening receipt ${receiptResult.receiptReference} for warehouse ${warehouse.code}.`,
      );
    } else if (receiptResult.createdLineCount > 0) {
      console.log(
        `Created and posted opening receipt ${receiptResult.receiptReference} with ${receiptResult.createdLineCount} lines for warehouse ${warehouse.code}.`,
      );
    } else {
      console.log(
        `No positive opening quantities for warehouse ${warehouse.code}; no stock receipt was created.`,
      );
    }
  }

  const summary: ImportSummary = {
    itemsCreated,
    itemsUpdated,
    warehousesCreated,
    warehousesReused,
    stockReceiptLinesCreated,
    skippedZeroQuantityLines,
    missingValueRows,
  };

  console.log('Opening inventory import summary:');
  console.log(`- items created: ${summary.itemsCreated}`);
  console.log(`- items updated: ${summary.itemsUpdated}`);
  console.log(`- warehouses created: ${summary.warehousesCreated}`);
  console.log(`- warehouses reused: ${summary.warehousesReused}`);
  console.log(`- stock receipt lines created: ${summary.stockReceiptLinesCreated}`);
  console.log(`- skipped zero-quantity lines: ${summary.skippedZeroQuantityLines}`);
  console.log(`- rows with missing cost or selling price: ${summary.missingValueRows.length}`);

  if (summary.missingValueRows.length > 0) {
    for (const row of summary.missingValueRows) {
      console.log(
        `  - ${row.sheetName} | code ${row.itemCode} | ${row.itemName} | missing ${row.missing.join(', ')}`,
      );
    }
  }

  return summary;
}

async function main() {
  const prisma = new PrismaClient();
  const cliArgs = process.argv.slice(2);
  const addOnly = cliArgs.includes('--add-only');
  const dataPathArg = cliArgs.find((arg) => !arg.startsWith('--'));

  try {
    await seedOpeningInventoryFromWorkbook(prisma, {
      dataPath: dataPathArg ? path.resolve(process.cwd(), dataPathArg) : DEFAULT_JSON_PATH,
      addOnly,
    });
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
