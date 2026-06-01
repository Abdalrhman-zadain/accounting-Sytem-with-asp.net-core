import {
  InventoryItemType,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma';

type PosProductSeed = {
  code: string;
  name: string;
  barcode?: string;
  category: string;
  salesPrice: number;
  purchasePrice: number;
  stockMain: number;
  stockBranch?: number;
  type?: InventoryItemType;
  trackInventory?: boolean;
  reorderLevel?: number;
  groupCode: string;
  categoryCode: string;
  favorite?: boolean;
  itemImageUrl?: string;
};

const POS_PRODUCTS: PosProductSeed[] = [
  {
    code: 'POS-DRK-001',
    name: 'Cola 330ml / كولا',
    barcode: '6291000000001',
    category: 'Drinks / مشروبات',
    salesPrice: 0.75,
    purchasePrice: 0.35,
    stockMain: 120,
    stockBranch: 24,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    favorite: true,
    itemImageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-DRK-002',
    name: 'Mineral Water 500ml / ماء',
    barcode: '6291000000002',
    category: 'Drinks / مشروبات',
    salesPrice: 0.35,
    purchasePrice: 0.12,
    stockMain: 200,
    stockBranch: 40,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    favorite: true,
    itemImageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-DRK-003',
    name: 'Orange Juice / عصير برتقال',
    barcode: '6291000000003',
    category: 'Drinks / مشروبات',
    salesPrice: 1.5,
    purchasePrice: 0.8,
    stockMain: 48,
    stockBranch: 12,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    favorite: true,
    itemImageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-FOD-001',
    name: 'Chicken Sandwich / ساندwich',
    barcode: '6292000000001',
    category: 'Food / طعام',
    salesPrice: 2.5,
    purchasePrice: 1.2,
    stockMain: 30,
    stockBranch: 8,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-FOD-002',
    name: 'Potato Chips / شيبس',
    barcode: '6292000000002',
    category: 'Food / طعام',
    salesPrice: 1.0,
    purchasePrice: 0.45,
    stockMain: 80,
    stockBranch: 15,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1566478989037-eee170a4176d?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-FOD-003',
    name: 'Chocolate Bar / شوكolate',
    barcode: '6292000000003',
    category: 'Food / طعام',
    salesPrice: 1.25,
    purchasePrice: 0.55,
    stockMain: 60,
    stockBranch: 10,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-SRV-001',
    name: 'Delivery Fee / رسوم توصيل',
    barcode: '6293000000001',
    category: 'Services / خدمات',
    salesPrice: 1.0,
    purchasePrice: 0,
    stockMain: 0,
    type: InventoryItemType.SERVICE,
    trackInventory: false,
    groupCode: 'SERVICES',
    categoryCode: 'SERVICE_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-SRV-002',
    name: 'Gift Wrap / تغليف هدية',
    barcode: '6293000000002',
    category: 'Services / خدمات',
    salesPrice: 0.5,
    purchasePrice: 0,
    stockMain: 0,
    type: InventoryItemType.SERVICE,
    trackInventory: false,
    groupCode: 'SERVICES',
    categoryCode: 'SERVICE_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop',
  },
  {
    code: 'OFFER-SUMMER',
    name: 'Summer Promo Bundle / عرض صيفي',
    barcode: '6294000000001',
    category: 'Offers / عروض',
    salesPrice: 4.99,
    purchasePrice: 2.5,
    stockMain: 25,
    stockBranch: 5,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
  },
  {
    code: 'POS-DRK-004',
    name: 'Energy Drink / مشروب طاقة',
    barcode: '6291000000004',
    category: 'Drinks / مشروبات',
    salesPrice: 1.75,
    purchasePrice: 0.9,
    stockMain: 3,
    stockBranch: 0,
    reorderLevel: 5,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    itemImageUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=400&fit=crop',
  },
  {
    code: 'TEST-SCAN-01',
    name: 'Camera Test Product / منتج تجريبي',
    barcode: '76149276',
    category: 'Other / أخرى',
    salesPrice: 9.99,
    purchasePrice: 4.5,
    stockMain: 100,
    groupCode: 'FINISHED',
    categoryCode: 'FINISHED_GENERAL',
    favorite: true,
    itemImageUrl: '/test-product-croissant.png',
  },
];

export async function seedPosRegisterDemo(
  prisma: PrismaClient,
  options: { adminUserId: string; cashierUserId: string },
) {
  console.log('Seeding POS register demo (warehouses, products, customers)...');

  const [
    inventoryAccount,
    salesAccount,
    operatingExpenses,
    tradeReceivableAccount,
    taxableTreatment,
    vat16,
    pcsUnit,
    serviceUnit,
  ] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '1131001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '4110001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '5100000' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '1121001' } }),
    prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT16' } }),
    prisma.inventoryUnitOfMeasure.findUniqueOrThrow({ where: { code: 'PCS' } }),
    prisma.inventoryUnitOfMeasure.findUniqueOrThrow({ where: { code: 'SERVICE' } }),
  ]);

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

  const mainWarehouse = await prisma.inventoryWarehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {
      name: 'Main Store — Amman / المخزن الرئيسي',
      address: 'Amman HQ',
      isActive: true,
      isTransit: false,
    },
    create: {
      code: 'WH-MAIN',
      name: 'Main Store — Amman / المخزن الرئيسي',
      address: 'Amman HQ',
      responsiblePerson: 'Store Manager',
      isActive: true,
      isTransit: false,
    },
  });

  const branchWarehouse = await prisma.inventoryWarehouse.upsert({
    where: { code: 'WH-IRB' },
    update: {
      name: 'Irbid Branch Store / فرع إربد',
      address: 'Irbid Branch',
      isActive: true,
      isTransit: false,
    },
    create: {
      code: 'WH-IRB',
      name: 'Irbid Branch Store / فرع إربد',
      address: 'Irbid Branch',
      responsiblePerson: 'Branch Manager',
      isActive: true,
      isTransit: false,
    },
  });

  const itemGroups = await prisma.inventoryItemGroup.findMany({
    select: { id: true, code: true },
  });
  const itemCategories = await prisma.inventoryItemCategory.findMany({
    select: { id: true, code: true, itemGroupId: true },
  });
  const groupId = (code: string) =>
    itemGroups.find((row) => row.code === code)?.id ?? '';
  const categoryId = (code: string) =>
    itemCategories.find((row) => row.code === code)?.id ?? '';

  const favoriteItemIds: string[] = [];

  for (const product of POS_PRODUCTS) {
    const trackInventory = product.trackInventory ?? product.type !== InventoryItemType.SERVICE;
    const itemType = product.type ?? InventoryItemType.FINISHED_GOOD;
    const unit = itemType === InventoryItemType.SERVICE ? serviceUnit : pcsUnit;
    const purchasePrice = product.purchasePrice;
    const totalStock =
      product.stockMain + (product.stockBranch ?? 0);
    const totalValue = totalStock * purchasePrice;

    const item = await prisma.inventoryItem.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        description: product.category,
        barcode: product.barcode ?? null,
        category: product.category,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: groupId(product.groupCode) || null,
        itemCategoryId: categoryId(product.categoryCode) || null,
        type: itemType,
        inventoryAccountId: trackInventory ? inventoryAccount.id : null,
        cogsAccountId: trackInventory ? cogsAccount.id : null,
        salesAccountId: salesAccount.id,
        itemImageUrl: product.itemImageUrl ?? null,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(purchasePrice),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory,
        reorderLevel: new Prisma.Decimal(product.reorderLevel ?? 5),
        reorderQuantity: new Prisma.Decimal(10),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: trackInventory ? new Prisma.Decimal(totalStock) : new Prisma.Decimal(0),
        valuationAmount: trackInventory ? new Prisma.Decimal(totalValue) : new Prisma.Decimal(0),
      },
      create: {
        code: product.code,
        name: product.name,
        description: product.category,
        barcode: product.barcode ?? null,
        category: product.category,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: groupId(product.groupCode) || null,
        itemCategoryId: categoryId(product.categoryCode) || null,
        type: itemType,
        inventoryAccountId: trackInventory ? inventoryAccount.id : null,
        cogsAccountId: trackInventory ? cogsAccount.id : null,
        salesAccountId: salesAccount.id,
        itemImageUrl: product.itemImageUrl ?? null,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(purchasePrice),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory,
        reorderLevel: new Prisma.Decimal(product.reorderLevel ?? 5),
        reorderQuantity: new Prisma.Decimal(10),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: trackInventory ? new Prisma.Decimal(totalStock) : new Prisma.Decimal(0),
        valuationAmount: trackInventory ? new Prisma.Decimal(totalValue) : new Prisma.Decimal(0),
      },
    });

    if (product.favorite) {
      favoriteItemIds.push(item.id);
    }

    if (!trackInventory) {
      continue;
    }

    const upsertBalance = async (
      warehouseId: string,
      quantity: number,
    ) => {
      if (quantity <= 0) {
        return;
      }
      const value = quantity * purchasePrice;
      await prisma.inventoryWarehouseBalance.upsert({
        where: {
          itemId_warehouseId: {
            itemId: item.id,
            warehouseId,
          },
        },
        update: {
          onHandQuantity: new Prisma.Decimal(quantity),
          valuationAmount: new Prisma.Decimal(value),
        },
        create: {
          itemId: item.id,
          warehouseId,
          onHandQuantity: new Prisma.Decimal(quantity),
          valuationAmount: new Prisma.Decimal(value),
        },
      });
    };

    await upsertBalance(mainWarehouse.id, product.stockMain);
    if (product.stockBranch && product.stockBranch > 0) {
      await upsertBalance(branchWarehouse.id, product.stockBranch);
    }
  }

  const walkInCustomer = await prisma.customer.upsert({
    where: { code: 'POS-WALKIN' },
    update: {
      name: 'POS Walk-in Customer / زبون عابر',
      isActive: true,
      taxTreatmentId: taxableTreatment.id,
    },
    create: {
      code: 'POS-WALKIN',
      name: 'POS Walk-in Customer / زبون عابر',
      taxTreatmentId: taxableTreatment.id,
      creditLimit: 0,
      receivableAccountId: tradeReceivableAccount.id,
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { code: 'CUS-DEMO-01' },
    update: {
      name: 'Ahmed Ali / أحمد علي',
      isActive: true,
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(500),
    },
    create: {
      code: 'CUS-DEMO-01',
      name: 'Ahmed Ali / أحمد علي',
      contactInfo: '+962 79 000 0001',
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(500),
      receivableAccountId: tradeReceivableAccount.id,
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { code: 'CUS-DEMO-02' },
    update: {
      name: 'Sara Market / سارة ماركت',
      isActive: true,
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(2000),
    },
    create: {
      code: 'CUS-DEMO-02',
      name: 'Sara Market / سارة ماركت',
      contactInfo: 'Wholesale customer demo',
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(2000),
      receivableAccountId: tradeReceivableAccount.id,
      isActive: true,
    },
  });

  // --- RESTAURANT POS SEEDING ---
  
  // Helper to create accounts if missing
  const createAccountIfMissing = async (
    code: string,
    name: string,
    nameAr: string,
    type: string,
    subtype: string,
    parentId: string,
  ) => {
    let acc = await prisma.account.findUnique({ where: { code } });
    if (!acc) {
      acc = await prisma.account.create({
        data: {
          code,
          name,
          nameAr,
          type: type as any,
          subtype,
          isPosting: true,
          isActive: true,
          parentAccountId: parentId,
          createdById: options.adminUserId,
        },
      });
    }
    return acc;
  };

  // Find parent accounts for classification
  const tradeReceivablesParent = await prisma.account.findUniqueOrThrow({
    where: { code: '1121000' },
  });

  
  const talabatAcc = await createAccountIfMissing(
    '1121002',
    'Talabat Receivable',
    'ذمم طلبات',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
  );
  const careemAcc = await createAccountIfMissing(
    '1121003',
    'Careem Receivable',
    'ذمم كريم',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
  );
  const jahezAcc = await createAccountIfMissing(
    '1121004',
    'Jahez Receivable',
    'ذمم جاهز',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
  );
  const commissionAcc = await createAccountIfMissing(
    '5100003',
    'Delivery Commission Expense',
    'مصروف عمولات التوصيل',
    'EXPENSE',
    'Expense',
    operatingExpenses.id,
  );

  // Create/Upsert Delivery Companies
  const deliveryCompanies = [
    {
      id: 'dc_talabat',
      name: 'Talabat',
      arabicName: 'طلبات',
      receivableAccountId: talabatAcc.id,
      commissionRate: 15.00,
      commissionAccountId: commissionAcc.id,
    },
    {
      id: 'dc_careem',
      name: 'Careem',
      arabicName: 'كريم',
      receivableAccountId: careemAcc.id,
      commissionRate: 12.00,
      commissionAccountId: commissionAcc.id,
    },
    {
      id: 'dc_jahez',
      name: 'Jahez',
      arabicName: 'جاهز',
      receivableAccountId: jahezAcc.id,
      commissionRate: 18.00,
      commissionAccountId: commissionAcc.id,
    },
  ];

  for (const dc of deliveryCompanies) {
    await prisma.deliveryCompany.upsert({
      where: { name: dc.name },
      update: {
        arabicName: dc.arabicName,
        receivableAccountId: dc.receivableAccountId,
        commissionRate: new Prisma.Decimal(dc.commissionRate),
        commissionAccountId: dc.commissionAccountId,
        isActive: true,
      },
      create: {
        id: dc.id,
        name: dc.name,
        arabicName: dc.arabicName,
        receivableAccountId: dc.receivableAccountId,
        commissionRate: new Prisma.Decimal(dc.commissionRate),
        commissionAccountId: dc.commissionAccountId,
        isActive: true,
      },
    });
  }

  // Create standard restaurant Tables
  const restaurantTables = [
    { tableNumber: 'T1', capacity: 2 },
    { tableNumber: 'T2', capacity: 4 },
    { tableNumber: 'T3', capacity: 4 },
    { tableNumber: 'T4', capacity: 6 },
    { tableNumber: 'T5', capacity: 8 },
    { tableNumber: 'T6', capacity: 2 },
  ];

  for (const tbl of restaurantTables) {
    await prisma.posTable.upsert({
      where: { tableNumber: tbl.tableNumber },
      update: {
        capacity: tbl.capacity,
        status: 'AVAILABLE',
      },
      create: {
        tableNumber: tbl.tableNumber,
        capacity: tbl.capacity,
        status: 'AVAILABLE',
      },
    });
  }

  // Create Delivery Drivers
  const deliveryDrivers = [
    { id: 'drv_samer', name: 'Samer Jaber / سامر جابر', phone: '+962790000010' },
    { id: 'drv_tareq', name: 'Tareq Omar / طارق عمر', phone: '+962790000011' },
  ];

  for (const drv of deliveryDrivers) {
    await prisma.deliveryDriver.upsert({
      where: { id: drv.id },
      update: {
        name: drv.name,
        phone: drv.phone,
        isActive: true,
      },
      create: {
        id: drv.id,
        name: drv.name,
        phone: drv.phone,
        isActive: true,
      },
    });
  }

  // -------------------------------------


  for (const itemId of favoriteItemIds) {
    try {
      await prisma.posUserFavoriteItem.upsert({
        where: {
          userId_itemId: {
            userId: options.cashierUserId,
            itemId,
          },
        },
        update: {},
        create: {
          userId: options.cashierUserId,
          itemId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('PosUserFavoriteItem')) {
        console.warn(
          'Skipping cashier favorites (PosUserFavoriteItem table missing — apply latest POS migration).',
        );
        break;
      }
      throw error;
    }
  }

  console.log(
    `POS register demo ready: ${POS_PRODUCTS.length} products, warehouses ${mainWarehouse.code}/${branchWarehouse.code}, customers including ${walkInCustomer.code}.`,
  );
  console.log('Cashier login: cashier / cashier123 — open shift, pick WH-MAIN, scan barcodes 6291000000001 etc.');
}
