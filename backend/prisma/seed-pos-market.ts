import {
  InventoryItemType,
  InventoryStockMovementType,
  PosAccessRoleCode,
  PosPermissionCode,
  Prisma,
  PrismaClient,
  RepCarLoadStatus,
  RepCarStockMovementType,
} from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

type MarketProductSeed = {
  id: string;
  code: string;
  name: string;
  description: string;
  barcode: string;
  category: string;
  salesPrice: number;
  purchasePrice: number;
  stockMain: number;
  groupCode: string;
  categoryCode: string;
  itemImageUrl: string;
  unitOfMeasure?: string;
  sellByWeight?: boolean;
  minSalesQuantity?: number;
  favorite?: boolean;
};

/** Demo retail products for market POS — images are public HTTPS URLs (Unsplash). */
const MARKET_PRODUCTS: MarketProductSeed[] = [
  {
    id: 'MKT-ITEM-001',
    code: 'MKT-001',
    name: 'حليب طازج ١ لتر',
    description: 'Fresh milk 1L',
    barcode: '6291001001001',
    category: 'ألبان',
    salesPrice: 1.25,
    purchasePrice: 0.85,
    stockMain: 120,
    groupCode: 'MARKET-DAIRY',
    categoryCode: 'MARKET-DAIRY',
    itemImageUrl:
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=480&h=360&q=80',
    favorite: true,
  },
  {
    id: 'MKT-ITEM-002',
    code: 'MKT-002',
    name: 'خبز عربي',
    description: 'Arabic bread pack',
    barcode: '6291001001002',
    category: 'مخبوزات',
    salesPrice: 0.5,
    purchasePrice: 0.25,
    stockMain: 200,
    groupCode: 'MARKET-BAKERY',
    categoryCode: 'MARKET-BAKERY',
    itemImageUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-003',
    code: 'MKT-003',
    name: 'بيض طازج (طبق)',
    description: 'Fresh eggs tray',
    barcode: '6291001001003',
    category: 'ألبان',
    salesPrice: 2.75,
    purchasePrice: 2.1,
    stockMain: 80,
    groupCode: 'MARKET-DAIRY',
    categoryCode: 'MARKET-DAIRY',
    itemImageUrl:
      'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-004',
    code: 'MKT-004',
    name: 'أرز بسمتي ٥ كغ',
    description: 'Basmati rice 5kg',
    barcode: '6291001001004',
    category: 'بقالة',
    salesPrice: 6.5,
    purchasePrice: 5.2,
    stockMain: 60,
    groupCode: 'MARKET-GROCERY',
    categoryCode: 'MARKET-GROCERY',
    itemImageUrl:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=480&h=360&q=80',
    favorite: true,
  },
  {
    id: 'MKT-ITEM-005',
    code: 'MKT-005',
    name: 'زيت زيتون ٧٥٠ مل',
    description: 'Olive oil 750ml',
    barcode: '6291001001005',
    category: 'بقالة',
    salesPrice: 4.25,
    purchasePrice: 3.1,
    stockMain: 45,
    groupCode: 'MARKET-GROCERY',
    categoryCode: 'MARKET-GROCERY',
    itemImageUrl:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-006',
    code: 'MKT-006',
    name: 'طماطم طازجة',
    description: 'Fresh tomatoes — per kg',
    barcode: '6291001001006',
    category: 'خضار',
    salesPrice: 0.85,
    purchasePrice: 0.55,
    stockMain: 150,
    groupCode: 'MARKET-PRODUCE',
    categoryCode: 'MARKET-PRODUCE',
    itemImageUrl:
      'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=480&h=360&q=80',
    unitOfMeasure: 'KG',
    sellByWeight: true,
    minSalesQuantity: 0.25,
    favorite: true,
  },
  {
    id: 'MKT-ITEM-007',
    code: 'MKT-007',
    name: 'صدر دجاج مجمد',
    description: 'Frozen chicken breast 1kg',
    barcode: '6291001001007',
    category: 'لحوم',
    salesPrice: 3.9,
    purchasePrice: 3.0,
    stockMain: 70,
    groupCode: 'MARKET-MEAT',
    categoryCode: 'MARKET-MEAT',
    itemImageUrl:
      'https://images.unsplash.com/photo-1604503468506-a8da358d2141?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-008',
    code: 'MKT-008',
    name: 'مياه معدنية ١.٥ لتر',
    description: 'Mineral water 1.5L',
    barcode: '6291001001008',
    category: 'مشروبات',
    salesPrice: 0.35,
    purchasePrice: 0.18,
    stockMain: 300,
    groupCode: 'MARKET-BEVERAGES',
    categoryCode: 'MARKET-BEVERAGES',
    itemImageUrl:
      'https://images.unsplash.com/photo-1548839140-29a7492991bd?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-009',
    code: 'MKT-009',
    name: 'قهوة تركية ٢٠٠ غ',
    description: 'Turkish coffee 200g',
    barcode: '6291001001009',
    category: 'مشروبات',
    salesPrice: 2.4,
    purchasePrice: 1.7,
    stockMain: 55,
    groupCode: 'MARKET-BEVERAGES',
    categoryCode: 'MARKET-BEVERAGES',
    itemImageUrl:
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-010',
    code: 'MKT-010',
    name: 'شيبس بطاطا',
    description: 'Potato chips family pack',
    barcode: '6291001001010',
    category: 'سناكات',
    salesPrice: 1.1,
    purchasePrice: 0.75,
    stockMain: 90,
    groupCode: 'MARKET-SNACKS',
    categoryCode: 'MARKET-SNACKS',
    itemImageUrl:
      'https://images.unsplash.com/photo-1566478989037-eec170dfc792?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-011',
    code: 'MKT-011',
    name: 'صابون سائل لليدين',
    description: 'Liquid hand soap',
    barcode: '6291001001011',
    category: 'منظفات',
    salesPrice: 1.85,
    purchasePrice: 1.2,
    stockMain: 40,
    groupCode: 'MARKET-HOUSEHOLD',
    categoryCode: 'MARKET-HOUSEHOLD',
    itemImageUrl:
      'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=480&h=360&q=80',
  },
  {
    id: 'MKT-ITEM-012',
    code: 'MKT-012',
    name: 'مسحوق غسيل ٣ كغ',
    description: 'Laundry detergent 3kg',
    barcode: '6291001001012',
    category: 'منظفات',
    salesPrice: 5.75,
    purchasePrice: 4.4,
    stockMain: 35,
    groupCode: 'MARKET-HOUSEHOLD',
    categoryCode: 'MARKET-HOUSEHOLD',
    itemImageUrl:
      'https://images.unsplash.com/photo-1585421514738-01798e06a507?auto=format&fit=crop&w=480&h=360&q=80',
  },
];

