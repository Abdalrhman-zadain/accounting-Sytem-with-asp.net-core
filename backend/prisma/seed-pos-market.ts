import {
  PosAccessRoleCode,
  PosPermissionCode,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

export async function seedPosMarketDemo(
  prisma: PrismaClient,
  _options: { adminUserId: string },
) {
  console.log('Seeding market POS destination markets and reps...');

  const [tradeReceivableAccount, taxableTreatment] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '1121001' } }),
    prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } }),
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

  const marketDestinationCustomers: Array<{
    code: string;
    name: string;
    contactInfo: string;
    salesRepId: string;
  }> = [];

  for (const marketCustomer of marketDestinationCustomers) {
    await prisma.customer.upsert({
      where: { code: marketCustomer.code },
      update: {
        name: marketCustomer.name,
        contactInfo: marketCustomer.contactInfo,
        salesRepId: marketCustomer.salesRepId,
        salesRepresentative:
          marketCustomer.salesRepId === marketRepNorth.id
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
        salesRepresentative:
          marketCustomer.salesRepId === marketRepNorth.id
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

  console.log(
    `Market POS: seeded ${marketDestinationCustomers.length} destination markets and market rep access without inventory demo products.`,
  );
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
