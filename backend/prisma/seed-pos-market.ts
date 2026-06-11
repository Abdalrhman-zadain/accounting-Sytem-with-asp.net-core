import {
  InventoryStockMovementType,
  PosAccessRoleCode,
  PosPermissionCode,
  Prisma,
  PrismaClient,
  RepCarLoadStatus,
  RepCarStockMovementType,
} from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

import { seedShouqCatalog, SHOUQ_CODE_PREFIX } from './seed-shouq-catalog';

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
  console.log('Seeding market POS (Shouq catalog, destination markets, reps)...');

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

  const [operatingExpenses, tradeReceivableAccount, taxableTreatment, mainWarehouse] =
    await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { code: '5100000' } }),
      prisma.account.findUniqueOrThrow({ where: { code: '1121001' } }),
      prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } }),
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

  const catalog = await seedShouqCatalog(prisma, { adminUserId: options.adminUserId });

  const repLoadItemCode =
    catalog.rows.find((row) => row.quantity > 0)?.code ?? `${SHOUQ_CODE_PREFIX}001`;

  await seedRepCarStockDemo(prisma, marketRepNorth.id, mainWarehouse.id, repLoadItemCode);

  console.log(
    `Market POS: ${catalog.created + catalog.updated} Shouq products (codes ${SHOUQ_CODE_PREFIX}*) and ${MARKET_DESTINATION_CUSTOMERS.length} destination markets.`,
  );
}

async function seedRepCarStockDemo(
  prisma: PrismaClient,
  salesRepId: string,
  warehouseId: string,
  itemCode: string,
) {
  const item = await prisma.inventoryItem.findUnique({
    where: { code: itemCode },
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

  console.log(`Demo rep car load RCL-DEMO-01: 50 x ${itemCode} on REP-MARKET-01`);
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