const MARKET_GROUPS = [
  { id: 'GRP-MARKET-GROCERY', code: 'MARKET-GROCERY', name: 'بقالة', description: 'Market grocery' },
  { id: 'GRP-MARKET-DAIRY', code: 'MARKET-DAIRY', name: 'ألبان', description: 'Market dairy' },
  { id: 'GRP-MARKET-BAKERY', code: 'MARKET-BAKERY', name: 'مخبوزات', description: 'Market bakery' },
  { id: 'GRP-MARKET-PRODUCE', code: 'MARKET-PRODUCE', name: 'خضار وفواكه', description: 'Market produce' },
  { id: 'GRP-MARKET-MEAT', code: 'MARKET-MEAT', name: 'لحوم', description: 'Market meat' },
  { id: 'GRP-MARKET-BEVERAGES', code: 'MARKET-BEVERAGES', name: 'مشروبات', description: 'Market beverages' },
  { id: 'GRP-MARKET-SNACKS', code: 'MARKET-SNACKS', name: 'سناكات', description: 'Market snacks' },
  { id: 'GRP-MARKET-HOUSEHOLD', code: 'MARKET-HOUSEHOLD', name: 'منظفات', description: 'Market household' },
] as const;

export async function seedPosMarketDemo(
  prisma: PrismaClient,
  options: { adminUserId: string },
) {
  console.log('Seeding market POS demo products...');

  for (const group of MARKET_GROUPS) {
    await prisma.inventoryItemGroup.upsert({
      where: { code: group.code },
      update: {
        name: group.name,
        description: group.description,
        isActive: true,
      },
      create: {
        id: group.id,
        code: group.code,
        name: group.name,
        description: group.description,
        isActive: true,
      },
    });
  }

  const groups = await prisma.inventoryItemGroup.findMany({
    where: { code: { startsWith: 'MARKET-' } },
    select: { id: true, code: true },
  });
  const groupIdByCode = new Map(groups.map((group) => [group.code, group.id]));

  for (const group of MARKET_GROUPS) {
    const groupId = groupIdByCode.get(group.code);
    if (!groupId) {
      continue;
    }
    await prisma.inventoryItemCategory.upsert({
      where: { code: group.code },
      update: {
        name: group.name,
        description: group.description,
        itemGroupId: groupId,
        isActive: true,
      },
      create: {
        id: `CAT-${group.code}`,
        code: group.code,
        name: group.name,
        description: group.description,
        itemGroupId: groupId,
        isActive: true,
      },
    });
  }

  const [
    inventoryAccount,
    salesAccount,
    operatingExpenses,
    tradeReceivableAccount,
    taxableTreatment,
    vat16,
    mainWarehouse,
  ] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '1131001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '4110001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '5100000' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '1121001' } }),
    prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT16' } }),
    prisma.inventoryWarehouse.findUniqueOrThrow({ where: { code: 'WH-MAIN' } }),
  ]);

  const marketRepNorth = await prisma.salesRepresentative.upsert({
    where: { code: 'REP-MARKET-01' },
    update: {
      name: 'مندوب الشمال / North Market Rep',
      phone: '+962 79 200 0001',
      status: 'ACTIVE',
    },
    create: {
      code: 'REP-MARKET-01',
      name: 'مندوب الشمال / North Market Rep',
      phone: '+962 79 200 0001',
      status: 'ACTIVE',
    },
  });

  const marketRepCentral = await prisma.salesRepresentative.upsert({
    where: { code: 'REP-MARKET-02' },
    update: {
      name: 'مندوب الوسط / Central Market Rep',
      phone: '+962 79 200 0002',
      status: 'ACTIVE',
    },
    create: {
      code: 'REP-MARKET-02',
      name: 'مندوب الوسط / Central Market Rep',
      phone: '+962 79 200 0002',
      status: 'ACTIVE',
    },
  });

  const MARKET_DESTINATION_CUSTOMERS = [
    {
      code: 'MKT-AMMAN-01',
      name: 'سوق عمان الشمال / Amman North Market',
      contactInfo: '+962 79 100 0001',
      salesRepId: marketRepNorth.id,
    },
    {
      code: 'MKT-IRBID-02',
      name: 'سوق إربد / Irbid Market',
      contactInfo: '+962 79 100 0002',
      salesRepId: marketRepNorth.id,
    },
    {
      code: 'MKT-ZARQA-03',
      name: 'سوق الزرقاء / Zarqa Market',
      contactInfo: '+962 79 100 0003',
      salesRepId: marketRepCentral.id,
    },
  ] as const;

  for (const marketCustomer of MARKET_DESTINATION_CUSTOMERS) {
    await prisma.customer.upsert({
      where: { code: marketCustomer.code },
      update: {
        name: marketCustomer.name,
        contactInfo: marketCustomer.contactInfo,
        salesRepId: marketCustomer.salesRepId,
        salesRepresentative: marketCustomer.salesRepId === marketRepNorth.id
          ? marketRepNorth.name
          : marketRepCentral.name,
        isActive: true,
        taxTreatmentId: taxableTreatment.id,
      },
      create: {
        code: marketCustomer.code,
        name: marketCustomer.name,
        contactInfo: marketCustomer.contactInfo,
        salesRepId: marketCustomer.salesRepId,
        salesRepresentative: marketCustomer.salesRepId === marketRepNorth.id
          ? marketRepNorth.name
          : marketRepCentral.name,
        taxTreatmentId: taxableTreatment.id,
        creditLimit: new Prisma.Decimal(1000),
        receivableAccountId: tradeReceivableAccount.id,
        isActive: true,
      },
    });
  }

  await seedMarketRepUser(prisma, marketRepNorth.id);

  let cogsAccount = await prisma.account.findUnique({ where: { code: '5130001' } });
  if (!cogsAccount) {
    cogsAccount = await prisma.account.create({
      data: {
        code: '5130001',
        name: 'Cost of Goods Sold',
        nameAr: 'تكلفة البضاعة المباعة',
        type: 'EXPENSE',
        subtype: 'Expense',
        isPosting: true,
        isActive: true,
        parentAccountId: operatingExpenses.id,
        createdById: options.adminUserId,
      },
    });
  }

  const units = await prisma.inventoryUnitOfMeasure.findMany();
  const getUnit = (code: string) =>
    units.find((unit) => unit.code === code) ?? units.find((unit) => unit.code === 'PCS')!;

  const stockWarehouses = await prisma.inventoryWarehouse.findMany({
    where: { isActive: true, isTransit: false },
    orderBy: { code: 'asc' },
  });

  let created = 0;

  for (const product of MARKET_PRODUCTS) {
    const unit = getUnit(product.unitOfMeasure ?? 'PCS');
    const sellByWeight = product.sellByWeight ?? unit.code === 'KG';
    const minSalesQty = product.minSalesQuantity ?? (sellByWeight ? 0.001 : 1);
    const totalValue = product.stockMain * product.purchasePrice;
    const totalOnHand = product.stockMain * stockWarehouses.length;
    const totalValuation = totalValue * stockWarehouses.length;

    const item = await prisma.inventoryItem.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        category: product.category,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: groupIdByCode.get(product.groupCode) ?? null,
        itemCategoryId: (
          await prisma.inventoryItemCategory.findUnique({
            where: { code: product.categoryCode },
            select: { id: true },
          })
        )?.id,
        type: InventoryItemType.FINISHED_GOOD,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        itemImageUrl: product.itemImageUrl,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(product.purchasePrice),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory: true,
        reorderLevel: new Prisma.Decimal(10),
        reorderQuantity: new Prisma.Decimal(20),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: new Prisma.Decimal(totalOnHand),
        valuationAmount: new Prisma.Decimal(totalValuation),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(minSalesQty),
      },
      create: {
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        category: product.category,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: groupIdByCode.get(product.groupCode) ?? null,
        itemCategoryId: (
          await prisma.inventoryItemCategory.findUnique({
            where: { code: product.categoryCode },
            select: { id: true },
          })
        )?.id,
        type: InventoryItemType.FINISHED_GOOD,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        itemImageUrl: product.itemImageUrl,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(product.purchasePrice),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory: true,
        reorderLevel: new Prisma.Decimal(10),
        reorderQuantity: new Prisma.Decimal(20),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: new Prisma.Decimal(totalOnHand),
        valuationAmount: new Prisma.Decimal(totalValuation),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(minSalesQty),
      },
    });

    for (const warehouse of stockWarehouses) {
      await prisma.inventoryWarehouseBalance.upsert({
        where: {
          itemId_warehouseId: {
            itemId: item.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          onHandQuantity: new Prisma.Decimal(product.stockMain),
          valuationAmount: new Prisma.Decimal(totalValue),
        },
        create: {
          itemId: item.id,
          warehouseId: warehouse.id,
          onHandQuantity: new Prisma.Decimal(product.stockMain),
          valuationAmount: new Prisma.Decimal(totalValue),
        },
      });
    }

    created += 1;
  }

  await seedRepCarStockDemo(prisma, marketRepNorth.id, mainWarehouse.id);

  console.log(
    `Market POS demo: ${created} products with online images (codes MKT-*) and ${MARKET_DESTINATION_CUSTOMERS.length} destination markets.`,
  );
}

