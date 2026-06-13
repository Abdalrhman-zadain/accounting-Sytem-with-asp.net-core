import { Prisma, PrismaClient } from '../src/generated/prisma';
import { seedPosAddons } from './seed-pos-addons';

type PosProductSeed = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  barcode?: string;
  category: string;
  salesPrice: number;
  purchasePrice: number;
  stockMain: number;
  stockBranch?: number;
  trackInventory?: boolean;
  reorderLevel?: number;
  groupCode: string;
  categoryCode: string;
  favorite?: boolean;
  itemImageUrl?: string;
  unitOfMeasure?: string;
  /** When true, POS prompts for weight; defaults from KG base unit if omitted. */
  sellByWeight?: boolean;
  /** Minimum weight per sale when sell-by-weight is enabled (e.g. 0.25 kg). */
  minSalesQuantity?: number;
};

const POS_PRODUCTS: PosProductSeed[] = [];

export async function seedPosRegisterDemo(
  prisma: PrismaClient,
  options: { adminUserId: string; cashierUserId: string },
) {
  console.log('Seeding POS register demo (customers, cashier favorites, add-ons)...');

  const [operatingExpenses, tradeReceivableAccount, taxableTreatment] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '5100000' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '1121001' } }),
    prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } }),
  ]);

  const favoriteItemIds: string[] = [];

  for (const product of POS_PRODUCTS) {
    if (product.favorite && product.id) {
      favoriteItemIds.push(product.id);
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
    'Ashyaai Receivable',
    'ذمم أشيائي',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
  );
  const commissionAcc = await createAccountIfMissing(
    '5100013',
    'Delivery Commission Expense',
    'مصروف عمولات التوصيل',
    'EXPENSE',
    'Expense',
    operatingExpenses.id,
  );
  const serviceFeeAcc = await createAccountIfMissing(
    '5100014',
    'Delivery Service Fees Expense',
    'مصروف رسوم خدمات التوصيل',
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
      serviceFeeAccountId: serviceFeeAcc.id,
    },
    {
      id: 'dc_careem',
      name: 'Careem',
      arabicName: 'كريم',
      receivableAccountId: careemAcc.id,
      commissionRate: 12.00,
      commissionAccountId: commissionAcc.id,
      serviceFeeAccountId: serviceFeeAcc.id,
    },
    {
      id: 'dc_ashyaai',
      name: 'Ashyaai',
      arabicName: 'أشيائي',
      receivableAccountId: jahezAcc.id,
      commissionRate: 18.00,
      commissionAccountId: commissionAcc.id,
      serviceFeeAccountId: serviceFeeAcc.id,
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
        serviceFeeAccountId: dc.serviceFeeAccountId,
        isActive: true,
      },
      create: {
        id: dc.id,
        name: dc.name,
        arabicName: dc.arabicName,
        receivableAccountId: dc.receivableAccountId,
        commissionRate: new Prisma.Decimal(dc.commissionRate),
        commissionAccountId: dc.commissionAccountId,
        serviceFeeAccountId: dc.serviceFeeAccountId,
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
    { tableNumber: 'T7', capacity: 4 },
    { tableNumber: 'T8', capacity: 4 },
    { tableNumber: 'T9', capacity: 6 },
    { tableNumber: 'T10', capacity: 6 },
    { tableNumber: 'T11', capacity: 8 },
    { tableNumber: 'T12', capacity: 10 },
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

  await seedPosAddons(prisma);

  console.log(
    `POS register demo ready: customers including ${walkInCustomer.code}, and no seeded warehouses/groups/categories/inventory demo products.`,
  );
  console.log('Cashier login: cashier / cashier123.');
}