async function seedRepCarStockDemo(
  prisma: PrismaClient,
  salesRepId: string,
  warehouseId: string,
) {
  const item = await prisma.inventoryItem.findUnique({
    where: { code: 'MKT-001' },
    select: { id: true, unitOfMeasure: true, onHandQuantity: true, valuationAmount: true },
  });
  if (!item) {
    return;
  }

  const existing = await prisma.repCarLoad.findUnique({
    where: { reference: 'RCL-DEMO-01' },
  });
  if (existing?.status === RepCarLoadStatus.POSTED) {
    return;
  }

  const quantity = new Prisma.Decimal(50);
  const balance = await prisma.inventoryWarehouseBalance.findUnique({
    where: { itemId_warehouseId: { itemId: item.id, warehouseId } },
  });
  const whQty = balance?.onHandQuantity ?? new Prisma.Decimal(0);
  const whVal = balance?.valuationAmount ?? new Prisma.Decimal(0);
  const unitCost = whQty.gt(0) ? whVal.div(whQty) : new Prisma.Decimal(0.85);
  const lineTotal = unitCost.mul(quantity);

  await prisma.$transaction(async (tx) => {
    const load = await tx.repCarLoad.upsert({
      where: { reference: 'RCL-DEMO-01' },
      update: {},
      create: {
        reference: 'RCL-DEMO-01',
        status: RepCarLoadStatus.POSTED,
        loadDate: new Date(),
        warehouseId,
        salesRepId,
        description: 'Demo rep car load for market_rep register',
        totalQuantity: quantity,
        totalAmount: lineTotal,
        postedAt: new Date(),
        lines: {
          create: {
            lineNumber: 1,
            itemId: item.id,
            quantity,
            unitCost,
            unitOfMeasure: item.unitOfMeasure,
            lineTotalAmount: lineTotal,
          },
        },
      },
      include: { lines: true },
    });

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        onHandQuantity: { decrement: quantity },
        valuationAmount: { decrement: lineTotal },
      },
    });

    const warehouseBalance = await tx.inventoryWarehouseBalance.upsert({
      where: { itemId_warehouseId: { itemId: item.id, warehouseId } },
      create: {
        itemId: item.id,
        warehouseId,
        onHandQuantity: whQty.sub(quantity),
        valuationAmount: whVal.sub(lineTotal),
      },
      update: {
        onHandQuantity: { decrement: quantity },
        valuationAmount: { decrement: lineTotal },
      },
    });

    await tx.inventoryStockMovement.create({
      data: {
        movementType: InventoryStockMovementType.REP_CAR_LOAD,
        transactionType: 'RepCarLoad',
        transactionId: load.id,
        transactionLineId: load.lines[0]?.id,
        transactionReference: load.reference,
        transactionDate: load.loadDate,
        itemId: item.id,
        warehouseId,
        quantityOut: quantity,
        unitCost,
        valueOut: lineTotal,
        balanceId: warehouseBalance.id,
        runningQuantity: warehouseBalance.onHandQuantity,
        runningValuation: warehouseBalance.valuationAmount,
      },
    });

    await tx.repCarStockBalance.upsert({
      where: { salesRepId_itemId: { salesRepId, itemId: item.id } },
      create: {
        salesRepId,
        itemId: item.id,
        onHandQuantity: quantity,
        valuationAmount: lineTotal,
      },
      update: {
        onHandQuantity: quantity,
        valuationAmount: lineTotal,
      },
    });

    await tx.repCarStockMovement.create({
      data: {
        movementType: RepCarStockMovementType.LOAD_IN,
        transactionType: 'RepCarLoad',
        transactionId: load.id,
        transactionLineId: load.lines[0]?.id,
        transactionReference: load.reference,
        transactionDate: load.loadDate,
        salesRepId,
        itemId: item.id,
        quantityIn: quantity,
        unitCost,
        valueIn: lineTotal,
        runningQuantity: quantity,
        runningValuation: lineTotal,
      },
    });
  });

  console.log('Demo rep car load RCL-DEMO-01: 50 x MKT-001 on REP-MARKET-01');
}

const marketRepPermissionCodes: PosPermissionCode[] = [
  'POS_OPEN_SESSION',
  'POS_CLOSE_OWN_SESSION',
  'POS_VIEW_POS_SCREEN',
  'POS_SCAN_BARCODE',
  'POS_SEARCH_ITEM',
  'POS_ADD_ITEM_TO_CART',
  'POS_UPDATE_ITEM_QUANTITY',
  'POS_REMOVE_ITEM_FROM_CART',
  'POS_HOLD_SALE',
  'POS_RESUME_OWN_HELD_SALE',
  'POS_VOID_DRAFT_SALE',
  'POS_COMPLETE_SALE',
  'POS_SELECT_PAYMENT_METHOD',
  'POS_PRINT_RECEIPT',
  'POS_VIEW_OWN_SESSION_REPORT',
  'POS_VIEW_COMPLETED_SALES',
  'POS_CHANGE_UNIT_PRICE',
  'POS_CREDIT_SALE',
  'POS_MARKET_VIEW_RECEIVABLES',
  'POS_MARKET_COLLECT_RECEIVABLE',
];

async function seedMarketRepUser(prisma: PrismaClient, salesRepId: string) {
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosAccessRoleCode" ADD VALUE IF NOT EXISTS 'MARKET_REP'`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_VIEW_RECEIVABLES'`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_COLLECT_RECEIVABLE'`,
  );

  await prisma.$transaction(async (tx) => {
    const marketRepRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.MARKET_REP },
      update: {
        name: 'Market Sales Rep',
        description:
          'Market field sales rep — sell on credit and collect receivables for assigned destination markets.',
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.MARKET_REP,
        name: 'Market Sales Rep',
        description:
          'Market field sales rep — sell on credit and collect receivables for assigned destination markets.',
        isActive: true,
      },
    });

    for (const code of marketRepPermissionCodes) {
      const permission = await tx.posPermission.upsert({
        where: { code },
        update: { name: code, description: code },
        create: { code, name: code, description: code },
      });
      await tx.posAccessRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: marketRepRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: marketRepRole.id,
          permissionId: permission.id,
        },
      });
    }

    const hashedPassword = await bcrypt.hash('market123', 10);
    const marketRepUser = await tx.user.upsert({
      where: { username: 'market_rep' },
      update: {
        email: 'market_rep@genius.com',
        password: hashedPassword,
        name: 'Market Sales Rep',
        salesRepId,
        isActive: true,
        role: 'USER',
      },
      create: {
        username: 'market_rep',
        email: 'market_rep@genius.com',
        password: hashedPassword,
        name: 'Market Sales Rep',
        salesRepId,
        isActive: true,
        role: 'USER',
      },
    });

    await tx.userPosAccessRole.deleteMany({ where: { userId: marketRepUser.id } });
    await tx.userPosAccessRole.create({
      data: {
        userId: marketRepUser.id,
        roleId: marketRepRole.id,
      },
    });
  });

  console.log('Market rep user ready: market_rep / market123 (default route /pos-market/receivables)');
}

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma');
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });
    if (!admin) {
      throw new Error('Admin user not found. Run the main seed first.');
    }
    await seedPosMarketDemo(prisma, { adminUserId: admin.id });
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
